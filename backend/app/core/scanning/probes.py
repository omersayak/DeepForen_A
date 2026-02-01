import asyncio
import socket
import scapy.all as scapy
import httpx
import logging

logger = logging.getLogger(__name__)

# --- 1. NetBIOS Name Service (Windows/Samba) ---
async def get_netbios_name(ip: str):
    try:
        loop = asyncio.get_running_loop()
        
        def _nbns_probe():
            try:
                pkt = scapy.IP(dst=ip)/scapy.UDP(sport=137, dport=137)/scapy.NBNSQueryRequest(SUFFIX="file server", QUESTION_NAME="*"+"\x00"*14)
                response = scapy.sr1(pkt, verbose=0, timeout=0.5)
                if response and response.haslayer(scapy.NBNSQueryResponse):
                    nbns = response.getlayer(scapy.NBNSQueryResponse)
                    if nbns.NAME_TRN_ID: 
                         if len(nbns.RR_NAME) > 0:
                             return nbns.RR_NAME.decode('utf-8', errors='ignore').strip()
            except:
                return None
            return None

        return await loop.run_in_executor(None, _nbns_probe)
    except:
        return None

# --- 2. mDNS (Multicast DNS - Apple/Printers/IoT) ---
async def get_mdns_name(ip: str):
    loop = asyncio.get_running_loop()
    
    def _mdns_probe():
        try:
             # Basic implementation placeholder as per original code
             # In a real scenario, we would send a multicast UDP packet to 224.0.0.251:5353
             pass 
             return None
        except:
            return None
        return None

    return await loop.run_in_executor(None, _mdns_probe)

# --- 3. Enhanced HTTP Fingerprinting ---
async def get_real_http_identity(ip: str, open_ports: list):
    web_ports = []
    ports_str = str(open_ports)
    
    if "80/HTTP" in ports_str: web_ports.append(80)
    if "443/HTTPS" in ports_str: web_ports.append(443)
    if "8080/HTTP-Alt" in ports_str: web_ports.append(8080)
    
    headers_user_agent = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}

    async with httpx.AsyncClient(verify=False, timeout=2.0) as client:
        for port in web_ports:
            try:
                protocol = "https" if port == 443 or port == 8443 else "http"
                url = f"{protocol}://{ip}:{port}"
                response = await client.get(url, headers=headers_user_agent, follow_redirects=True)
                
                html = response.text.lower()
                headers = response.headers
                
                # A. Check Server Header (Very Reliable)
                server_header = headers.get("Server", "").lower()
                if "hikvision" in server_header: return "Hikvision Camera", "camera", "Hikvision"
                if "dahua" in server_header: return "Dahua Camera", "camera", "Dahua"
                if "nginx" in server_header and "openwrt" in html: return "OpenWrt Router", "router", "OpenWrt"
                
                # B. Check HTML Title
                title = ""
                if "<title>" in response.text:
                    start = response.text.find("<title>") + 7
                    end = response.text.find("</title>")
                    title = response.text[start:end].strip()
                
                # C. Deep Content Inspection (Keywords)
                bad_titles = ["404", "403", "500", "index", "home", "login", "welcome", "web server", "webserver"]
                if any(x in title.lower() for x in bad_titles) and len(title) < 15:
                    pass # Ignore generic titles
                elif "web manager" in html or "router" in title.lower():
                    return f"{title} (Router)", "router", "Unknown"
                elif "printer" in html or "hp" in title.lower() or "epson" in title.lower():
                    return f"{title} (Printer)", "printer", "Unknown"
                
                # If we have a decent title, use it
                if len(title) > 2 and not any(x in title.lower() for x in bad_titles):
                    return title, "device", "Unknown"

            except:
                continue
    return None, None, None
