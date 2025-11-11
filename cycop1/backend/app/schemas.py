# app/schemas.py
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import ipaddress

# ===============================================================
# Schemas for NodePosition
# ===============================================================

class NodeBase(BaseModel):
    name: str = Field(..., max_length=255, description="ชื่อของโหนด")
    description: Optional[str] = Field(None, description="คำอธิบายเพิ่มเติมเกี่ยวกับโหนด")
    node_type: str = Field(..., max_length=50, description="ประเภทของโหนด เช่น ATTACK_IP, SERVER")
    latitude: float = Field(..., ge=-90, le=90, description="พิกัดละติจูด")
    longitude: float = Field(..., ge=-180, le=180, description="พิกัดลองจิจูด")
    ip_address: Optional[str] = Field(None, description="IP address หลักของโหนด")
    additional_ips: Optional[List[str]] = Field(default=[], description="IP addresses เพิ่มเติม")
    network_metadata: Optional[Dict[str, Any]] = Field(default={}, description="ข้อมูล metadata เพิ่มเติม")
    
    @field_validator('ip_address')
    @classmethod
    def validate_ip_address(cls, v):
        if v is not None:
            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError(f"Invalid IP address: {v}")
        return v
    
    @field_validator('additional_ips')
    @classmethod
    def validate_additional_ips(cls, v):
        if v:
            for ip in v:
                try:
                    ipaddress.ip_address(ip)
                except ValueError:
                    raise ValueError(f"Invalid IP address in additional_ips: {ip}")
        return v


class NodeCreate(NodeBase):
    """Schema สำหรับสร้าง Node ใหม่"""
    pass


class NodeUpdate(BaseModel):
    """Schema สำหรับอัพเดท Node (fields เป็น optional ทั้งหมด)"""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    node_type: Optional[str] = Field(None, max_length=50)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    ip_address: Optional[str] = None
    additional_ips: Optional[List[str]] = None
    network_metadata: Optional[Dict[str, Any]] = None
    
    @field_validator('ip_address')
    @classmethod
    def validate_ip_address(cls, v):
        if v is not None:
            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError(f"Invalid IP address: {v}")
        return v


class Node(BaseModel):
    """Schema สำหรับ Response (รวม ID และ timestamps)"""
    id: int = Field(..., description="ID เฉพาะของโหนด")
    name: str
    description: Optional[str] = None
    node_type: str
    latitude: float
    longitude: float
    ip_address: Optional[str] = None
    additional_ips: List[str] = []
    network_metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

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
            latitude=point.y,   # latitude
            ip_address=str(db_node.ip_address) if db_node.ip_address else None,
            additional_ips=db_node.additional_ips or [],
            network_metadata=db_node.network_metadata or {},
            created_at=db_node.created_at,
            updated_at=db_node.updated_at
        )


# ===============================================================
# Schemas for NetworkConnection
# ===============================================================

class NetworkConnectionBase(BaseModel):
    source_node_id: int = Field(..., description="ID ของโหนดต้นทาง")
    destination_node_id: int = Field(..., description="ID ของโหนดปลายทาง")
    source_ip: Optional[str] = Field(None, description="IP address ต้นทาง")
    destination_ip: Optional[str] = Field(None, description="IP address ปลายทาง")
    source_port: Optional[int] = Field(None, ge=0, le=65535, description="Port ต้นทาง")
    destination_port: Optional[int] = Field(None, ge=0, le=65535, description="Port ปลายทาง")
    protocol: Optional[str] = Field(None, max_length=20, description="Protocol เช่น TCP, UDP, ICMP")
    connection_type: Optional[str] = Field(None, max_length=50, description="ประเภทการเชื่อมต่อ")
    connection_status: Optional[str] = Field(None, max_length=50, description="สถานะการเชื่อมต่อ")
    bytes_sent: Optional[int] = Field(default=0, ge=0, description="จำนวน bytes ที่ส่ง")
    bytes_received: Optional[int] = Field(default=0, ge=0, description="จำนวน bytes ที่รับ")
    packets_sent: Optional[int] = Field(default=0, ge=0, description="จำนวน packets ที่ส่ง")
    packets_received: Optional[int] = Field(default=0, ge=0, description="จำนวน packets ที่รับ")
    connection_metadata: Optional[Dict[str, Any]] = Field(default={}, description="ข้อมูลเพิ่มเติม")
    
    @field_validator('source_ip', 'destination_ip')
    @classmethod
    def validate_ip(cls, v):
        if v is not None:
            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError(f"Invalid IP address: {v}")
        return v


class NetworkConnectionCreate(NetworkConnectionBase):
    """Schema สำหรับสร้าง Connection ใหม่"""
    pass


class NetworkConnectionUpdate(BaseModel):
    """Schema สำหรับอัพเดท Connection"""
    source_port: Optional[int] = Field(None, ge=0, le=65535)
    destination_port: Optional[int] = Field(None, ge=0, le=65535)
    protocol: Optional[str] = Field(None, max_length=20)
    connection_type: Optional[str] = Field(None, max_length=50)
    connection_status: Optional[str] = Field(None, max_length=50)
    bytes_sent: Optional[int] = Field(None, ge=0)
    bytes_received: Optional[int] = Field(None, ge=0)
    packets_sent: Optional[int] = Field(None, ge=0)
    packets_received: Optional[int] = Field(None, ge=0)
    connection_metadata: Optional[Dict[str, Any]] = None


class NetworkConnection(NetworkConnectionBase):
    """Schema สำหรับ Response"""
    id: int
    first_seen: datetime
    last_seen: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class NetworkConnectionWithNodes(NetworkConnection):
    """Schema สำหรับ Response พร้อมข้อมูล nodes"""
    source_node: Optional[Node] = None
    destination_node: Optional[Node] = None
    
    class Config:
        from_attributes = True


class ConnectionStatistics(BaseModel):
    """Schema สำหรับสถิติการเชื่อมต่อ"""
    protocol: str
    connection_type: str
    count: int
    total_bytes_sent: int
    total_bytes_received: int


# ===============================================================
# Schemas for RtarfEvent
# ===============================================================

class RtarfEventBase(BaseModel):
    event_id: str = Field(..., max_length=255, description="Event ID เฉพาะ")
    incident_id: Optional[str] = Field(None, max_length=255, description="Incident ID ที่เชื่อมโยงกับ Event")
    status: Optional[str] = Field("pending", max_length=50, description="สถานะของ Event (เช่น new, in_progress, resolved)")

    source_ip: Optional[str] = Field(None, description="IP address ต้นทาง")
    destination_ip: Optional[str] = Field(None, description="IP address ปลายทาง")
    source_port: Optional[int] = Field(None, ge=0, le=65535)
    destination_port: Optional[int] = Field(None, ge=0, le=65535)
    protocol: Optional[str] = Field(None, max_length=20)
    source_node_id: Optional[int] = None
    destination_node_id: Optional[int] = None
    connection_id: Optional[int] = None
    
    # Palo-XSIAM fields
    mitre_tactics_ids_and_names: Optional[List[Dict[str, str]]] = Field(default=[])
    mitre_techniques_ids_and_names: Optional[List[Dict[str, str]]] = Field(default=[])
    description: Optional[str] = None
    severity: Optional[str] = Field(None, max_length=50)
    alert_categories: Optional[List[str]] = Field(default=[])
    
    # CrowdStrike fields
    crowdstrike_tactics: Optional[List[str]] = Field(default=[])
    crowdstrike_tactics_ids: Optional[List[str]] = Field(default=[])
    crowdstrike_techniques: Optional[List[str]] = Field(default=[])
    crowdstrike_techniques_ids: Optional[List[str]] = Field(default=[])
    crowdstrike_severity: Optional[str] = Field(None, max_length=50)
    crowdstrike_event_name: Optional[str] = Field(None, max_length=255)
    crowdstrike_event_objective: Optional[str] = None
    
    # Suricata fields
    suricata_classification: Optional[str] = Field(None, max_length=255)
    
    @field_validator('source_ip', 'destination_ip')
    @classmethod
    def validate_ip(cls, v):
        if v is not None:
            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError(f"Invalid IP address: {v}")
        return v


class RtarfEventCreate(RtarfEventBase):
    """Schema สำหรับสร้าง Event ใหม่"""
    pass


class RtarfEvent(RtarfEventBase):
    """Schema สำหรับ Response"""
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


class RtarfEventWithNodes(RtarfEvent):
    """Schema สำหรับ Response พร้อมข้อมูล nodes"""
    source_node: Optional[Node] = None
    destination_node: Optional[Node] = None
    
    class Config:
        from_attributes = True


class SyncResponse(BaseModel):
    """Response สำหรับ Elasticsearch sync"""
    status: str
    total_processed: int
    inserted: int
    updated: int
    message: Optional[str] = None


# ===============================================================
# Schemas for Alert
# ===============================================================

class AlertBase(BaseModel):
    event_id: str = Field(..., max_length=255, description="Event ID เฉพาะ")
    alert_name: str = Field(..., max_length=255, description="ชื่อ alert")
    severity: Optional[str] = Field(None, max_length=50, description="ระดับความรุนแรง")
    source: Optional[str] = Field(None, max_length=50, description="แหล่งที่มาของ alert")
    incident_id: Optional[str] = Field(None, max_length=255, description="Incident ID ที่เชื่อมโยงกับ Event")
    status: Optional[str] = Field("pending", max_length=50, description="สถานะของ Event (เช่น new, in_progress, resolved)")
    description: Optional[str] = None
    source_ip: Optional[str] = Field(None, description="IP address ต้นทาง")
    destination_ip: Optional[str] = Field(None, description="IP address ปลายทาง")
    affected_node_id: Optional[int] = Field(None, description="ID ของโหนดที่ได้รับผลกระทบ")
    
    @field_validator('source_ip', 'destination_ip')
    @classmethod
    def validate_ip(cls, v):
        if v is not None:
            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError(f"Invalid IP address: {v}")
        return v


class AlertCreate(AlertBase):
    """Schema สำหรับสร้าง Alert ใหม่"""
    pass


class Alert(AlertBase):
    """Schema สำหรับ Response"""
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class AlertWithNode(Alert):
    """Schema สำหรับ Response พร้อมข้อมูลโหนด"""
    affected_node: Optional[Node] = None
    
    class Config:
        from_attributes = True


# ===============================================================
# Additional Response Schemas
# ===============================================================

class NodeWithConnections(Node):
    """Schema สำหรับ Node พร้อมการเชื่อมต่อ"""
    outgoing_connections: List[NetworkConnection] = []
    incoming_connections: List[NetworkConnection] = []
    total_outgoing: int = 0
    total_incoming: int = 0
    
    class Config:
        from_attributes = True


class NodeWithAlerts(Node):
    """Schema สำหรับ Node พร้อม alerts ล่าสุด"""
    latest_alerts: List[Alert] = []
    total_alerts: int = 0
    
    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    """Schema สำหรับสถิติ Dashboard"""
    total_nodes: int
    total_connections: int
    total_events: int
    total_alerts: int
    active_connections: int
    suspicious_connections: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int


class NetworkGraphData(BaseModel):
    """Schema สำหรับข้อมูล Network Graph"""
    nodes: List[Node]
    connections: List[NetworkConnection]
    
    class Config:
        from_attributes = True


# ===============================================================
# Query Parameter Schemas
# ===============================================================

class NodeQueryParams(BaseModel):
    """Query parameters สำหรับค้นหา nodes"""
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=1000)
    node_type: Optional[str] = None
    search: Optional[str] = None


class ConnectionQueryParams(BaseModel):
    """Query parameters สำหรับค้นหา connections"""
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=1000)
    connection_type: Optional[str] = None
    protocol: Optional[str] = None
    status: Optional[str] = None


class EventQueryParams(BaseModel):
    """Query parameters สำหรับค้นหา events"""
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=1000)
    severity: Optional[str] = None
    source: Optional[str] = None


class AlertQueryParams(BaseModel):
    """Query parameters สำหรับค้นหา alerts"""
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=100, ge=1, le=1000)
    severity: Optional[str] = None
    source: Optional[str] = None


class AreaSearchParams(BaseModel):
    """Parameters สำหรับค้นหาโหนดในพื้นที่"""
    min_latitude: float = Field(..., ge=-90, le=90)
    min_longitude: float = Field(..., ge=-180, le=180)
    max_latitude: float = Field(..., ge=-90, le=90)
    max_longitude: float = Field(..., ge=-180, le=180)
    
    @field_validator('max_latitude')
    @classmethod
    def validate_latitude_range(cls, v, info):
        if 'min_latitude' in info.data and v <= info.data['min_latitude']:
            raise ValueError('max_latitude must be greater than min_latitude')
        return v
    
    @field_validator('max_longitude')
    @classmethod
    def validate_longitude_range(cls, v, info):
        if 'min_longitude' in info.data and v <= info.data['min_longitude']:
            raise ValueError('max_longitude must be greater than min_longitude')
        return v