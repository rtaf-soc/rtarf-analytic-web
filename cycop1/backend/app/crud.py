# app/crud.py
from datetime import datetime, timedelta
import math
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point
from . import elastic_client as es
from dateutil import parser as dateparser
import logging
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert
from typing import Dict, List, Optional, Tuple
from sqlalchemy.dialects.postgresql import insert as pg_insert

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


def get_nodes_by_map_scope(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    map_scope: Optional[str] = None
):
    """
    ดึงข้อมูลโหนดจากฐานข้อมูลตาม map_scope พร้อม pagination
    หาก map_scope เป็น None จะดึงทุก map_scope
    """
    query = db.query(models.NodePosition)
    
    if map_scope:
        query = query.filter(models.NodePosition.map_scope == map_scope)
    
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
        map_scope=node.map_scope,
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
# CRUD Functions for NodePositionBK (Bangkok)
# ===============================================================

def get_node_bangkok(db: Session, node_id: int):
    """
    ดึงข้อมูลโหนด Bangkok 1 รายการจาก node_positionsBK ด้วย ID
    """
    return db.query(models.NodePositionBK).filter(models.NodePositionBK.id == node_id).first()


def get_node_by_ip_bangkok(db: Session, ip_address: str):
    """
    ดึงข้อมูลโหนด Bangkok จาก IP address
    """
    return db.query(models.NodePositionBK).filter(models.NodePositionBK.ip_address == ip_address).first()


def get_nodes_bangkok(db: Session, skip: int = 0, limit: int = 100, node_type: Optional[str] = None):
    """
    ดึงข้อมูลโหนด Bangkok ทั้งหมด (node_positionsBK) พร้อม pagination
    """
    query = db.query(models.NodePositionBK)

    if node_type:
        query = query.filter(models.NodePositionBK.node_type == node_type)

    return query.offset(skip).limit(limit).all()


def create_node_bangkok(db: Session, node: schemas.NodeCreate):
    """
    สร้างโหนด Bangkok ใหม่ในตาราง node_positionsBK
    """
    point = Point(node.longitude, node.latitude)
    wkb_point = from_shape(point, srid=4326)

    db_node = models.NodePositionBK(
        name=node.name,
        description=node.description,
        node_type=node.node_type,
        map_scope="bangkok",
        ip_address=node.ip_address,
        additional_ips=node.additional_ips or [],
        network_metadata=node.network_metadata or {},
        location=wkb_point
    )

    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node


def update_node_bangkok(db: Session, node_id: int, node: schemas.NodeUpdate):
    """
    อัพเดทข้อมูลโหนด Bangkok ที่มีอยู่
    """
    db_node = get_node_bangkok(db, node_id)
    if db_node is None:
        return None

    update_data = node.dict(exclude_unset=True)

    for field, value in update_data.items():
        if field in ("latitude", "longitude"):
            continue
        setattr(db_node, field, value)

    # อัพเดท location ถ้ามี lat/lng ใหม่
    if "latitude" in update_data and "longitude" in update_data:
        point = Point(update_data["longitude"], update_data["latitude"])
        db_node.location = from_shape(point, srid=4326)

    db_node.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_node)
    return db_node


def delete_node_bangkok(db: Session, node_id: int):
    """
    ลบโหนด Bangkok ออกจากตาราง node_positionsBK
    """
    db_node = get_node_bangkok(db, node_id)
    if db_node is None:
        return False

    db.delete(db_node)
    db.commit()
    return True


def search_nodes_by_area_bangkok(db: Session, min_lat: float, min_lng: float, max_lat: float, max_lng: float):
    """
    ค้นหาโหนด Bangkok ในพื้นที่สี่เหลี่ยม (bounding box) จากตาราง node_positionsBK
    """
    from geoalchemy2 import functions as geo_func

    polygon_wkt = (
        f'POLYGON(({min_lng} {min_lat}, {max_lng} {min_lat}, '
        f'{max_lng} {max_lat}, {min_lng} {max_lat}, {min_lng} {min_lat}))'
    )

    return db.query(models.NodePositionBK).filter(
        geo_func.ST_Within(models.NodePositionBK.location, geo_func.ST_GeomFromText(polygon_wkt, 4326))
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
    
# {"exists": {"field": "suricata.classification"}},
# {"exists": {"field": "crowdstrike.event.MitreAttack.Tactic"}},

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
    
async def insert_rtarf_event_into_postgres(db: Session, es_client, last_sync_time=None, batch_size=250):
    """
    Fetch events from Elasticsearch using Scroll API and insert into PostgreSQL
    Handles unlimited records by scrolling through all results
    
    Args:
        db: Database session
        es_client: Elasticsearch client
        last_sync_time: DateTime of last successful sync (optional)
        batch_size: Number of records per scroll batch (default 250)
    
    Returns:
        Summary of the operation with latest_timestamp for next sync
    """
    query = {
        "query": {
            "bool": {
                "should": [
                    {"exists": {"field": "palo-xsiam.mitre_tactics_ids_and_names"}},
                ],
                "minimum_should_match": 1
            }
        },
        "sort": [{"@timestamp": {"order": "asc"}}]
    }
    
    # Add time filter if last_sync_time is provided
    if last_sync_time:
        if not query["query"]["bool"].get("filter"):
            query["query"]["bool"]["filter"] = []
        
        # Convert datetime to ISO format string if needed
        if isinstance(last_sync_time, datetime):
            time_str = last_sync_time.isoformat()
        else:
            time_str = last_sync_time
            
        query["query"]["bool"]["filter"].append({
            "range": {
                "@timestamp": {
                    "gt": time_str  # Greater than last sync time
                }
            }
        })
        logger.info(f"🔍 Fetching events after {time_str}")
    else:
        logger.info("🔍 Fetching all events (first sync)")
    
    total_processed = 0
    total_inserted = 0
    total_updated = 0
    latest_timestamp = None
    scroll_id = None
    
    try:
        # Initialize scroll
        resp = await es_client.search(
            index="rtarf-events-beat*",
            body=query,
            size=batch_size,
            scroll='5m'  # Keep scroll context alive for 5 minutes
        )
        
        scroll_id = resp.get('_scroll_id')
        hits = resp['hits']['hits']
        total_hits = resp['hits']['total']['value'] if isinstance(resp['hits']['total'], dict) else resp['hits']['total']
        
        logger.info(f"📊 Total events to process: {total_hits}")
        
        # Process all batches
        batch_number = 0
        while hits:
            batch_number += 1
            record_batch = []
            
            logger.info(f"⚙️ Processing batch {batch_number} ({len(hits)} events)...")
            
            for hit in hits:
                source = hit.get("_source", {})
                es_id = hit.get("_id")
                fields = _extract_fields(source)
                
                ts = source.get("@timestamp") or source.get("timestamp")
                parsed_ts = None
                if ts:
                    try:
                        parsed_ts = dateparser.parse(ts)
                        # Track latest timestamp
                        if parsed_ts:
                            if latest_timestamp is None or parsed_ts > latest_timestamp:
                                latest_timestamp = parsed_ts
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
            
            # Bulk insert this batch
            try:
                inserted, updated = _bulk_upsert_records(db, record_batch)
                total_processed += len(record_batch)
                total_inserted += inserted
                total_updated += updated
                
                logger.info(f"✅ Batch {batch_number} completed: {len(record_batch)} events processed")
                
            except Exception as e:
                logger.error(f"❌ Batch {batch_number} failed: {e}")
                # Continue with next batch even if this one fails
            
            # Get next batch using scroll
            try:
                resp = await es_client.scroll(scroll_id=scroll_id, scroll='5m')
                scroll_id = resp.get('_scroll_id')
                hits = resp['hits']['hits']
            except Exception as e:
                logger.error(f"❌ Scroll failed: {e}")
                break
        
        # Clear scroll context
        if scroll_id:
            try:
                await es_client.clear_scroll(scroll_id=scroll_id)
                logger.info("🧹 Scroll context cleared")
            except Exception as e:
                logger.warning(f"⚠️ Failed to clear scroll: {e}")
        
        logger.info(
            f"🎉 Sync completed: "
            f"Total={total_processed}, "
            f"Inserted={total_inserted}, "
            f"Updated={total_updated}"
        )
        
        return {
            "status": "success",
            "total_processed": total_processed,
            "inserted": total_inserted,
            "updated": total_updated,
            "latest_timestamp": latest_timestamp.isoformat() if latest_timestamp else None,
            "batches_processed": batch_number
        }
        
    except Exception as e:
        # Clear scroll on error
        if scroll_id:
            try:
                await es_client.clear_scroll(scroll_id=scroll_id)
            except:
                pass
        
        db.rollback()
        logger.error(f"❌ Sync failed: {e}", exc_info=True)
        return {
            "status": "error",
            "message": str(e),
            "total_processed": total_processed
        }


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
# SEVERITY MAPPING CONFIGURATIONS
# ===============================================================

PALO_SEVERITY_MAP = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "informational": 1,
    "unknown": 1
}

CROWDSTRIKE_SEVERITY_MAP = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "informational": 1,
    "unknown": 1
}

SEVERITY_LEVEL_TO_DANGER = {
    4: "critical",
    3: "high",
    2: "medium",
    1: "low"
}

# ===============================================================
# CORE HELPER FUNCTIONS
# ===============================================================

def _normalize_severity_value(severity_str, mapping: Dict[str, int]) -> int:
    """
    Normalize severity string to numeric value (1-4)
    Returns 0 if None or invalid
    """
    if severity_str is None or severity_str == "":
        return 0
    
    try:
        severity_lower = str(severity_str).lower().strip()
        return mapping.get(severity_lower, 0)
    except Exception as e:
        logger.warning(f"Error normalizing severity value '{severity_str}': {e}")
        return 0


def calculate_average_severity(
    palo_severity: Optional[str],
    crowdstrike_severity: Optional[str]
) -> Tuple[Optional[int], Optional[str]]:
    """
    Calculate average severity from Palo Alto and CrowdStrike sources
    This is the MAIN function used throughout the codebase
    
    Args:
        palo_severity: Severity from Palo Alto XSIAM
        crowdstrike_severity: Severity from CrowdStrike
        
    Returns:
        Tuple of (severity_level, danger_level)
        - severity_level: Integer from 1-4 or None
        - danger_level: String 'critical', 'high', 'medium', 'low' or None
    """
    try:
        palo_value = _normalize_severity_value(palo_severity, PALO_SEVERITY_MAP)
        cs_value = _normalize_severity_value(crowdstrike_severity, CROWDSTRIKE_SEVERITY_MAP)
        
        # If both are 0/None, return None
        if palo_value == 0 and cs_value == 0:
            return None, None
        
        # If only one source has severity, use that value
        if palo_value == 0:
            severity_level = cs_value
        elif cs_value == 0:
            severity_level = palo_value
        else:
            # Both sources have severity, calculate average and round up
            severity_level = math.ceil((palo_value + cs_value) / 2)
        
        # Ensure severity_level is within bounds
        severity_level = max(1, min(4, severity_level))
        
        danger_level = SEVERITY_LEVEL_TO_DANGER.get(severity_level)
        
        return severity_level, danger_level
        
    except Exception as e:
        logger.warning(f"Error calculating average severity: {e}")
        return None, None


# ===============================================================
# CRUD FUNCTIONS FOR SINGLE EVENT
# ===============================================================

def get_rtarf_event_with_severity(db: Session, event_id: str) -> Optional[Dict]:
    """
    Get single RTARF Event with calculated average severity
    
    Args:
        db: Database session
        event_id: Event ID (database primary key)
        
    Returns:
        Dictionary with event data and calculated severity
    """
    event = db.query(models.RtarfEvent).filter(models.RtarfEvent.id == event_id).first()
    
    if not event:
        return None
    
    severity_level, danger_level = calculate_average_severity(
        event.severity,
        event.crowdstrike_severity
    )
    
    return {
        "id": event.id,
        "event_id": event.event_id,
        "incident_id": event.incident_id,
        "status": event.status,
        "palo_severity": event.severity,
        "crowdstrike_severity": event.crowdstrike_severity,
        "calculated_severity_level": severity_level,
        "calculated_danger_level": danger_level,
        "description": event.description,
        "timestamp": event.timestamp,
        "mitre_tactics": event.mitre_tactics_ids_and_names,
        "mitre_techniques": event.mitre_techniques_ids_and_names,
        "alert_categories": event.alert_categories
    }


def update_event_with_severity(
    db: Session,
    event_id: str,
    palo_severity: Optional[str] = None,
    crowdstrike_severity: Optional[str] = None
) -> Optional[Dict]:
    """
    Update event severity and return recalculated values
    
    Args:
        db: Database session
        event_id: Event ID (database primary key)
        palo_severity: New Palo Alto severity value
        crowdstrike_severity: New CrowdStrike severity value
        
    Returns:
        Updated event with calculated severity
    """
    event = db.query(models.RtarfEvent).filter(models.RtarfEvent.id == event_id).first()
    
    if not event:
        return None
    
    if palo_severity is not None:
        event.severity = palo_severity
    
    if crowdstrike_severity is not None:
        event.crowdstrike_severity = crowdstrike_severity
    
    db.commit()
    db.refresh(event)
    
    return get_rtarf_event_with_severity(db, event_id)


# ===============================================================
# CRUD FUNCTIONS FOR MULTIPLE EVENTS
# ===============================================================

def get_rtarf_events_with_severity(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    severity_level: Optional[int] = None,
    danger_level: Optional[str] = None
) -> list:
    """
    Get RTARF Events with calculated average severity
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        severity_level: Filter by calculated severity level (1-4)
        danger_level: Filter by danger level ('critical', 'high', 'medium', 'low')
        
    Returns:
        List of events with calculated severity
    """
    events = db.query(models.RtarfEvent).order_by(
        desc(models.RtarfEvent.timestamp)
    ).offset(skip).limit(limit).all()
    
    results = []
    
    for event in events:
        calc_severity_level, calc_danger_level = calculate_average_severity(
            event.severity,
            event.crowdstrike_severity
        )
        
        # Apply filters if specified
        if severity_level is not None and calc_severity_level != severity_level:
            continue
        
        if danger_level is not None and calc_danger_level != danger_level:
            continue
        
        results.append({
            "id": event.id,
            "event_id": event.event_id,
            "incident_id": event.incident_id,
            "status": event.status,
            "palo_severity": event.severity,
            "crowdstrike_severity": event.crowdstrike_severity,
            "calculated_severity_level": calc_severity_level,
            "calculated_danger_level": calc_danger_level,
            "description": event.description,
            "timestamp": event.timestamp,
            "crowdstrike_event_name": event.crowdstrike_event_name,
            "suricata_classification": event.suricata_classification
        })
    
    return results


# ===============================================================
# STATISTICS AND ANALYTICS
# ===============================================================

def get_severity_statistics(db: Session) -> Dict:
    """
    Get statistics about severity levels across all events
    Uses calculated average severity from both Palo and CrowdStrike
    
    Returns:
        Dictionary with severity distribution statistics
    """
    events = db.query(models.RtarfEvent).all()
    
    severity_counts = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "unknown": 0
    }
    
    total_events = len(events)
    
    for event in events:
        try:
            _, danger_level = calculate_average_severity(
                event.severity,
                event.crowdstrike_severity
            )
            
            if danger_level:
                severity_counts[danger_level] += 1
            else:
                severity_counts["unknown"] += 1
                
        except Exception as e:
            logger.warning(f"Error processing event {event.id} in statistics: {e}")
            severity_counts["unknown"] += 1
            continue
    
    return {
        "total_events": total_events,
        "severity_distribution": severity_counts,
        "percentages": {
            level: round((count / total_events * 100), 2) if total_events > 0 else 0
            for level, count in severity_counts.items()
        }
    }


def get_overall_average_severity_level(db: Session) -> Dict:
    """
    Calculate the overall average severity level across ALL events
    *** USE THIS FOR DEFCON DISPLAY ***
    
    Returns:
        {
            "average_severity_level": int (1-4),
            "danger_level": str ("critical", "high", "medium", "low"),
            "total_events": int,
            "events_with_severity": int,
            "raw_average": float
        }
    """
    try:
        events = db.query(models.RtarfEvent).all()
        
        logger.info(f"Processing {len(events)} events for overall severity calculation")
        
        if not events:
            return {
                "average_severity_level": 1,
                "danger_level": "low",
                "total_events": 0,
                "events_with_severity": 0,
                "raw_average": 0.0
            }
        
        severity_values = []
        skipped_count = 0
        
        for event in events:
            try:
                palo_sev = getattr(event, 'severity', None)
                cs_sev = getattr(event, 'crowdstrike_severity', None)
                
                severity_level, _ = calculate_average_severity(palo_sev, cs_sev)
                
                if severity_level is not None:
                    severity_values.append(severity_level)
                else:
                    skipped_count += 1
                    
            except Exception as e:
                logger.warning(f"Error processing event {event.id}: {e}")
                skipped_count += 1
                continue
        
        total_events = len(events)
        events_with_severity = len(severity_values)
        
        logger.info(f"Processed: {events_with_severity} events with severity, {skipped_count} skipped")
        
        if not severity_values:
            logger.warning("No events with valid severity found")
            return {
                "average_severity_level": 1,
                "danger_level": "low",
                "total_events": total_events,
                "events_with_severity": 0,
                "raw_average": 0.0
            }
        
        raw_average = sum(severity_values) / len(severity_values)
        average_level = round(raw_average)
        average_level = max(1, min(4, average_level))
        
        danger_level = SEVERITY_LEVEL_TO_DANGER.get(average_level, "low")
        
        logger.info(f"Calculated average severity: {average_level} ({danger_level})")
        
        return {
            "average_severity_level": average_level,
            "danger_level": danger_level,
            "total_events": total_events,
            "events_with_severity": events_with_severity,
            "raw_average": round(raw_average, 2)
        }
        
    except Exception as e:
        logger.error(f"Error calculating overall average severity: {e}", exc_info=True)
        raise


def get_recent_average_severity_level(
    db: Session,
    hours: int = 24
) -> Dict:
    """
    Calculate average severity level for recent events only
    Useful for showing current threat level
    
    Args:
        db: Database session
        hours: Number of hours to look back (default 24)
    
    Returns:
        Same structure as get_overall_average_severity_level
        plus "time_window_hours" field
    """
    from datetime import datetime, timedelta
    
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        events = db.query(models.RtarfEvent).filter(
            models.RtarfEvent.timestamp >= cutoff_time
        ).all()
        
        if not events:
            return {
                "average_severity_level": 1,
                "danger_level": "low",
                "total_events": 0,
                "events_with_severity": 0,
                "raw_average": 0.0,
                "time_window_hours": hours
            }
        
        severity_values = []
        
        for event in events:
            try:
                severity_level, _ = calculate_average_severity(
                    event.severity,
                    event.crowdstrike_severity
                )
                
                if severity_level is not None:
                    severity_values.append(severity_level)
                    
            except Exception as e:
                logger.warning(f"Error processing event {event.id}: {e}")
                continue
        
        total_events = len(events)
        events_with_severity = len(severity_values)
        
        if not severity_values:
            return {
                "average_severity_level": 1,
                "danger_level": "low",
                "total_events": total_events,
                "events_with_severity": 0,
                "raw_average": 0.0,
                "time_window_hours": hours
            }
        
        raw_average = sum(severity_values) / len(severity_values)
        average_level = round(raw_average)
        average_level = max(1, min(4, average_level))
        
        danger_level = SEVERITY_LEVEL_TO_DANGER.get(average_level, "low")
        
        return {
            "average_severity_level": average_level,
            "danger_level": danger_level,
            "total_events": total_events,
            "events_with_severity": events_with_severity,
            "raw_average": round(raw_average, 2),
            "time_window_hours": hours
        }
        
    except Exception as e:
        logger.error(f"Error calculating recent average severity: {e}")
        raise


def get_severity_trend(db: Session, hours: int = 24) -> Dict:
    """
    Get severity trend over time
    Compares current period vs previous period
    
    Args:
        db: Database session
        hours: Length of each comparison period
    
    Returns:
        {
            "current_level": int,
            "previous_level": int,
            "trend": str ("increasing", "decreasing", "stable"),
            "change": int (difference)
        }
    """
    from datetime import datetime, timedelta
    
    try:
        now = datetime.utcnow()
        
        # Current period
        current_start = now - timedelta(hours=hours)
        current_events = db.query(models.RtarfEvent).filter(
            models.RtarfEvent.timestamp >= current_start
        ).all()
        
        # Previous period
        previous_start = now - timedelta(hours=hours * 2)
        previous_end = current_start
        previous_events = db.query(models.RtarfEvent).filter(
            models.RtarfEvent.timestamp >= previous_start,
            models.RtarfEvent.timestamp < previous_end
        ).all()
        
        def calc_avg_level(events):
            if not events:
                return 1
            
            severities = []
            for e in events:
                try:
                    severity_level, _ = calculate_average_severity(
                        e.severity,
                        e.crowdstrike_severity
                    )
                    if severity_level is not None:
                        severities.append(severity_level)
                except Exception as ex:
                    logger.warning(f"Error processing event in trend: {ex}")
                    continue
            
            if not severities:
                return 1
            return round(sum(severities) / len(severities))
        
        current_level = calc_avg_level(current_events)
        previous_level = calc_avg_level(previous_events)
        
        change = current_level - previous_level
        
        if change > 0:
            trend = "increasing"
        elif change < 0:
            trend = "decreasing"
        else:
            trend = "stable"
        
        return {
            "current_level": current_level,
            "previous_level": previous_level,
            "trend": trend,
            "change": change,
            "current_period_events": len(current_events),
            "previous_period_events": len(previous_events)
        }
        
    except Exception as e:
        logger.error(f"Error calculating severity trend: {e}")
        raise
    
# ===============================================================
# CRUD Functions for Alert
# ===============================================================

async def sync_rtarf_events_to_alerts(db: Session, batch_size=500):
    """
    Efficiently sync RtarfEvents to Alerts table using bulk operations.
    Only processes events that don't already have alerts.
    
    Args:
        db: Database session
        batch_size: Number of records to process per batch
    
    Returns:
        Summary of operation
    """
    try:
        # Step 1: Get event_ids that already exist in alerts (FAST query)
        existing_event_ids = set(
            row[0] for row in db.query(models.Alert.event_id).all()
        )
        logger.info(f"📊 Found {len(existing_event_ids)} existing alerts")
        
        # Step 2: Get total count of new events to process
        total_events = db.query(func.count(models.RtarfEvent.event_id)).filter(
            ~models.RtarfEvent.event_id.in_(existing_event_ids) if existing_event_ids else True
        ).scalar()
        
        if total_events == 0:
            logger.info("✅ No new events to sync")
            return {
                "status": "success",
                "total_processed": 0,
                "inserted": 0,
                "message": "No new events to sync"
            }
        
        logger.info(f"🔄 Processing {total_events} new events...")
        
        # Step 3: Process in batches using offset pagination
        total_inserted = 0
        offset = 0
        batch_number = 0
        
        while True:
            batch_number += 1
            
            # Fetch batch of events that don't have alerts yet
            query = db.query(models.RtarfEvent)
            if existing_event_ids:
                query = query.filter(~models.RtarfEvent.event_id.in_(existing_event_ids))
            
            events_batch = query.offset(offset).limit(batch_size).all()
            
            if not events_batch:
                break  # No more events to process
            
            logger.info(f"⚙️ Processing batch {batch_number} ({len(events_batch)} events)...")
            
            # Step 4: Prepare bulk insert data
            alert_records = []
            for event in events_batch:
                # Determine alert name
                alert_name = (
                    event.crowdstrike_event_name
                    or (event.alert_categories[0] if event.alert_categories else None)
                    or event.crowdstrike_event_objective
                    or event.suricata_classification
                    or "Unknown Alert"
                )
                
                # Determine source
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
                
                alert_records.append({
                    "event_id": event.event_id,
                    "alert_name": alert_name,
                    "severity": severity,
                    "incident_id": event.incident_id or "none",
                    "description": event.description or "none",
                    "status": event.status or "pending",
                    "source": source_name,
                    "timestamp": event.timestamp or datetime.utcnow()
                })
            
            # Step 5: Bulk insert this batch
            try:
                if alert_records:
                    db.bulk_insert_mappings(models.Alert, alert_records)
                    db.commit()
                    total_inserted += len(alert_records)
                    logger.info(f"✅ Batch {batch_number} completed: {len(alert_records)} alerts created")
            except Exception as e:
                db.rollback()
                logger.error(f"❌ Batch {batch_number} failed: {e}")
                # Continue with next batch
            
            offset += batch_size
        
        logger.info(f"🎉 Sync completed: {total_inserted} new alerts created")
        
        return {
            "status": "success",
            "total_processed": total_inserted,
            "inserted": total_inserted,
            "batches_processed": batch_number
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Alert sync failed: {e}", exc_info=True)
        return {
            "status": "error",
            "message": str(e)
        }

async def sync_new_rtarf_events_to_alerts(db: Session, last_sync_time=None, batch_size=500):
    """
    Sync only NEW RtarfEvents (created after last_sync_time) to Alerts.
    This is the FASTEST option for scheduled syncing.
    
    Args:
        db: Database session
        last_sync_time: Only process events created after this time
        batch_size: Number of records per batch
    
    Returns:
        Summary with latest timestamp
    """
    try:
        # Build query for new events only
        query = db.query(models.RtarfEvent)
        
        if last_sync_time:
            query = query.filter(models.RtarfEvent.timestamp > last_sync_time)
            logger.info(f"🔍 Syncing events after {last_sync_time}")
        else:
            logger.info("🔍 Syncing all events (first sync)")
        
        # Get total count
        total_events = query.count()
        
        if total_events == 0:
            logger.info("✅ No new events to sync")
            return {
                "status": "success",
                "total_processed": 0,
                "inserted": 0,
                "latest_timestamp": None
            }
        
        logger.info(f"🔄 Processing {total_events} new events...")
        
        # Process in batches
        total_inserted = 0
        offset = 0
        batch_number = 0
        latest_timestamp = None
        
        while True:
            batch_number += 1
            
            events_batch = query.order_by(models.RtarfEvent.timestamp.asc()).offset(offset).limit(batch_size).all()
            
            if not events_batch:
                break
            
            logger.info(f"⚙️ Processing batch {batch_number} ({len(events_batch)} events)...")
            
            alert_records = []
            for event in events_batch:
                # Track latest timestamp
                if event.timestamp:
                    if latest_timestamp is None or event.timestamp > latest_timestamp:
                        latest_timestamp = event.timestamp
                
                # Prepare alert record
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
                
                severity = event.severity or event.crowdstrike_severity or "Unknown"
                
                alert_records.append({
                    "event_id": event.event_id,
                    "alert_name": alert_name,
                    "severity": severity,
                    "incident_id": event.incident_id or "none",
                    "description": event.description or "none",
                    "status": event.status or "pending",
                    "source": source_name,
                    "timestamp": event.timestamp or datetime.utcnow()
                })
            
            # Bulk insert with ON CONFLICT DO NOTHING (skip duplicates automatically)
            try:
                if alert_records:
                    stmt = pg_insert(models.Alert).values(alert_records)
                    stmt = stmt.on_conflict_do_nothing(index_elements=['event_id'])
                    db.execute(stmt)
                    db.commit()
                    total_inserted += len(alert_records)
                    logger.info(f"✅ Batch {batch_number} completed")
            except Exception as e:
                db.rollback()
                logger.error(f"❌ Batch {batch_number} failed: {e}")
            
            offset += batch_size
        
        logger.info(f"🎉 Alert sync completed: {total_inserted} alerts created")
        
        return {
            "status": "success",
            "total_processed": total_inserted,
            "inserted": total_inserted,
            "batches_processed": batch_number,
            "latest_timestamp": latest_timestamp.isoformat() if latest_timestamp else None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Alert sync failed: {e}", exc_info=True)
        return {
            "status": "error",
            "message": str(e)
        }

def alert_summary(db: Session):
    """
    Get alert statistics - OPTIMIZED VERSION
    """
    # Single query to get total
    total_alerts = db.query(func.count(models.Alert.id)).scalar()
    
    # Single query to get counts by name
    alert_counts = (
        db.query(
            models.Alert.alert_name,
            func.count(models.Alert.alert_name).label("count")
        )
        .group_by(models.Alert.alert_name)
        .order_by(func.count(models.Alert.alert_name).desc())
        .limit(50)  # Top 50 alerts only for performance
        .all()
    )
    
    summary = [{"alert_name": name, "count": count} for name, count in alert_counts]
    
    return {
        "total_alerts": total_alerts,
        "alert_summaries": summary
    }

def get_alert_statistics(db: Session):
    """
    Get comprehensive alert statistics
    """
    # Total alerts
    total = db.query(func.count(models.Alert.id)).scalar()
    
    # By severity
    by_severity = (
        db.query(
            models.Alert.severity,
            func.count(models.Alert.id).label("count")
        )
        .group_by(models.Alert.severity)
        .all()
    )
    
    # By status
    by_status = (
        db.query(
            models.Alert.status,
            func.count(models.Alert.id).label("count")
        )
        .group_by(models.Alert.status)
        .all()
    )
    
    # By source
    by_source = (
        db.query(
            models.Alert.source,
            func.count(models.Alert.id).label("count")
        )
        .group_by(models.Alert.source)
        .all()
    )
    
    # Recent alerts (last 24 hours)
    last_24h = datetime.utcnow() - timedelta(hours=24)
    recent_count = db.query(func.count(models.Alert.id)).filter(
        models.Alert.timestamp >= last_24h
    ).scalar()
    
    return {
        "total_alerts": total,
        "recent_24h": recent_count,
        "by_severity": [{"severity": s, "count": c} for s, c in by_severity],
        "by_status": [{"status": s, "count": c} for s, c in by_status],
        "by_source": [{"source": s, "count": c} for s, c in by_source]
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
# Node Helper Functions
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
