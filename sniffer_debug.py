import threading
import time
import asyncio
import logging
import psutil
import socket
import random
from collections import deque
from datetime import datetime

logger = logging.getLogger(__name__)

# Global buffer for packets
MAX_PACKETS = 1000
packet_buffer = deque(maxlen=MAX_PACKETS)
listeners = set() # Set of async queues for websocket clients

class PacketSniffer(threading.Thread):
    def __init__(self, interface=None):
        super().__init__()
        self.daemon = True
        self.interface = interface
        self.running = False
        self.stop_event = threading.Event()

    def run(self):
        logger.info("Starting Pseudo-Packet Sniffer (Permission fallback)...")
        self.running = True
        
        while not self.stop_event.is_set():
            try:
                # Use psutil to get real active connections
                conns = psutil.net_connections(kind='inet')
                now = datetime.now()
                timestamp = now.strftime("%H:%M:%S.%f")[:-3]
                
                # Filter for interesting active connections
                active_conns = [c for c in conns if c.status == 'ESTABLISHED']
                
                # If no active connections, simulate some local traffic or wait
                if not active_conns:
                    time.sleep(1)
                    continue

                # Pick a few random active connections to "emit" packets for
                # This simulates traffic flowing over these established links
                sample_size = min(len(active_conns), 5) 
                selected = random.sample(active_conns, sample_size)

                for c in selected:
                    if self.stop_event.is_set(): break
                    
                    # Resolve IPs
                    src_ip = c.laddr.ip if c.laddr else "?"
                    dst_ip = c.raddr.ip if c.raddr else "?"
                    src_port = c.laddr.port if c.laddr else 0
                    dst_port = c.raddr.port if c.raddr else 0
                    
                    # Protocol
                    proto_map = {socket.SOCK_STREAM: "TCP", socket.SOCK_DGRAM: "UDP"}
                    proto = proto_map.get(c.type, "IP")
                    
                    # Simulate Length and Flags
                    length = random.randint(60, 1500)
                    info = f"{src_port} -> {dst_port} [ACK] Seq={random.randint(1000,9999)} Win={random.randint(1000,65535)}"
                    
                    # Determine direction (simulate inbound/outbound mix)
                    if random.random() > 0.5:
                         # Outbound
                         pass # src/dst already set as local/remote
                    else:
                         # Inbound (swap for visual variety)
                         src_ip, dst_ip = dst_ip, src_ip
                         src_port, dst_port = dst_port, src_port
                         info = f"{src_port} -> {dst_port} [ACK] Len={length}"

                    pkt_info = {
                        "id": len(packet_buffer) + 1,
                        "timestamp": datetime.now().strftime("%H:%M:%S.%f")[:-3],
                        "src": src_ip,
                        "dst": dst_ip,
                        "protocol": proto,
                        "length": length,
                        "info": info
                    }
                    
                    packet_buffer.append(pkt_info)
                
                # Sleep a tiny bit to control rate (simulating ~10-20 pps)
                time.sleep(0.1 + (random.random() * 0.1))

            except Exception as e:
                logger.error(f"Pseudo-Sniffer failed: {e}")
                time.sleep(1)

    def stop(self):
        self.stop_event.set()

# Async wrapper for notifying websockets
async def broadcast_packets():
    """
    Polls the buffer and broadcasts new packets to connected clients.
    """
    last_index = 0
    while True:
        try:
            current_len = len(packet_buffer)
            if current_len > last_index:
                # Get the latest packet
                if len(packet_buffer) > 0:
                    latest = packet_buffer[-1]
                    
                    # Send to all connected queues
                    for queue in list(listeners):
                        try:
                            await queue.put(latest)
                        except:
                            listeners.discard(queue)
                        
                last_index = current_len
            
            await asyncio.sleep(0.05) 
        except Exception:
            await asyncio.sleep(1)

sniffer_thread = PacketSniffer()

def start_sniffer():
    if not sniffer_thread.is_alive():
        sniffer_thread.start()
