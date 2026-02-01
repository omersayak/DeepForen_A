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
        logger.info("Starting Advanced Packet Simulation (Wireshark Mode)...")
        self.running = True
        
        # --- INITIALIZATION (Run once) ---
        # Dynamic Local IP Detection
        from app.core.scanning.network_utils import get_local_ip
        local_ip = get_local_ip()
        logger.info(f"Sniffer binding to dynamic context: {local_ip}")

        def generate_random_ip(is_local=False, is_attack=False):
            if is_local:
                # Dynamic subnet calculation
                base = ".".join(local_ip.split(".")[:3])
                return f"{base}.{random.randint(1, 254)}"
            elif is_attack:
                # Use "Bulletproof Hosting" looking ranges for attacks
                # 185.66.x.x, 45.155.x.x (Simulated Bad Subnets)
                prefix = random.choice(["185.66", "45.155", "103.251"])
                return f"{prefix}.{random.randint(1,255)}.{random.randint(1,254)}"
            else:
                 # Generate random public IP (Benign targets like Google, AWS etc)
                 o1 = random.choice([8, 172, 104, 142, 52, 20])
                 return f"{o1}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,254)}"

        def generate_dynamic_payload(attack_type):
             if attack_type == 'SQLi':
                 targets = ['users', 'admin', 'passwords', 'config']
                 ops = ['UNION SELECT', 'OR 1=1', 'DROP TABLE', 'waitfor delay']
                 return f"GET /search?q={'%20'.join(random.sample(ops, 1))}%20FROM%20{random.choice(targets)} HTTP/1.1"
             elif attack_type == 'XSS':
                 tags = ['<script>', '<img src=x>', '<body onload=alert(1)>']
                 return f"POST /comment HTTP/1.1\r\nContent: {random.choice(tags)}"
             elif attack_type == 'C2':
                 return f"[Encrypted Command] {bytes([random.randint(0,255) for _ in range(16)]).hex()}"
             return "Application Data"

        # --- MAIN LOOP ---
        while not self.stop_event.is_set():
            try:
                batch_size = random.randint(1, 4)

                for _ in range(batch_size):
                    if self.stop_event.is_set(): break
                    
                    roll = random.random()
                    
                    # Defaults
                    packet_type = "Normal"
                    proto = "TCP"
                    src_ip = local_ip
                    dst_ip = "1.1.1.1"
                    info = "Unknown"
                    length = 64
                    
                    if roll < 0.10: # Attack
                        packet_type = "Attack"
                        src_ip = generate_random_ip(is_local=False, is_attack=True)
                        dst_ip = local_ip
                        proto = random.choice(['TCP', 'HTTP'])
                        attack_kind = random.choice(['SQLi', 'XSS', 'C2'])
                        info = generate_dynamic_payload(attack_kind)
                        length = random.randint(200, 1200)
                    
                    elif roll < 0.50: # Noise
                         packet_type = "Noise"
                         proto = random.choice(['DNS', 'UDP', 'NTP', 'SSDP'])
                         src_ip = generate_random_ip(is_local=True)
                         dst_ip = generate_random_ip(is_local=False)
                         
                         if proto == 'DNS':
                             info = f"Standard query A {random.choice(['google.com', 'aws.com'])}"
                             length = random.randint(60, 120)
                         else:
                             info = "Protocol Interaction"
                             length = random.randint(40, 200)

                    else: # Normal
                        packet_type = "Normal"
                        proto = random.choice(['TLSv1.3', 'HTTP', 'TCP'])
                        src_ip = local_ip
                        dst_ip = generate_random_ip(is_local=False)
                        info = "Application Data" if proto.startswith("TLS") else f"ACK Seq={random.randint(100,9999)}"
                        length = random.randint(60, 1500)
                        
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
                
                time.sleep(random.random() * 0.3)

            except Exception as e:
                logger.error(f"Pseudo-Sniffer failed: {e}")
                time.sleep(1)

    def stop(self):
        self.stop_event.set()

# Async wrapper for notifying websockets
async def broadcast_packets():
    """
    Polls the buffer and broadcasts new packets to connected clients.
    Using a simpler timestamp or ID tracking to ensure flow continuity.
    """
    last_id = 0
    while True:
        try:
            if not packet_buffer:
                await asyncio.sleep(0.1)
                continue

            # Get fresh packets since last_id
            # Optimization: since buffer is a deque, we just grab new ones
            # In high volume, just grab the last few to keep UI responsive
            current_last = packet_buffer[-1]
            if current_last['id'] > last_id:
                # Find all packets with id > last_id
                # (Simple linear scan is fine for small buffers, or just take the new ones)
                
                # To avoid complex iteration on a changing deque, we just take the last 10 
                # if the gap is huge, or just the next one
                
                # Simple logic: Just broadcast the NEWEST packet to keep it real-time.
                # If we want to ensure no drop, we need a smarter queue, but for UI visualizer
                # skipping a frame is better than lag.
                
                packet_to_send = current_last
                last_id = packet_to_send['id']

                # Send to all connected queues
                for queue in list(listeners):
                    try:
                        # Don't block if queue is full
                        if queue.qsize() < 100:
                            await queue.put(packet_to_send)
                    except:
                        listeners.discard(queue)
            
            await asyncio.sleep(0.05) # 20fps cap for UI smoothness
        except Exception:
            await asyncio.sleep(1)

sniffer_thread = PacketSniffer()

def start_sniffer():
    if not sniffer_thread.is_alive():
        sniffer_thread.start()
