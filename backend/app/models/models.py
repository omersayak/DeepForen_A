from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, unique=True, index=True)
    mac_address = Column(String, unique=True, nullable=True)
    hostname = Column(String, nullable=True)
    os_type = Column(String, nullable=True) # Windows, Linux, IoT
    role = Column(String, default="unknown") # router, server, workstation
    risk_score = Column(Float, default=0.0)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    
    # Metadata for UI visualization (positions etc, though usually computed)
    meta = Column(JSON, nullable=True)

    logs = relationship("LogEntry", back_populates="device")

class LogEntry(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    severity = Column(String) # INFO, WARN, ERROR, CRITICAL
    content = Column(Text)
    
    # Vector embedding for AI RAG
    embedding = Column(Vector(1536)) # OpenAI size, adjustable

    device = relationship("Device", back_populates="logs")
