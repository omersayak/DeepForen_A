from fastapi import FastAPI, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db, engine, Base
from app.models.models import Device, LogEntry
# from app.core.scanner import scan_arp # Removed to fix import error
from app.core.ai_engine import AISentinel
from app.models.schemas import AnalysisRequest

# Not: Gerçek (PROD) versiyonda tabloları Alembic ile yönetmeliyiz.
# Şimdilik başlangıçta tabloları oluşturuyoruz.
    
async def init_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def startup_tasks():
    await init_tables()
    # Try to update vendor DB in background
    from app.core.scanning.engine import ensure_vendor_data
    try:
        await ensure_vendor_data()
    except: 
        pass
    
    # Start Packet Sniffer
    try:
        from app.core.scanning.sniffer import start_sniffer, broadcast_packets
        start_sniffer()
        # Start broadcaster loop as background task
        import asyncio
        asyncio.create_task(broadcast_packets())
    except Exception as e:
        print(f"Failed to start sniffer: {e}")

app = FastAPI(
    title="NetGraph Sentinel API (PROD)",
    version="1.0.0",
    on_startup=[startup_tasks]
)

# CORS PROD: Production'da spesifik domain olmalı, şimdilik localhost'a izin veriyoruz.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "operational", "mode": "production"}

@app.post("/scan/active")
async def trigger_active_scan(background_tasks: BackgroundTasks, target: str | None = None):
    """
    Triggers a Deep Nmap Scan via Background Task.
    If target is not provided, scans the local /24 subnet.
    """
    from app.core.database import SessionLocal
    from app.core.scanner import scan_range
    from app.core.scanning.network_utils import get_local_ip

    if not target:
        local_ip = get_local_ip()
        # Assume /24 for simplicity if auto-detecting
        target = ".".join(local_ip.split(".")[:3]) + ".0/24"
    from app.core.database import SessionLocal
    from app.core.scanner import scan_range # Changed function name in scanner.py
    
    async def run_scan_task():
        async with SessionLocal() as session:
             await scan_range(target, session)

    background_tasks.add_task(run_scan_task)
    return {"message": f"Deep Scan initiated for {target}. This may take 1-2 minutes.", "status": "started"}

@app.get("/devices")
async def get_devices(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Device))
    devices = result.scalars().all()
    return devices

class AIQuery(AnalysisRequest):
    provider: str = "gemini" # Default

@app.post("/sentinel/ask")
async def ask_sentinel(request: AIQuery, db: AsyncSession = Depends(get_db)):
    """
    Dual AI Endpoint: Accepts 'gemini' or 'openai' provider.
    """
    sentinel = AISentinel(db)
    answer = await sentinel.answer_user_query(request.query, request.provider)
    return {"answer": answer}

# --- New Endpoints for Dashboard ---
from app.core.scanning.traffic_monitor import get_traffic_metrics
from app.core.scanning.network_utils import get_local_ip, get_active_interface_info

@app.get("/system/traffic")
async def get_traffic():
    """
    Returns real-time network traffic stats.
    """
    return await get_traffic_metrics()

from app.core.scanning.traffic_monitor import get_connection_analysis

@app.get("/system/connections")
async def get_connections():
    """
    Returns active network connections for advanced analysis.
    """
    return await get_connection_analysis()

@app.get("/system/info")
async def get_system_info():
    """
    Returns the host IP and active interface.
    """
    return {
        "ip": get_local_ip(),
        "interface": get_active_interface_info()
    }

@app.websocket("/ws/traffic")
async def websocket_traffic(websocket: WebSocket):
    await websocket.accept()
    from app.core.scanning.sniffer import listeners
    import asyncio
    queue = asyncio.Queue()
    listeners.add(queue)
    try:
        while True:
            data = await queue.get()
            await websocket.send_json(data)
    except WebSocketDisconnect:
        listeners.remove(queue)

# --- NEW FEATURES: PCAP & THREAT INTEL ---

from fastapi.responses import Response, StreamingResponse
from app.core.native_pcap import MinimalPcapWriter
from app.core.threat_intel import threat_intel
from pydantic import BaseModel
from typing import List

class PacketData(BaseModel):
    id: int
    timestamp: str
    src: str
    dst: str
    protocol: str
    length: int
    info: str

@app.post("/traffic/export")
async def export_pcap(packets: List[PacketData]):
    """
    Converts a list of JSON packets into a valid .pcap file for Wireshark.
    """
    writer = MinimalPcapWriter()
    for pkt in packets:
        writer.add_packet(pkt.dict())
        
    pcap_bytes = writer.get_output()
    
    headers = {
        'Content-Disposition': 'attachment; filename="netgraph_capture.pcap"'
    }
    return Response(content=pcap_bytes, media_type="application/vnd.tcpdump.pcap", headers=headers)

@app.get("/threat/virustotal")
async def scan_virustotal(target: str):
    """
    Checks an IP against VirusTotal Threat Intel.
    """
    result = await threat_intel.check_ip(target)
    return result

from fastapi import UploadFile, File
from app.core.native_pcap import MinimalPcapReader

@app.post("/traffic/upload")
async def upload_pcap(file: UploadFile = File(...)):
    """
    Parses an uploaded .pcap file and returns packets for the UI.
    """
    content = await file.read()
    reader = MinimalPcapReader(content)
    packets = reader.read_all()
    return {"count": len(packets), "packets": packets}
