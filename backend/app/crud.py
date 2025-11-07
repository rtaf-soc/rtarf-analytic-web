# app/crud.py
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

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