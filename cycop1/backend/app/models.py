# app/models.py
from geoalchemy2 import Geometry
from sqlalchemy import Index, Text, Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class NodePosition(Base): 
    __tablename__ = "node_positions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False) 
    description = Column(Text, nullable=True) 
    node_type = Column(String(50), index=True, nullable=False)
    
    # แยก Global / Province (Bangkok)
    map_scope = Column(String(50), nullable=False, default="global", index=True)
    
    # IP Address field - ใช้ INET type ของ PostgreSQL
    ip_address = Column(INET, index=True, nullable=True)
    
    # Optional: เก็บ IP addresses เพิ่มเติม (กรณีมีหลาย IP)
    additional_ips = Column(JSONB, default=list)
    
    # Optional: เก็บข้อมูล network metadata
    network_metadata = Column(JSONB, default=dict)  # เช่น MAC address, hostname, subnet
    
    # Geometry column สำหรับเก็บพิกัด (POINT)
    location = Column(
        Geometry(geometry_type='POINT', srid=4326, spatial_index=True), 
        nullable=False
    )
    
    # Timestamp fields
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=func.now())
    
    # Relationships
    outgoing_connections = relationship(
        "NetworkConnection",
        foreign_keys="NetworkConnection.source_node_id",
        back_populates="source_node",
        cascade="all, delete-orphan"
    )
    
    incoming_connections = relationship(
        "NetworkConnection",
        foreign_keys="NetworkConnection.destination_node_id",
        back_populates="destination_node",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<NodePosition(id={self.id}, name='{self.name}', ip='{self.ip_address}', type='{self.node_type}')>"


class NodePositionBK(Base):
    __tablename__ = "node_positionsBK"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    node_type = Column(String(50), index=True, nullable=False)

    # ระบุว่าเป็นโหนดที่ใช้ใน Bangkok map
    map_scope = Column(String(50), nullable=False, default="bangkok", index=True)

    ip_address = Column(INET, index=True, nullable=True)
    additional_ips = Column(JSONB, default=list)
    network_metadata = Column(JSONB, default=dict)

    location = Column(
        Geometry(geometry_type='POINT', srid=4326, spatial_index=True),
        nullable=False
    )

    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, server_default=func.now())

    # ตรงนี้ยังไม่ผูก FK กับ NetworkConnection / Alert โดยตรง
    # ใช้ node_id ร่วมกับตารางอื่นผ่าน logic ใน CRUD/Router แทน

    def __repr__(self):
        return f"<NodePositionBK(id={self.id}, name='{self.name}', ip='{self.ip_address}', type='{self.node_type}')>"


class NetworkConnection(Base):
    """
    เก็บข้อมูลการเชื่อมต่อเครือข่ายระหว่างโหนด
    """
    __tablename__ = "network_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Source and Destination nodes
    source_node_id = Column(Integer, ForeignKey('node_positions.id', ondelete='CASCADE'), nullable=False, index=True)
    destination_node_id = Column(Integer, ForeignKey('node_positions.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # IP addresses (เก็บไว้เพื่อความสะดวกในการ query)
    source_ip = Column(INET, index=True)
    destination_ip = Column(INET, index=True)
    
    # Port information
    source_port = Column(Integer)
    destination_port = Column(Integer)
    
    # Protocol (TCP, UDP, ICMP, etc.)
    protocol = Column(String(20), index=True)
    
    # Connection metadata
    connection_type = Column(String(50))  # เช่น 'normal', 'suspicious', 'malicious'
    connection_status = Column(String(50))  # เช่น 'active', 'closed', 'blocked'
    
    # Traffic statistics
    bytes_sent = Column(Integer, default=0)
    bytes_received = Column(Integer, default=0)
    packets_sent = Column(Integer, default=0)
    packets_received = Column(Integer, default=0)
    
    # Additional connection details
    connection_metadata = Column(JSONB, default=dict)  # เช่น application, user-agent, flags
    
    # Timestamps
    first_seen = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    
    # Relationships
    source_node = relationship("NodePosition", foreign_keys=[source_node_id], back_populates="outgoing_connections")
    destination_node = relationship("NodePosition", foreign_keys=[destination_node_id], back_populates="incoming_connections")
    
    # Indexes for better performance
    __table_args__ = (
        Index('idx_network_conn_source_dest', source_node_id, destination_node_id),
        Index('idx_network_conn_ips', source_ip, destination_ip),
        Index('idx_network_conn_last_seen', last_seen.desc()),
        Index('idx_network_conn_protocol', protocol),
        Index('idx_network_conn_type', connection_type),
    )
    
    def __repr__(self):
        return f"<NetworkConnection(id={self.id}, {self.source_ip}:{self.source_port} -> {self.destination_ip}:{self.destination_port}, protocol='{self.protocol}')>"


class RtarfEvent(Base):
    __tablename__ = "rtarf_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(255), unique=True, index=True, nullable=False)
    
    # Incident and Status fields
    incident_id = Column(String(255), index=True, nullable=True)
    status = Column(String(50), default="pending", nullable=False)
    
    # Network-related fields
    source_ip = Column(INET, index=True)
    destination_ip = Column(INET, index=True)
    source_port = Column(Integer)
    destination_port = Column(Integer)
    protocol = Column(String(20))
    
    # Optional: Link to nodes and connections
    source_node_id = Column(Integer, ForeignKey('node_positions.id', ondelete='SET NULL'), nullable=True)
    destination_node_id = Column(Integer, ForeignKey('node_positions.id', ondelete='SET NULL'), nullable=True)
    connection_id = Column(Integer, ForeignKey('network_connections.id', ondelete='SET NULL'), nullable=True)

    # Palo-XSIAM fields
    mitre_tactics_ids_and_names = Column(JSONB, default=list)
    mitre_techniques_ids_and_names = Column(JSONB, default=list)
    description = Column(Text)
    severity = Column(String(50))
    alert_categories = Column(JSONB, default=list)

    # CrowdStrike fields
    crowdstrike_tactics = Column(JSONB, default=list)
    crowdstrike_tactics_ids = Column(JSONB, default=list)
    crowdstrike_techniques = Column(JSONB, default=list)
    crowdstrike_techniques_ids = Column(JSONB, default=list)
    crowdstrike_severity = Column(String(50))  
    crowdstrike_event_name = Column(String(255))
    crowdstrike_event_objective = Column(Text)
    
    # Suricata fields
    suricata_classification = Column(String(255))
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_rtarf_events_severity', severity),
        Index('idx_rtarf_events_timestamp', timestamp.desc()),
        Index('idx_rtarf_events_source_ip', source_ip),
        Index('idx_rtarf_events_dest_ip', destination_ip),
        Index('idx_rtarf_events_incident_id', incident_id),
        Index('idx_rtarf_events_status', status),
    )

    def __repr__(self):
        return f"<RtarfEvent(id={self.id}, event_id='{self.event_id}', severity='{self.severity}', status='{self.status}')>"

    
class Alert(Base):
    """
    Store alert list to show 10 latest alerts from that node
    """
    __tablename__ = "alert_lists"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(255), unique=True, index=True, nullable=False)  
    alert_name = Column(String(255), index=True, nullable=False)
    description = Column(Text)  
    severity = Column(String(50), index=True)
    source = Column(String(50), index=True)
    incident_id = Column(String(255), index=True, nullable=True)
    status = Column(String(50), default="pending", nullable=False)
    
    # เพิ่ม network fields
    source_ip = Column(INET, index=True)
    destination_ip = Column(INET, index=True)
    affected_node_id = Column(Integer, ForeignKey('node_positions.id', ondelete='SET NULL'), nullable=True)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_alert_lists_timestamp', timestamp.desc()),
        Index('idx_alert_lists_node', affected_node_id, timestamp.desc()),
    )
    
    def __repr__(self):
        return f"<Alert(id={self.id}, event_id='{self.event_id}', alert_name='{self.alert_name}', severity='{self.severity}')>"
    
    
class NodeEvent(Base):
    """
    Junction table linking NodePositions with RtarfEvents
    Tracks which events occurred on which nodes
    """
    __tablename__ = "node_events"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    node_id = Column(Integer, ForeignKey('node_positions.id', ondelete='CASCADE'), nullable=False, index=True)
    rtarf_event_id = Column(Integer, ForeignKey('rtarf_events.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Role of the node in this event
    node_role = Column(String(50), index=True)  # 'source', 'destination', 'affected', 'related'
    
    # Store IP for quick reference (denormalized for performance)
    node_ip = Column(INET, index=True)
    
    # Event relevance score (optional - for ranking/filtering)
    relevance_score = Column(Integer, default=100)  # 0-100, higher = more relevant
    
    # Additional context about the node's involvement
    involvement_metadata = Column(JSONB, default=dict)  # e.g., {'action': 'initiated', 'impact': 'high'}
    
    # Timestamps
    detected_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    
    # Relationships
    node = relationship("NodePosition", backref="node_events")
    event = relationship("RtarfEvent", backref="associated_nodes")
    
    # Composite indexes for efficient queries
    __table_args__ = (
        Index('idx_node_events_node_event', node_id, rtarf_event_id, unique=True),  # Prevent duplicates
        Index('idx_node_events_node_role', node_id, node_role),
        Index('idx_node_events_ip', node_ip),
        Index('idx_node_events_detected', detected_at.desc()),
    )
    
    def __repr__(self):
        return f"<NodeEvent(node_id={self.node_id}, rtarf_event_id={self.rtarf_event_id}, role='{self.node_role}', ip='{self.node_ip}')>"
