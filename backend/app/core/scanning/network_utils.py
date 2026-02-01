import socket
import psutil
import logging

logger = logging.getLogger(__name__)

def get_local_ip() -> str:
    """
    Determines the primary local IP address of the machine.
    """
    try:
        # Trick: connect to a public DNS to let the OS pick the interface
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        logger.warning(f"Could not determine local IP via socket trick: {e}")
        # Fallback
        try:
            hostname = socket.gethostname()
            return socket.gethostbyname(hostname)
        except:
            return "127.0.0.1"

def get_active_interface_info():
    """
    Returns the name and info of the active network interface.
    """
    # This is a basic heuristic
    stats = psutil.net_if_stats()
    addrs = psutil.net_if_addrs()
    
    # Priority: Up, not Loopback, has IPv4
    for nic, stat in stats.items():
        if stat.isup and nic != "lo":
            if nic in addrs:
                for addr in addrs[nic]:
                    if addr.family == socket.AF_INET:
                        return {
                            "interface": nic,
                            "ip": addr.address,
                            "netmask": addr.netmask,
                            "speed": stat.speed
                        }
    return None
