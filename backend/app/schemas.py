# app/schemas.py
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime

# ===============================================================
# Schemas for NodePosition
# ===============================================================

class NodeBase(BaseModel):
    name: str = Field(..., max_length=255, description="ชื่อของโหนด")
    description: Optional[str] = Field(None, description="คำอธิบายเพิ่มเติมเกี่ยวกับโหนด")
    node_type: str = Field(..., max_length=50, description="ประเภทของโหนด เช่น ATTACK_IP, SERVER")
    latitude: float = Field(..., ge=-90, le=90, description="พิกัดละติจูด")
    longitude: float = Field(..., ge=-180, le=180, description="พิกัดลองจิจูด")


class NodeCreate(NodeBase):
    """Schema สำหรับสร้าง Node ใหม่"""
    pass


class Node(BaseModel):
    """Schema สำหรับ Response (รวม ID และ location ที่แปลงแล้ว)"""
    id: int = Field(..., description="ID เฉพาะของโหนด")
    name: str
    description: Optional[str] = None
    node_type: str
    latitude: float
    longitude: float

    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm_with_location(cls, db_node):
        """
        แปลง SQLAlchemy model ที่มี geometry เป็น Pydantic model
        โดยแปลง location (WKBElement) เป็น lat/lon
        """
        from geoalchemy2.shape import to_shape
        
        # แปลง WKBElement เป็น Shapely Point
        point = to_shape(db_node.location)
        
        return cls(
            id=db_node.id,
            name=db_node.name,
            description=db_node.description,
            node_type=db_node.node_type,
            longitude=point.x,  # longitude
            latitude=point.y    # latitude
        )
        
# ===============================================================
# Schemas for Alert
# ===============================================================

class AlertBase(BaseModel):
    event_id: str = Field(..., max_length=255, description="ID เฉพาะของ Event")
    alert_name: str = Field(..., max_length=255, description="ชื่อของ Alert")
    severity: Optional[str] = Field(None, max_length=50, description="ระดับความรุนแรง")


class AlertCreate(AlertBase):
    """Schema สำหรับสร้าง Alert ใหม่"""
    pass


class Alert(AlertBase):
    """Schema สำหรับ Response"""
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm_with_location(cls, db_node):
        """
        แปลง SQLAlchemy model ที่มี geometry เป็น Pydantic model
        โดยแปลง location (WKBElement) เป็น lat/lon
        """
        from geoalchemy2.shape import to_shape
        
        # แปลง WKBElement เป็น Shapely Point
        point = to_shape(db_node.location)
        
        return cls(
            id=db_node.id,
            name=db_node.name,
            description=db_node.description,
            node_type=db_node.node_type,
            longitude=point.x,  # longitude
            latitude=point.y    # latitude
        )


# ===============================================================
# Schemas for RtarfEvent
# ===============================================================

class RtarfEventBase(BaseModel):
    event_id: str = Field(..., description="ID เฉพาะของ Event")
    
    # Palo-XSIAM fields - Changed to List instead of Dict
    mitre_tactics_ids_and_names: Optional[List] = None
    mitre_techniques_ids_and_names: Optional[List] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    alert_categories: Optional[List] = None
    
    # CrowdStrike fields - Changed to List instead of Dict
    crowdstrike_tactics: Optional[List] = None
    crowdstrike_tactics_ids: Optional[List] = None
    crowdstrike_techniques: Optional[List] = None
    crowdstrike_techniques_ids: Optional[List] = None
    crowdstrike_severity: Optional[str] = Field(None, max_length=50)
    crowdstrike_event_name: Optional[str] = None
    crowdstrike_event_objective: Optional[str] = None
    
    # Suricata fields
    suricata_classification: Optional[str] = None


class RtarfEventCreate(RtarfEventBase):
    """Schema สำหรับสร้าง RTARF Event ใหม่"""
    pass


class RtarfEvent(RtarfEventBase):
    """Schema สำหรับ Response"""
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
        
class SyncResponse(BaseModel):
    status: str
    total_processed: int
    inserted: int
    updated: int
    message: Optional[str] = None