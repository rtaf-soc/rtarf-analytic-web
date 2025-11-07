# app/crud.py
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from . import elastic_client as es
from dateutil import parser as dateparser
import logging
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert

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


def get_nodes(db: Session, skip: int = 0, limit: int = 100):
    """
    ดึงข้อมูลโหนดทั้งหมดจากฐานข้อมูล พร้อมการแบ่งหน้า (pagination)
    """
    return db.query(models.NodePosition).offset(skip).limit(limit).all()


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
        location=wkb_point  # ใส่ค่า WKBElement
    )
    
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    
    return db_node


def update_node(db: Session, node_id: int, node: schemas.NodeCreate):
    """
    อัพเดทข้อมูลโหนดที่มีอยู่
    """
    db_node = get_node(db, node_id)
    if db_node is None:
        return None
    
    # อัพเดทข้อมูล
    db_node.name = node.name
    db_node.description = node.description
    db_node.node_type = node.node_type
    
    # อัพเดทพิกัด
    point = Point(node.longitude, node.latitude)
    db_node.location = from_shape(point, srid=4326)
    
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


# ===============================================================
# CRUD Functions for RtarfEvent
# ===============================================================

logger = logging.getLogger(__name__)

def _extract_fields(source):
    """Extract and normalize fields from Elasticsearch document"""
    # --- Palo-XSIAM ---
    palo = source.get("palo-xsiam") or source
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
        # Use PostgreSQL's INSERT ... ON CONFLICT for upsert
        stmt = insert(models.RtarfEvent).values(records)
        
        # Define what to do on conflict (when event_id already exists)
        update_dict = {
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
                    {"exists": {"field": "crowdstrike.event.MitreAttack.Tactic"}},
                    {"exists": {"field": "suricata.classification"}}
                ],
                "minimum_should_match": 1
            }
        }
    }
    
    try:
        resp = await es_client.search(index="rtarf-events-beat*", body=query, size=100)
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
    ดึงข้อมูล RTARF Event ด้วย event_id
    """
    return db.query(models.RtarfEvent).filter(models.RtarfEvent.event_id == event_id).first()


def get_rtarf_events(db: Session, skip: int = 0, limit: int = 100):
    """
    ดึงข้อมูล RTARF Events ทั้งหมด
    """
    return db.query(models.RtarfEvent).offset(skip).limit(limit).all()


def create_rtarf_event(db: Session, event: schemas.RtarfEventCreate):
    """
    สร้าง RTARF Event ใหม่
    """
    db_event = models.RtarfEvent(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

# ===============================================================
# CRUD Functions for Alert
# ===============================================================

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


def get_alerts(db: Session, skip: int = 0, limit: int = 100):
    """
    ดึงข้อมูล Alerts ทั้งหมด เรียงตาม timestamp ล่าสุด
    """
    return db.query(models.Alert).order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()


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