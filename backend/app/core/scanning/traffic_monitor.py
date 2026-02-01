import psutil
import time
import socket
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class TrafficMonitor:
    def __init__(self):
        self.last_io = psutil.net_io_counters()
        self.last_time = time.time()

    def get_current_stats(self) -> Dict[str, float]:
        """
        Returns traffic rate in KB/s.
        """
        current_io = psutil.net_io_counters()
        current_time = time.time()
        
        elapsed = current_time - self.last_time
        if elapsed <= 0:
            elapsed = 1 # Prevent div by zero
            
        sent_bytes = current_io.bytes_sent - self.last_io.bytes_sent
        recv_bytes = current_io.bytes_recv - self.last_io.bytes_recv
        
        # Update state
        self.last_io = current_io
        self.last_time = current_time
        
        return {
            "upload_speed_kbps": round((sent_bytes / 1024) / elapsed, 2),
            "download_speed_kbps": round((recv_bytes / 1024) / elapsed, 2),
            "total_sent_mb": round(current_io.bytes_sent / (1024 * 1024), 2),
            "total_recv_mb": round(current_io.bytes_recv / (1024 * 1024), 2)
        }

    def get_active_connections(self) -> Dict[str, Any]:
        """
        Returns a list of active socket connections and a protocol breakdown.
        """
        connections = []
        protocols = {"TCP": 0, "UDP": 0, "HTTP/S": 0, "DNS": 0, "SSH": 0, "Other": 0}
        
        try:
            # Get connections (inet only)
            conns = psutil.net_connections(kind='inet')
            
            for c in conns:
                # Basic Protocol Stats
                proto_name = "TCP" if c.type == socket.SOCK_STREAM else "UDP"
                protocols[proto_name] += 1
                
                # Application Layer Guessing
                r_port = c.raddr.port if c.raddr else 0
                if r_port in [80, 443, 8080, 8443]: protocols["HTTP/S"] += 1
                elif r_port == 53: protocols["DNS"] += 1
                elif r_port == 22: protocols["SSH"] += 1
                else: protocols["Other"] += 1

                # Process Info
                proc_name = "Unknown"
                if c.pid:
                    try:
                        proc = psutil.Process(c.pid)
                        proc_name = proc.name()
                    except: pass
                
                # Add to list (limit to established/listen/syn_sent to reduce noise)
                if c.status in ["ESTABLISHED", "LISTEN", "SYN_SENT", "UDP"]: 
                     connections.append({
                         "fd": c.fd,
                         "family": "IPv4" if c.family == socket.AF_INET else "IPv6",
                         "type": proto_name,
                         "local": f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else "-",
                         "remote": f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "-",
                         "status": c.status,
                         "pid": c.pid,
                         "process": proc_name
                     })
            
            # Sort by status (ESTABLISHED first)
            connections.sort(key=lambda x: x['status'] == 'ESTABLISHED', reverse=True)
            
            return {
                "total": len(conns),
                "breakdown": protocols,
                "connections": connections[:50] # Limit to top 50 to avoid payload explosion
            }
            
        except Exception as e:
            logger.error(f"Connection fetch failed: {e}")
            return {"total": 0, "breakdown": {}, "connections": []}

monitor = TrafficMonitor()

async def get_traffic_metrics():
    """
    Async wrapper to get metrics.
    """
    return monitor.get_current_stats()

async def get_connection_analysis():
    return monitor.get_active_connections()
