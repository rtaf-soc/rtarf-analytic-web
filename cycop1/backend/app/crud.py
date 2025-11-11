# app/crud.py
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point
from . import elastic_client as es
from dateutil import parser as dateparser
import logging
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert
import ipaddress
from typing import Dict, List, Optional

from . import models
from . import schemas


# ===============================================================
# CRUD Functions for NodePosition
# ===============================================================

def get_node(db: Session, node_id: int):
    """
    ดึงข้อมูลโหนด 1 รายการจากฐานข้อมูลด้วย ID
    """
    return db.query(models.NodePosition).filter(models.NodePosition.id == node_id).first()


def get_node_by_ip(db: Session, ip_address: str):
    """
    ดึงข้อมูลโหนดจาก IP address
    """
    return db.query(models.NodePosition).filter(models.NodePosition.ip_address == ip_address).first()


def get_nodes(db: Session, skip: int = 0, limit: int = 100, node_type: Optional[str] = None):
    """
    ดึงข้อมูลโหนดทั้งหมดจากฐานข้อมูล พร้อมการแบ่งหน้า (pagination)
    """
    query = db.query(models.NodePosition)
    
    if node_type:
        query = query.filter(models.NodePosition.node_type == node_type)
    
    return query.offset(skip).limit(limit).all()


def create_node(db: Session, node: schemas.NodeCreate):
    """
    สร้างโหนดใหม่ในฐานข้อมูล
    """
    # สร้าง Point object จาก shapely
    # IMPORTANT: GeoAlchemy2 expects (longitude, latitude) order for SRID 4326
    point = Point(node.longitude, node.latitude)
    
    # แปลง Point เป็น WKBElement ที่ GeoAlchemy2 เข้าใจ
    wkb_point = from_shape(point, srid=4326)

    # สร้าง SQLAlchemy Model Object
    db_node = models.NodePosition(
        name=node.name,
        description=node.description,
        node_type=node.node_type,
        ip_address=node.ip_address,
        additional_ips=node.additional_ips or [],
        network_metadata=node.network_metadata or {},
        location=wkb_point
    )
    
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    
    return db_node


def update_node(db: Session, node_id: int, node: schemas.NodeUpdate):
    """
    อัพเดทข้อมูลโหนดที่มีอยู่
    """
    db_node = get_node(db, node_id)
    if db_node is None:
        return None
    
    # อัพเดทข้อมูลที่ให้มา
    update_data = node.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == "latitude" or field == "longitude":
            continue  # Handle location separately
        setattr(db_node, field, value)
    
    # อัพเดทพิกัดถ้ามีการเปลี่ยนแปลง
    if hasattr(node, 'latitude') and hasattr(node, 'longitude') and node.latitude and node.longitude:
        point = Point(node.longitude, node.latitude)
        db_node.location = from_shape(point, srid=4326)
    
    db_node.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_node)
    
    return db_node


def delete_node(db: Session, node_id: int):
    """
    ลบโหนดออกจากฐานข้อมูล
    """
    db_node = get_node(db, node_id)
    if db_node is None:
        return False
    
    db.delete(db_node)
    db.commit()
    return True


def search_nodes_by_area(db: Session, min_lat: float, min_lng: float, max_lat: float, max_lng: float):
    """
    ค้นหาโหนดในพื้นที่สี่เหลี่ยม (bounding box)
    """
    from geoalchemy2 import functions as geo_func
    
    # สร้าง polygon จากจุด 4 มุม
    polygon_wkt = f'POLYGON(({min_lng} {min_lat}, {max_lng} {min_lat}, {max_lng} {max_lat}, {min_lng} {max_lat}, {min_lng} {min_lat}))'
    
    return db.query(models.NodePosition).filter(
        geo_func.ST_Within(models.NodePosition.location, geo_func.ST_GeomFromText(polygon_wkt, 4326))
    ).all()


# ===============================================================
# CRUD Functions for NetworkConnection
# ===============================================================

def get_connection(db: Session, connection_id: int):
    """
    ดึงข้อมูลการเชื่อมต่อ 1 รายการ
    """
    return db.query(models.NetworkConnection).filter(models.NetworkConnection.id == connection_id).first()


def get_connections(db: Session, skip: int = 0, limit: int = 100, 
                   connection_type: Optional[str] = None,
                   protocol: Optional[str] = None):
    """
    ดึงข้อมูลการเชื่อมต่อทั้งหมด พร้อม filter
    """
    query = db.query(models.NetworkConnection)
    
    if connection_type:
        query = query.filter(models.NetworkConnection.connection_type == connection_type)
    
    if protocol:
        query = query.filter(models.NetworkConnection.protocol == protocol)
    
    return query.order_by(desc(models.NetworkConnection.last_seen)).offset(skip).limit(limit).all()


def get_node_connections(db: Session, node_id: int, direction: str = "both"):
    """
    ดึงการเชื่อมต่อของโหนดเฉพาะ
    direction: "outgoing", "incoming", "both"
    """
    if direction == "outgoing":
        return db.query(models.NetworkConnection).filter(
            models.NetworkConnection.source_node_id == node_id
        ).order_by(desc(models.NetworkConnection.last_seen)).all()
    
    elif direction == "incoming":
        return db.query(models.NetworkConnection).filter(
            models.NetworkConnection.destination_node_id == node_id
        ).order_by(desc(models.NetworkConnection.last_seen)).all()
    
    else:  # both
        return db.query(models.NetworkConnection).filter(
            or_(
                models.NetworkConnection.source_node_id == node_id,
                models.NetworkConnection.destination_node_id == node_id
            )
        ).order_by(desc(models.NetworkConnection.last_seen)).all()


def create_connection(db: Session, connection: schemas.NetworkConnectionCreate):
    """
    สร้างการเชื่อมต่อใหม่
    """
    db_connection = models.NetworkConnection(
        source_node_id=connection.source_node_id,
        destination_node_id=connection.destination_node_id,
        source_ip=connection.source_ip,
        destination_ip=connection.destination_ip,
        source_port=connection.source_port,
        destination_port=connection.destination_port,
        protocol=connection.protocol,
        connection_type=connection.connection_type,
        connection_status=connection.connection_status,
        bytes_sent=connection.bytes_sent or 0,
        bytes_received=connection.bytes_received or 0,
        packets_sent=connection.packets_sent or 0,
        packets_received=connection.packets_received or 0,
        connection_metadata=connection.connection_metadata or {}
    )
    
    db.add(db_connection)
    db.commit()
    db.refresh(db_connection)
    
    return db_connection


def update_connection(db: Session, connection_id: int, connection: schemas.NetworkConnectionUpdate):
    """
    อัพเดทข้อมูลการเชื่อมต่อ
    """
    db_connection = get_connection(db, connection_id)
    if db_connection is None:
        return None
    
    update_data = connection.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_connection, field, value)
    
    db_connection.last_seen = datetime.utcnow()
    
    db.commit()
    db.refresh(db_connection)
    
    return db_connection


def update_or_create_connection(db: Session, connection: schemas.NetworkConnectionCreate):
    """
    อัพเดทถ้ามีอยู่แล้ว หรือสร้างใหม่ถ้ายังไม่มี
    """
    # ค้นหาการเชื่อมต่อที่มีอยู่
    existing = db.query(models.NetworkConnection).filter(
        and_(
            models.NetworkConnection.source_node_id == connection.source_node_id,
            models.NetworkConnection.destination_node_id == connection.destination_node_id,
            models.NetworkConnection.source_port == connection.source_port,
            models.NetworkConnection.destination_port == connection.destination_port,
            models.NetworkConnection.protocol == connection.protocol
        )
    ).first()
    
    if existing:
        # อัพเดทข้อมูล
        existing.bytes_sent += connection.bytes_sent or 0
        existing.bytes_received += connection.bytes_received or 0
        existing.packets_sent += connection.packets_sent or 0
        existing.packets_received += connection.packets_received or 0
        existing.last_seen = datetime.utcnow()
        existing.connection_status = connection.connection_status
        
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # สร้างใหม่
        return create_connection(db, connection)


def delete_connection(db: Session, connection_id: int):
    """
    ลบการเชื่อมต่อ
    """
    db_connection = get_connection(db, connection_id)
    if db_connection is None:
        return False
    
    db.delete(db_connection)
    db.commit()
    return True


def get_connection_statistics(db: Session, node_id: Optional[int] = None):
    """
    ดึงสถิติการเชื่อมต่อ
    """
    query = db.query(
        models.NetworkConnection.protocol,
        models.NetworkConnection.connection_type,
        func.count(models.NetworkConnection.id).label('count'),
        func.sum(models.NetworkConnection.bytes_sent).label('total_bytes_sent'),
        func.sum(models.NetworkConnection.bytes_received).label('total_bytes_received')
    )
    
    if node_id:
        query = query.filter(
            or_(
                models.NetworkConnection.source_node_id == node_id,
                models.NetworkConnection.destination_node_id == node_id
            )
        )
    
    return query.group_by(
        models.NetworkConnection.protocol,
        models.NetworkConnection.connection_type
    ).all()


# ===============================================================
# CRUD Functions for RtarfEvent
# ===============================================================

logger = logging.getLogger(__name__)

def _extract_fields(source):
    """Extract and normalize fields from Elasticsearch document"""
    # --- Incident / Status (optional mapping if data source contains them) ---
    

    # --- Palo-XSIAM ---
    palo = source.get("palo-xsiam")
    if not isinstance(palo, dict):
           palo = {}
    
    incident_id = palo.get("incident_id")
    status = palo.get("status")
    px_tactics = palo.get("mitre_tactics_ids_and_names")
    px_techniques = palo.get("mitre_techniques_ids_and_names")
    description = palo.get("description")
    severity = palo.get("severity")
    alert_categories = palo.get("alert_categories")

    # --- CrowdStrike ---
    cs_event = source.get("crowdstrike", {}).get("event", {})
    cs_raw = source.get("crowdstrike", {}).get("event", {}).get("MitreAttack", [])
    cs_severity = source.get("crowdstrike", {}).get("event", {}).get("SeverityName")
    cs_event_name = cs_event.get("Name")  
    cs_event_objective = cs_event.get("Objective") 
    
    # --- Suricata ---
    suricata_class = source.get("suricata", {}).get("classification")
    
    # normalize cs_raw to a list of dicts
    if isinstance(cs_raw, dict):
        cs_list = [cs_raw]
    elif isinstance(cs_raw, list):
        cs_list = cs_raw
    else:
        cs_list = []

    # collect all fields across list items
    cs_tactics = []
    cs_tactics_ids = []
    cs_techniques = []
    cs_techniques_ids = []

    for item in cs_list:
        if not isinstance(item, dict):
            continue
        if item.get("Tactic"):
            cs_tactics.append(item["Tactic"])
        if item.get("TacticID"):
            cs_tactics_ids.append(item["TacticID"])
        if item.get("Technique"):
            cs_techniques.append(item["Technique"])
        if item.get("TechniqueID"):
            cs_techniques_ids.append(item["TechniqueID"])

    # --- normalize all lists ---
    def normalize_list(val):
        if val is None:
            return []
        if isinstance(val, str):
            return [v.strip() for v in val.split(",")] if "," in val else [val]
        if isinstance(val, list):
            return val
        return [val]
    
    cs_severity = cs_severity if isinstance(cs_severity, str) else None
    cs_event_name = cs_event_name if isinstance(cs_event_name, str) else None
    cs_event_objective = cs_event_objective if isinstance(cs_event_objective, str) else None
    suricata_class = suricata_class if isinstance(suricata_class, str) else None

    return {
        "incident_id": incident_id,
        "status": status,
        "palo_tactics": normalize_list(px_tactics),
        "palo_techniques": normalize_list(px_techniques),
        "description": description,
        "severity": severity,
        "alert_categories": normalize_list(alert_categories),
        "cs_tactics": normalize_list(cs_tactics),
        "cs_tactics_ids": normalize_list(cs_tactics_ids),
        "cs_techniques": normalize_list(cs_techniques),
        "cs_techniques_ids": normalize_list(cs_techniques_ids),
        "cs_severity": cs_severity,
        "cs_event_name": cs_event_name,
        "cs_event_objective": cs_event_objective,
        "suricata_classification": suricata_class
    }

def _bulk_upsert_records(db: Session, records: list):
    """
    Perform bulk upsert using PostgreSQL's ON CONFLICT DO UPDATE
    This is much faster than individual inserts/updates
    """
    if not records:
        return 0, 0
    
    try:
        stmt = insert(models.RtarfEvent).values(records)
        
        update_dict = {
            'incident_id': stmt.excluded.incident_id,
            'status': stmt.excluded.status,
            'mitre_tactics_ids_and_names': stmt.excluded.mitre_tactics_ids_and_names,
            'mitre_techniques_ids_and_names': stmt.excluded.mitre_techniques_ids_and_names,
            'description': stmt.excluded.description,
            'severity': stmt.excluded.severity,
            'alert_categories': stmt.excluded.alert_categories,
            'crowdstrike_tactics': stmt.excluded.crowdstrike_tactics,
            'crowdstrike_tactics_ids': stmt.excluded.crowdstrike_tactics_ids,
            'crowdstrike_techniques': stmt.excluded.crowdstrike_techniques,
            'crowdstrike_techniques_ids': stmt.excluded.crowdstrike_techniques_ids,
            'crowdstrike_severity': stmt.excluded.crowdstrike_severity,
            'crowdstrike_event_name': stmt.excluded.crowdstrike_event_name,
            'crowdstrike_event_objective': stmt.excluded.crowdstrike_event_objective,
            'suricata_classification': stmt.excluded.suricata_classification,
            'timestamp': stmt.excluded.timestamp,
        }
        
        stmt = stmt.on_conflict_do_update(
            index_elements=['event_id'],
            set_=update_dict
        )
        
        result = db.execute(stmt)
        db.commit()
        
        return len(records), 0
        
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk upsert failed: {e}")
        raise
    
async def insert_rtarf_event_into_postgres(db: Session, es_client):
    """
    Fetch events from Elasticsearch and insert into PostgreSQL
    Returns a summary of the operation
    """
    query = {
        "query": {
            "bool": {
                "should": [
                    {"exists": {"field": "palo-xsiam.mitre_tactics_ids_and_names"}},
                    # {"exists": {"field": "suricata.classification"}},
#                   # {"exists": {"field": "crowdstrike.event.MitreAttack.Tactic"}},
                ],
                "minimum_should_match": 1
            }
        }
    }
    
    try:
        resp = await es_client.search(index="rtarf-events-beat*", body=query, size=250)
    except Exception as e:
        logger.error(f"Elasticsearch query failed: {e}")
        raise
    
    record_batch = []
    
    for hit in resp["hits"]["hits"]:
        source = hit.get("_source", {})
        es_id = hit.get("_id")
        fields = _extract_fields(source)
        
        ts = source.get("@timestamp") or source.get("timestamp")
        parsed_ts = None
        if ts:
            try:
                parsed_ts = dateparser.parse(ts)
            except Exception:
                parsed_ts = None
        
        record = {
            "event_id": es_id,
            "incident_id": fields["incident_id"],
            "status": fields["status"],
            "mitre_tactics_ids_and_names": fields["palo_tactics"],
            "mitre_techniques_ids_and_names": fields["palo_techniques"],
            "description": fields["description"],
            "severity": fields["severity"],
            "alert_categories": fields["alert_categories"],
            "crowdstrike_tactics": fields["cs_tactics"],
            "crowdstrike_tactics_ids": fields["cs_tactics_ids"],
            "crowdstrike_techniques": fields["cs_techniques"],
            "crowdstrike_techniques_ids": fields["cs_techniques_ids"],
            "crowdstrike_severity": fields["cs_severity"],  
            "crowdstrike_event_name": fields["cs_event_name"],
            "crowdstrike_event_objective": fields["cs_event_objective"],
            "suricata_classification": fields["suricata_classification"],
            "timestamp": parsed_ts
        }
        record_batch.append(record)
    
    try:
        inserted, updated = _bulk_upsert_records(db, record_batch)
        return {
            "status": "success",
            "total_processed": len(record_batch),
            "inserted": inserted,
            "updated": updated
        }
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error: {e}")
        return {"status": "error", "message": "Integrity error inserting records"}
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error: {e}")
        return {"status": "error", "message": str(e)}


def get_rtarf_event(db: Session, event_id: str):
    """
    ดึงข้อมูล RTARF Event ด้วย id ของ Event not event_id
    """
    return db.query(models.RtarfEvent).filter(models.RtarfEvent.id == event_id).first()


def get_rtarf_events(db: Session, skip: int = 0, limit: int = 100, severity: Optional[str] = None):
    query = db.query(models.RtarfEvent)
    
    if severity:
        query = query.filter(models.RtarfEvent.severity == severity)
    
    return query.order_by(desc(models.RtarfEvent.timestamp)).offset(skip).limit(limit).all()


def create_rtarf_event(db: Session, event: schemas.RtarfEventCreate):
    """
    สร้าง RTARF Event ใหม่
    """
    db_event = models.RtarfEvent(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def get_event(db: Session, event_id: str):
    """Alias for get_rtarf_event"""
    return get_rtarf_event(db, event_id)


def get_events(db: Session, skip: int = 0, limit: int = 100, severity: Optional[str] = None):
    """ดึง events พร้อม filter severity"""
    query = db.query(models.RtarfEvent)
    
    if severity:
        query = query.filter(models.RtarfEvent.severity == severity)
    
    return query.order_by(desc(models.RtarfEvent.timestamp)).offset(skip).limit(limit).all()


def get_events_by_node(db: Session, node_id: int, skip: int = 0, limit: int = 10):
    """ดึง events ของโหนดเฉพาะ"""
    return db.query(models.RtarfEvent).filter(
        or_(
            models.RtarfEvent.source_node_id == node_id,
            models.RtarfEvent.destination_node_id == node_id
        )
    ).order_by(desc(models.RtarfEvent.timestamp)).offset(skip).limit(limit).all()


def get_events_by_ip(db: Session, ip_address: str, skip: int = 0, limit: int = 10):
    """ดึง events จาก IP"""
    return db.query(models.RtarfEvent).filter(
        or_(
            models.RtarfEvent.source_ip == ip_address,
            models.RtarfEvent.destination_ip == ip_address
        )
    ).order_by(desc(models.RtarfEvent.timestamp)).offset(skip).limit(limit).all()


def create_event(db: Session, event: schemas.RtarfEventCreate):
    """Alias for create_rtarf_event"""
    return create_rtarf_event(db, event)


def delete_event(db: Session, event_id: str):
    """ลบ event"""
    db_event = get_rtarf_event(db, event_id)
    if db_event is None:
        return False
    
    db.delete(db_event)
    db.commit()
    return True

# ===============================================================
# CRUD Functions for Alert
# ===============================================================

async def get_all_event_and_insert_into_alert(db: Session, es=None):
    """
    Fetch all RtarfEvent records and insert them into Alert table.
    """
    events = db.query(models.RtarfEvent).all()
    inserted_alerts = []

    for event in events:
        # Skip duplicates
        existing = db.query(models.Alert).filter(models.Alert.event_id == event.event_id).first()
        if existing:
            continue

        # Determine alert name
        alert_name = (
            event.crowdstrike_event_name
            or (event.alert_categories[0] if event.alert_categories else None)
            or event.crowdstrike_event_objective
            or event.suricata_classification
            or "Unknown Alert"
        )
        
        if event.alert_categories:
            source_name = "palo-xsiam"
        elif event.crowdstrike_event_objective:
            source_name = "crowdstrike"
        elif event.suricata_classification:
            source_name = "suricata"
        else:
            source_name = "Unknown"
        
        # Determine severity
        severity = event.severity or event.crowdstrike_severity or "Unknown"
        
        incident_id = event.incident_id or "none"
        
        description= event.description or "none"
        
        status = event.status or "pending"

        alert = models.Alert(
            event_id=event.event_id,
            alert_name=alert_name,
            severity=severity,
            incident_id=incident_id,
            description=description,
            status=status,
            source=source_name,
            timestamp=datetime.utcnow()
        )
        db.add(alert)
        inserted_alerts.append(alert)

    db.commit()
    return inserted_alerts

def alert_summary(db: Session):
    
    total_alerts = db.query(func.count(models.Alert.id)).scalar()
    
    alert_counts = (
        db.query(models.Alert.alert_name, func.count(models.Alert.alert_name).label("count"))
        .group_by(models.Alert.alert_name)
        .order_by(func.count(models.Alert.alert_name).desc())
        .all()
    )
    
    summary = [{"alert_name": name, "count": count} for name, count in alert_counts]
    
    return {
        "total_alerts": total_alerts,
        "alert_summarys": summary
    }
    
    
def get_alert(db: Session, alert_id: int):
    """
    ดึงข้อมูล Alert ด้วย alert_id
    """
    return db.query(models.Alert).filter(models.Alert.id == alert_id).first()


def get_alert_by_event_id(db: Session, event_id: str):
    """
    ดึงข้อมูล Alert ด้วย event_id
    """
    return db.query(models.Alert).filter(models.Alert.event_id == event_id).first()


def get_alerts(db: Session, skip: int = 0, limit: int = 100, 
               severity: Optional[str] = None,
               source: Optional[str] = None):
    query = db.query(models.Alert)
    
    if severity:
        query = query.filter(models.Alert.severity == severity)
    
    if source:
        query = query.filter(models.Alert.source == source)
    
    return query.order_by(desc(models.Alert.timestamp)).offset(skip).limit(limit).all()


def get_latest_alerts(db: Session, limit: int = 10):
    """
    ดึงข้อมูล Alerts ล่าสุด (default 10 รายการ)
    """
    return db.query(models.Alert).order_by(models.Alert.timestamp.desc()).limit(limit).all()


def create_alert(db: Session, alert: schemas.AlertCreate):
    """
    สร้าง Alert ใหม่
    """
    db_alert = models.Alert(**alert.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert


def delete_alert(db: Session, alert_id: int):
    """
    ลบ Alert ออกจากฐานข้อมูล
    """
    db_alert = get_alert(db, alert_id)
    if db_alert is None:
        return False
    
    db.delete(db_alert)
    db.commit()
    return True

# NEW

def get_latest_alerts_by_node(db: Session, node_id: int, limit: int = 10):
    """ดึง alerts ล่าสุดของโหนด"""
    return db.query(models.Alert).filter(
        models.Alert.affected_node_id == node_id
    ).order_by(desc(models.Alert.timestamp)).limit(limit).all()


def get_latest_alerts_by_ip(db: Session, ip_address: str, limit: int = 10):
    """ดึง alerts จาก IP"""
    return db.query(models.Alert).filter(
        or_(
            models.Alert.source_ip == ip_address,
            models.Alert.destination_ip == ip_address
        )
    ).order_by(desc(models.Alert.timestamp)).limit(limit).all()


def delete_old_alerts(db: Session, days: int = 30):
    """ลบ alerts เก่า"""
    from datetime import timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    deleted_count = db.query(models.Alert).filter(
        models.Alert.timestamp < cutoff_date
    ).delete()
    
    db.commit()
    return deleted_count

# ===============================================================
# CRUD Functions for NodeEvent
# ===============================================================

def get_node_event(db: Session, node_event_id: int):
    """
    ดึงข้อมูล NodeEvent 1 รายการจาก ID
    """
    return db.query(models.NodeEvent).filter(models.NodeEvent.id == node_event_id).first()


def get_node_event_by_ids(db: Session, node_id: int, rtarf_event_id: int):
    """
    ดึงข้อมูล NodeEvent จาก node_id และ rtarf_event_id
    """
    return db.query(models.NodeEvent).filter(
        and_(
            models.NodeEvent.node_id == node_id,
            models.NodeEvent.rtarf_event_id == rtarf_event_id
        )
    ).first()


def get_node_events(db: Session, skip: int = 0, limit: int = 100):
    """
    ดึงข้อมูล NodeEvent ทั้งหมด พร้อม pagination
    """
    return db.query(models.NodeEvent).order_by(
        desc(models.NodeEvent.detected_at)
    ).offset(skip).limit(limit).all()


def get_events_by_node(
    db: Session, 
    node_id: int, 
    skip: int = 0, 
    limit: int = 100,
    node_role: Optional[str] = None
):
    """
    ดึง RtarfEvents ทั้งหมดที่เกี่ยวข้องกับ Node นั้น ๆ
    """
    query = db.query(models.NodeEvent).filter(models.NodeEvent.node_id == node_id)
    
    if node_role:
        query = query.filter(models.NodeEvent.node_role == node_role)
    
    return query.order_by(desc(models.NodeEvent.detected_at)).offset(skip).limit(limit).all()


def get_events_by_node_ip(
    db: Session, 
    ip_address: str, 
    skip: int = 0, 
    limit: int = 100
):
    """
    ดึง Events จาก IP address
    """
    return db.query(models.NodeEvent).filter(
        models.NodeEvent.node_ip == ip_address
    ).order_by(desc(models.NodeEvent.detected_at)).offset(skip).limit(limit).all()


def get_nodes_by_event(
    db: Session, 
    rtarf_event_id: int, 
    skip: int = 0, 
    limit: int = 100,
    node_role: Optional[str] = None
):
    """
    ดึง Nodes ทั้งหมดที่เกี่ยวข้องกับ RtarfEvent นั้น ๆ
    """
    query = db.query(models.NodeEvent).filter(models.NodeEvent.rtarf_event_id == rtarf_event_id)
    
    if node_role:
        query = query.filter(models.NodeEvent.node_role == node_role)
    
    return query.order_by(desc(models.NodeEvent.detected_at)).offset(skip).limit(limit).all()


def create_node_event(db: Session, node_event: schemas.NodeEventCreate):
    """
    สร้าง NodeEvent ใหม่
    """
    try:
        db_node_event = models.NodeEvent(
            node_id=node_event.node_id,
            rtarf_event_id=node_event.rtarf_event_id,
            node_role=node_event.node_role,
            node_ip=node_event.node_ip,
            relevance_score=node_event.relevance_score or 100,
            involvement_metadata=node_event.involvement_metadata or {}
        )
        
        db.add(db_node_event)
        db.commit()
        db.refresh(db_node_event)
        
        return db_node_event
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error creating NodeEvent: {e}")
        # Return existing if duplicate
        return get_node_event_by_ids(db, node_event.node_id, node_event.rtarf_event_id)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating NodeEvent: {e}")
        raise


def create_node_events_bulk(db: Session, node_events: List[schemas.NodeEventCreate]):
    """
    สร้าง NodeEvent หลายรายการพร้อมกัน (bulk insert)
    """
    records = []
    for ne in node_events:
        records.append({
            "node_id": ne.node_id,
            "rtarf_event_id": ne.rtarf_event_id,
            "node_role": ne.node_role,
            "node_ip": ne.node_ip,
            "relevance_score": ne.relevance_score or 100,
            "involvement_metadata": ne.involvement_metadata or {}
        })
    
    if not records:
        return 0, 0
    
    try:
        stmt = insert(models.NodeEvent).values(records)
        
        # Update on conflict (if needed)
        update_dict = {
            'node_role': stmt.excluded.node_role,
            'relevance_score': stmt.excluded.relevance_score,
            'involvement_metadata': stmt.excluded.involvement_metadata,
            'detected_at': func.now()
        }
        
        stmt = stmt.on_conflict_do_update(
            index_elements=['node_id', 'rtarf_event_id'],
            set_=update_dict
        )
        
        result = db.execute(stmt)
        db.commit()
        
        return len(records), 0
        
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk insert failed: {e}")
        raise


def update_node_event(db: Session, node_event_id: int, node_event: schemas.NodeEventUpdate):
    """
    อัพเดท NodeEvent
    """
    db_node_event = get_node_event(db, node_event_id)
    if db_node_event is None:
        return None
    
    update_data = node_event.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_node_event, field, value)
    
    db.commit()
    db.refresh(db_node_event)
    
    return db_node_event


def delete_node_event(db: Session, node_event_id: int):
    """
    ลบ NodeEvent
    """
    db_node_event = get_node_event(db, node_event_id)
    if db_node_event is None:
        return False
    
    db.delete(db_node_event)
    db.commit()
    return True


def delete_node_events_by_node(db: Session, node_id: int):
    """
    ลบ NodeEvent ทั้งหมดของ Node นั้น ๆ
    """
    deleted_count = db.query(models.NodeEvent).filter(
        models.NodeEvent.node_id == node_id
    ).delete()
    
    db.commit()
    return deleted_count


def delete_node_events_by_event(db: Session, rtarf_event_id: int):
    """
    ลบ NodeEvent ทั้งหมดของ RtarfEvent นั้น ๆ
    """
    deleted_count = db.query(models.NodeEvent).filter(
        models.NodeEvent.rtarf_event_id == rtarf_event_id
    ).delete()
    
    db.commit()
    return deleted_count


# ===============================================================
# Helper Functions
# ===============================================================

def link_event_to_nodes_by_ip(db: Session, rtarf_event_id: int, source_ip: Optional[str] = None, 
                               destination_ip: Optional[str] = None):
    """
    เชื่อมโยง RtarfEvent กับ Nodes โดยอัตโนมัติจาก IP addresses
    """
    created_links = []
    
    # Link source node
    if source_ip:
        source_node = db.query(models.NodePosition).filter(
            models.NodePosition.ip_address == source_ip
        ).first()
        
        if source_node:
            try:
                link = create_node_event(db, schemas.NodeEventCreate(
                    node_id=source_node.id,
                    rtarf_event_id=rtarf_event_id,
                    node_role="source",
                    node_ip=source_ip
                ))
                if link:
                    created_links.append(link)
            except Exception as e:
                logger.warning(f"Failed to link source node: {e}")
    
    # Link destination node
    if destination_ip:
        dest_node = db.query(models.NodePosition).filter(
            models.NodePosition.ip_address == destination_ip
        ).first()
        
        if dest_node:
            try:
                link = create_node_event(db, schemas.NodeEventCreate(
                    node_id=dest_node.id,
                    rtarf_event_id=rtarf_event_id,
                    node_role="destination",
                    node_ip=destination_ip
                ))
                if link:
                    created_links.append(link)
            except Exception as e:
                logger.warning(f"Failed to link destination node: {e}")
    
    return created_links


def get_node_event_summary(db: Session, node_id: int) -> Dict:
    """
    สร้างสรุปข้อมูล RtarfEvents ของ Node
    """
    # Get total events
    total = db.query(func.count(models.NodeEvent.id)).filter(
        models.NodeEvent.node_id == node_id
    ).scalar()
    
    # Events by role
    role_stats = db.query(
        models.NodeEvent.node_role,
        func.count(models.NodeEvent.id)
    ).filter(
        models.NodeEvent.node_id == node_id
    ).group_by(models.NodeEvent.node_role).all()
    
    # Events by severity (join with RtarfEvent)
    severity_stats = db.query(
        models.RtarfEvent.severity,
        func.count(models.NodeEvent.id)
    ).join(
        models.NodeEvent, models.NodeEvent.rtarf_event_id == models.RtarfEvent.id
    ).filter(
        models.NodeEvent.node_id == node_id
    ).group_by(models.RtarfEvent.severity).all()
    
    # Latest event
    latest = db.query(models.NodeEvent).filter(
        models.NodeEvent.node_id == node_id
    ).order_by(desc(models.NodeEvent.detected_at)).first()
    
    return {
        "total_events": total,
        "events_by_role": {role: count for role, count in role_stats},
        "events_by_severity": {sev: count for sev, count in severity_stats},
        "latest_event_time": latest.detected_at if latest else None
    }


def get_event_nodes_summary(db: Session, rtarf_event_id: int) -> Dict:
    """
    สร้างสรุปข้อมูล Nodes ที่เกี่ยวข้องกับ RtarfEvent
    """
    # Get total nodes
    total = db.query(func.count(models.NodeEvent.id)).filter(
        models.NodeEvent.rtarf_event_id == rtarf_event_id
    ).scalar()
    
    # Nodes by role
    role_stats = db.query(
        models.NodeEvent.node_role,
        func.count(models.NodeEvent.id)
    ).filter(
        models.NodeEvent.rtarf_event_id == rtarf_event_id
    ).group_by(models.NodeEvent.node_role).all()
    
    # Get affected IPs
    ips = db.query(models.NodeEvent.node_ip).filter(
        models.NodeEvent.rtarf_event_id == rtarf_event_id,
        models.NodeEvent.node_ip.isnot(None)
    ).distinct().all()
    
    return {
        "total_nodes": total,
        "nodes_by_role": {role: count for role, count in role_stats},
        "affected_ips": [ip[0] for ip in ips if ip[0]]
    }


def sync_events_with_nodes(db: Session, batch_size: int = 100):
    """
    ซิงค์ RtarfEvents กับ Nodes โดยอัตโนมัติ
    สร้างลิงก์สำหรับ events ที่ยังไม่ได้เชื่อมกับ nodes
    """
    # Get events that might not be linked yet
    events = db.query(models.RtarfEvent).limit(batch_size).all()
    
    total_links_created = 0
    
    for event in events:
        links = link_event_to_nodes_by_ip(
            db, 
            event.id, 
            event.source_ip, 
            event.destination_ip
        )
        total_links_created += len(links)
    
    return {
        "status": "success",
        "events_processed": len(events),
        "links_created": total_links_created
    }