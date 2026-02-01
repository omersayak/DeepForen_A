from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional

# --- Shared Schemas (Frontend <-> Backend) ---

class DeviceCreate(BaseModel):
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    os_type: Optional[str] = None
    role: str = "unknown"

class DeviceResponse(DeviceCreate):
    id: int
    risk_score: float
    last_seen: datetime

    class Config:
        from_attributes = True

class LogCreate(BaseModel):
    device_ip: str
    severity: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)

class AnalysisRequest(BaseModel):
    query: str
    context_devices: List[str] = []

class AnalysisResponse(BaseModel):
    answer: str
    relevant_nodes: List[int] = []
    suggested_actions: List[str] = []
