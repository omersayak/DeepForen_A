
import struct
import time
import socket
import io
import random

def mac_to_bytes(mac_str):
    if not mac_str or mac_str == "?": return b'\x00'*6
    try:
        return bytes.fromhex(mac_str.replace(':', ''))
    except:
        return b'\x00'*6

def ip_to_bytes(ip_str):
    try:
        return socket.inet_aton(ip_str)
    except:
        return b'\x00\x00\x00\x00'

class MinimalPcapWriter:
    """
    Writes a basic Libpcap file using standard python libraries.
    Synthesizes raw packet data from high-level metadata.
    """
    
    LINKTYPE_ETHERNET = 1

    def __init__(self):
        self.buffer = io.BytesIO()
        self._write_global_header()

    def _write_global_header(self):
        # Magic(4), Major(2), Minor(2), Zone(4), Sig(4), Snap(4), Net(4)
        # 0xa1b2c3d4 = microsecond resolution
        gh = struct.pack('<LHHLLLL', 0xa1b2c3d4, 2, 4, 0, 0, 65535, self.LINKTYPE_ETHERNET)
        self.buffer.write(gh)

    def add_packet(self, pkt_json):
        """
        Synthesizes a raw packet from JSON metadata and writes to buffer.
        """
        # 1. Synthesize Payload (Ethernet + IP + Transport)
        raw_data = self._synthesize_frame(pkt_json)
        
        # 2. Write Packet Header
        # TsSec(4), TsUsec(4), InclLen(4), OrigLen(4)
        try:
            # Parse timestamp "HH:MM:SS.mmm" - assuming today
            ts_str = pkt_json.get('timestamp', '00:00:00.000')
            now = time.localtime()
            dt = time.strptime(ts_str.split('.')[0], "%H:%M:%S")
            # Combine 'now' date with packet time
            ts_sec = int(time.mktime((now.tm_year, now.tm_mon, now.tm_mday, 
                                      dt.tm_hour, dt.tm_min, dt.tm_sec, 
                                      now.tm_wday, now.tm_yday, now.tm_isdst)))
            ts_usec = int(ts_str.split('.')[1]) * 1000 if '.' in ts_str else 0
        except:
            ts_sec = int(time.time())
            ts_usec = 0
            
        length = len(raw_data)
        ph = struct.pack('<LLLL', ts_sec, ts_usec, length, length)
        
        self.buffer.write(ph)
        self.buffer.write(raw_data)

    def _synthesize_frame(self, pkt):
        # Construct Dummy Ethernet Header
        # Dest MAC (Broadcast or rand), Src MAC (rand), Type (IPv4 = 0x0800)
        eth = b'\xff\xff\xff\xff\xff\xff' + b'\x00\x11\x22\x33\x44\x55' + b'\x08\x00'
        
        # IP Header
        # Ver(4), IHL(5), TOS(0), TotalLen(2), ID(2), Flags/Frag(2), TTL(1), Proto(1), Cks(2), Src(4), Dst(4)
        src_ip = ip_to_bytes(pkt.get('src', '0.0.0.0'))
        dst_ip = ip_to_bytes(pkt.get('dst', '0.0.0.0'))
        
        proto_str = pkt.get('protocol', 'TCP')
        proto_num = 6 # TCP
        if 'UDP' in proto_str or 'DNS' in proto_str: proto_num = 17
        elif 'ICMP' in proto_str: proto_num = 1
        
        # We need payload size to calculate total Ip len
        # Let's say payload is 64 bytes
        payload = b'A' * min(int(pkt.get('length', 60)), 1400)
        
        ip_len = 20 + len(payload) # header + payload
        
        ip_header = struct.pack('!BBHHHBBH4s4s', 
                                0x45, 0, ip_len, 54321, 0, 64, proto_num, 0, src_ip, dst_ip)
        
        return eth + ip_header + payload

    def get_output(self):
        self.buffer.seek(0)
        return self.buffer.getvalue()

class MinimalPcapReader:
    """
    Reads a basic Libpcap file and extracts basic metadata for the simulation UI.
    Limitation: Only supports Ethernet/IPv4/TCP/UDP parsing for now.
    """
    def __init__(self, pcap_bytes):
        self.buffer = io.BytesIO(pcap_bytes)
        
    def read_all(self):
        packets = []
        try:
            # Global Header: 24 bytes
            gh = self.buffer.read(24)
            if len(gh) < 24: return []
            
            # Check magic
            magic = struct.unpack('<L', gh[:4])[0]
            # determine endianness if needed, assuming little-endian for now (common)
            
            pkt_id = 1
            while True:
                # Packet Header: 16 bytes
                ph_bytes = self.buffer.read(16)
                if len(ph_bytes) < 16: break
                
                # ts_sec, ts_usec, incl_len, orig_len
                ts_sec, ts_usec, incl_len, orig_len = struct.unpack('<LLLL', ph_bytes)
                
                # Packet Data
                data = self.buffer.read(incl_len)
                
                # Simple Parser
                meta = self._parse_frame(data, pkt_id, ts_sec, ts_usec)
                if meta:
                    packets.append(meta)
                    pkt_id += 1
                    
        except Exception as e:
            print(f"PCAP Parse Error: {e}")
            
        return packets

    def _parse_frame(self, data, pid, sec, usec):
        # Ethernet = 14 bytes
        if len(data) < 34: return None # Min eth+ip header
        
        # Eth
        dst_mac = data[0:6].hex(':')
        src_mac = data[6:12].hex(':')
        eth_type = struct.unpack('!H', data[12:14])[0]
        
        if eth_type != 0x0800: # Not IPv4
            return None
            
        # IP
        ip_header = data[14:34] # 20 bytes min
        # ... extracting src/dst ...
        src_ip = socket.inet_ntoa(ip_header[12:16])
        dst_ip = socket.inet_ntoa(ip_header[16:20])
        proto_num = ip_header[9]
        
        protocol = "IP"
        if proto_num == 6: protocol = "TCP"
        elif proto_num == 17: protocol = "UDP"
        elif proto_num == 1: protocol = "ICMP"
        
        # Info synthesis
        info = f"Imported Packet (Len={len(data)})"
        
        timestamp = datetime.fromtimestamp(sec).strftime("%H:%M:%S") + f".{int(usec/1000)}"
        
        return {
            "id": pid,
            "timestamp": timestamp,
            "src": src_ip,
            "dst": dst_ip,
            "protocol": protocol,
            "length": len(data),
            "info": info
        }

from datetime import datetime

