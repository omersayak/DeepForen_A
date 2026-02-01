
import os
import aiohttp
import asyncio
from app.core.config import settings

# Helper for VT API
VT_API_URL = "https://www.virustotal.com/api/v3"

class ThreatIntel:
    def __init__(self):
        # We look for VT_API_KEY in env
        self.api_key = os.getenv("VT_API_KEY") or "TEST_KEY_PLACEHOLDER"
        
    async def check_ip(self, ip_address: str):
        """
        Checks an IP against VirusTotal API.
        """
        if self.api_key == "TEST_KEY_PLACEHOLDER":
            # Heuristic Simulation Mode (When no API Key)
            await asyncio.sleep(0.3)
            
            # Use hash of IP for consistency, but logic based on Subnet
            # Matches sniffer.py: 185.66, 45.155, 103.251 are "Bad"
            is_bad_subnet = any(ip_address.startswith(prefix) for prefix in ["185.66", "45.155", "103.251"])
            
            if is_bad_subnet:
                # 90% chance to be Malicious if in bad subnet (some might be just suspicious)
                return {
                    "malicious": random.randint(15, 60),
                    "suspicious": random.randint(5, 20),
                    "harmless": random.randint(0, 10),
                    "verdict": "Malicious",
                    "link": f"https://www.virustotal.com/gui/ip-address/{ip_address}",
                    "mode": "Heuristic (Simulated)"
                }
            else:
                 # Clean (Google, AWS, etc)
                 return {
                    "malicious": 0,
                    "suspicious": 0,
                    "harmless": 90,
                    "verdict": "Clean",
                     "link": f"https://www.virustotal.com/gui/ip-address/{ip_address}",
                     "mode": "Heuristic (Simulated)"
                }

        headers = {
            "x-apikey": self.api_key
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(f"{VT_API_URL}/ip_addresses/{ip_address}", headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        stats = data['data']['attributes']['last_analysis_stats']
                        return {
                            "malicious": stats.get('malicious', 0),
                            "suspicious": stats.get('suspicious', 0),
                            "harmless": stats.get('harmless', 0),
                            "verdict": "Malicious" if stats.get('malicious', 0) > 0 else "Clean",
                            "link": f"https://www.virustotal.com/gui/ip-address/{ip_address}"
                        }
                    else:
                        return {"error": f"VT API Error: {resp.status}"}
            except Exception as e:
                return {"error": str(e)}

threat_intel = ThreatIntel()
