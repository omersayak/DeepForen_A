import asyncio
import logging
import socket
import scapy.all as scapy
import nmap
from mac_vendor_lookup import MacLookup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from app.models.models import Device

# Import new modules
from app.core.scanning.probes import get_netbios_name, get_mdns_name, get_real_http_identity

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Dynamic Vendor Lookup
try:
    mac_lookup = MacLookup()
    try:
        # Try to use existing list, if fails, it might need update
        # We can proactively try to update since the user reported issues
        # But we don't want to block too long.
        pass
    except:
        pass
except:
    logger.warning("Could not initialize MacLookup. Vendor info might be missing.")
    mac_lookup = None

# Helper to ensure we have data
async def ensure_vendor_data():
    global mac_lookup
    if mac_lookup:
        try:
            # Check if we can lookup a dummy mac, if not, update
            try:
                mac_lookup.lookup("00:00:00:00:00:00")
            except KeyError:
                pass # Expected
            except Exception:
                logger.info("⬇️ Updating Mac Vendor Database...")
                mac_lookup.update_vendors()
        except Exception as e:
            logger.warning(f"Failed to update mac vendor DB: {e}")

# Run this once on import/startup (best effort)
try:
    if mac_lookup:
        # We use a synchronous update here for simplicity as this is module level
        # In a perfect world we'd use an async startup event
        mac_lookup.update_vendors() 
        logger.info("✅ Mac Vendor Database Updated.")
except Exception as e:
    logger.warning(f"Could not update Mac Vendor Database: {e}")

async def inspect_device_dynamic(ip: str, mac: str, nmap_data: dict = None):
    info = {
        "hostname": "Unknown",
        "vendor": "Unknown",
        "role": "device",
        "os_type": "Unknown",
        "open_ports": []
    }

    # 1. Vendor Lookup (Online Only)
    if mac_lookup:
        try:
            info["vendor"] = mac_lookup.lookup(mac)
        except:
            pass # No static fallback requested

    # 2. Use Nmap Data if available (The most reliable source)
    if nmap_data:
        if nmap_data.get('hostnames'):
            # Nmap returns a list like [{'name': 'host.local', 'type': 'PTR'}]
            names = [h['name'] for h in nmap_data['hostnames'] if h['name']]
            if names:
                info["hostname"] = names[0]
        
        if nmap_data.get('osmatch'):
            # Nmap OS detection
            # osmatch is a list of dicts, take the first/best one
            best_match = nmap_data['osmatch'][0]
            if int(best_match['accuracy']) > 80:
                info["os_type"] = best_match['name']
                # Infer role from OS
                os_lower = best_match['name'].lower()
                if "windows" in os_lower: info["role"] = "workstation"
                if "server" in os_lower: info["role"] = "server"
                if "linux" in os_lower: info["role"] = "server" # Generic
                if "ios" in os_lower or "android" in os_lower: info["role"] = "mobile"
                if "printer" in os_lower: info["role"] = "printer"
        
        # Ports from Nmap
        if 'tcp' in nmap_data:
            for port, details in nmap_data['tcp'].items():
                if details['state'] == 'open':
                    service = details.get('name', 'unknown')
                    info["open_ports"].append(f"{port}/{service.upper()}")

    # 3. Fallback / Enhancement with Custom Probes
    # If Nmap didn't find the hostname (common in local LANs), try NetBIOS/mDNS
    if info["hostname"] == "Unknown":
        # A. NetBIOS (Windows)
        if "137/NETBIOS-SSN" in str(info["open_ports"]) or "445/MICROSOFT-DS" in str(info["open_ports"]):
             nb_name = await get_netbios_name(ip)
             if nb_name:
                 info["hostname"] = nb_name
                 info["os_type"] = "Windows"
                 info["role"] = "workstation"

        # B. mDNS (Apple/IoT)
        mdns_name = await get_mdns_name(ip)
        if mdns_name:
            info["hostname"] = mdns_name
            if "iphone" in mdns_name.lower(): info["role"] = "mobile"

    # C. HTTP Fingerprinting (Cameras/Routers) - always run this as it's specific
    # Check if we have web ports
    web_ports = [int(p.split('/')[0]) for p in info["open_ports"] if 'HTTP' in p or p.startswith('80') or p.startswith('443')]
    if web_ports:
        http_name, http_role, http_vendor = await get_real_http_identity(ip, info["open_ports"])
        if http_name and (info["hostname"] == "Unknown" or "device" in info["hostname"].lower()):
             info["hostname"] = http_name
        if http_role: info["role"] = http_role
        if http_vendor and info["vendor"] == "Unknown": info["vendor"] = http_vendor

    # 4. Port-Based Role Inference (Final Pass)
    ports_str = str(info["open_ports"]).lower()
    if info["role"] == "device": 
        if "554/rtsp" in ports_str:
            info["role"] = "camera"
        elif "631/ipp" in ports_str or "9100" in ports_str:
            info["role"] = "printer"
        elif "3389/ms-wbt-server" in ports_str:  # RDP
            info["role"] = "workstation"
            info["os_type"] = "Windows"
        elif "22/ssh" in ports_str and "router" in info["vendor"].lower():
             info["role"] = "router"
        elif "53/domain" in ports_str and "router" in info["vendor"].lower():
             info["role"] = "router"

    # 5. Reverse DNS (Last Resort)
    if info["hostname"] == "Unknown":
        try:
            loop = asyncio.get_running_loop()
            host_info = await loop.run_in_executor(None, lambda: socket.gethostbyaddr(ip))
            info["hostname"] = host_info[0]
        except:
            pass

    return info

async def scan_range_nmap(target_ip: str, db: AsyncSession):
    """
    Uses Nmap for a robust, detailed scan.
    """
    logger.info(f"🚀 Starting Deep Nmap Scan on {target_ip}")
    nm = nmap.PortScanner()
    
    # Run Nmap in a thread executor to avoid blocking asyncio
    loop = asyncio.get_running_loop()
    
    try:
        # Agressive Scan Arguments:
        # -sn: Ping Scan (disable port scan) - NO, we want ports
        # -F: Fast mode (fewer ports)
        # -O: OS detection
        # --osscan-limit: Limit OS detection to promising targets
        # -T4: Aggressive timing
        # --top-ports 100: Scan top 100 ports (Speed/Detail balance)
        def run_nmap():
            # First, quick ping scan to find live hosts
            nm.scan(hosts=target_ip, arguments='-sn -PR -PS -PA -PU -T4')
            live_hosts = nm.all_hosts()
            if not live_hosts:
                return {}
            
            # Now deep scan live hosts
            hosts_str = " ".join(live_hosts)
            logger.info(f"Found {len(live_hosts)} live hosts. Deep scanning...")
            nm.scan(hosts=hosts_str, arguments='-sS -O --top-ports 100 -T4 --version-intensity 2')
            return nm.all_hosts()

        await loop.run_in_executor(None, run_nmap)
        
        # Clear old data (Optional / Configurable)
        try:
           await db.execute(text("DELETE FROM devices"))
           await db.commit()
        except: pass

        discovered = []
        for host in nm.all_hosts():
            # Nmap data
            data = nm[host]
            
            # Basic info
            ip = host
            mac = data.get('addresses', {}).get('mac', '00:00:00:00:00:00')
            if mac == '00:00:00:00:00:00':
                # Try to get MAC from ARP cache if Nmap didn't report it (e.g. localhost or non-root)
                pass # TODO: ARP lookup fallback

            # Deep Inspect combining Nmap data + Custom Probes
            details = await inspect_device_dynamic(ip, mac, nmap_data=data)

            device_data = {
                "ip_address": ip,
                "mac_address": mac,
                "hostname": details['hostname'],
                "role": details['role'],
                "os_type": details['os_type'],
                "risk_score": 0.0,
                "meta": {
                    "vendor": details['vendor'],
                    "ports": details['open_ports'],
                    "nmap_raw": "available" # Marker
                }
            }
            
            await upsert_device(db, device_data)
            discovered.append(device_data)

        return discovered

    except Exception as e:
        logger.error(f"Nmap scan failed: {e}")
        # Fallback to pure python scan if Nmap breaks
        return await scan_range_legacy(target_ip, db)

# Rename old function to legacy logic or keep as fallback
async def scan_range_legacy(target_ip: str, db: AsyncSession):
    # ... (Keep previous logic if needed, but for now we trust nmap)
    # Re-implementing simplified fallback
    logger.warning("⚠️ Falling back to legacy ARP scan")
    # ... (Existing ARP Logic)
    return await scan_non_root(target_ip, db)
    
async def scan_non_root(target_ip: str, db: AsyncSession):
    # ... (Keep existing implementation)
    import subprocess
    base_ip = ".".join(target_ip.split(".")[:3])
    logger.info(f"📡 Starting Non-Root Ping Sweep on {base_ip}.0/24...")
    
    async def ping_host(ip):
        try:
            proc = await asyncio.create_subprocess_exec(
                "ping", "-c", "1", "-W", "1", "-n", ip,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await proc.wait()
        except:
            pass
    
    all_ips = [f"{base_ip}.{i}" for i in range(1, 255)]
    chunk_size = 50
    for i in range(0, len(all_ips), chunk_size):
        chunk = all_ips[i:i + chunk_size]
        await asyncio.gather(*[ping_host(ip) for ip in chunk])

    discovered_devices = []
    try:
        with open("/proc/net/arp", "r") as f:
            lines = f.readlines()[1:] 
        for line in lines:
            parts = line.split()
            if len(parts) >= 4:
                ip = parts[0]
                mac = parts[3]
                if base_ip in ip and mac != "00:00:00:00:00:00":
                    details = await inspect_device_dynamic(ip, mac)
                    device_data = {
                        "ip_address": ip,
                        "mac_address": mac,
                        "hostname": details['hostname'],
                        "role": details['role'],
                        "os_type": details['os_type'],
                        "risk_score": 0.0,
                        "meta": { "vendor": details['vendor'], "ports": details['open_ports'] }
                    }
                    await upsert_device(db, device_data)
                    discovered_devices.append(device_data)
    except Exception as e:
        logger.error(f"Fallback scan failed: {e}")
        return []
    return discovered_devices

async def scan_range(target_ip: str, db: AsyncSession):
    """ Main Entry Point """
    # Prefer Nmap
    return await scan_range_nmap(target_ip, db)

async def upsert_device(db: AsyncSession, device_data: dict):
    stmt = select(Device).where(Device.mac_address == device_data['mac_address'])
    existing = (await db.execute(stmt)).scalar_one_or_none()
    
    if existing:
        existing.ip_address = device_data['ip_address']
        existing.hostname = device_data['hostname']
        existing.role = device_data['role']
        existing.os_type = device_data['os_type']
        existing.meta = device_data['meta']
        existing.last_seen = scapy.datetime.now()
    else:
        db.add(Device(**device_data))
    await db.commit()
