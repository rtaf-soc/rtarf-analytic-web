# app/models.py
from geoalchemy2 import Geometry
from sqlalchemy import Index, Text, Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

from .database import Base


class NodePosition(Base): 
    __tablename__ = "node_positions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False) 
    description = Column(Text, nullable=True) 
    node_type = Column(String(50), index=True, nullable=False)
    
    # Geometry column สำหรับเก็บพิกัด (POINT)
    # spatial_index=True จะสร้าง GIST index โดยอัตโนมัติ
    location = Column(
        Geometry(geometry_type='POINT', srid=4326, spatial_index=True), 
        nullable=False
    )
    
    # Timestamp fields
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=func.now())

    def __repr__(self):
        return f"<NodePosition(id={self.id}, name='{self.name}', type='{self.node_type}')>"

    
class RtarfEvent(Base):
    __tablename__ = "rtarf_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(255), unique=True, index=True, nullable=False)

    # Palo-XSIAM fields
    mitre_tactics_ids_and_names = Column(JSONB)
    mitre_techniques_ids_and_names = Column(JSONB)
    description = Column(Text)
    severity = Column(String(50))
    alert_categories = Column(JSONB)

    # CrowdStrike fields
    crowdstrike_tactics = Column(JSONB)
    crowdstrike_tactics_ids = Column(JSONB)
    crowdstrike_techniques = Column(JSONB)
    crowdstrike_techniques_ids = Column(JSONB)
    crowdstrike_severity = Column(String(50))  
    crowdstrike_event_name = Column(String(255))
    crowdstrike_event_objective = Column(Text)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_rtarf_events_severity', severity),
        Index('idx_rtarf_events_timestamp', timestamp),
    )

    def __repr__(self):
        return f"<RtarfEvent(id={self.id}, event_id='{self.event_id}', severity='{self.severity}')>"