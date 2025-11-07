# app/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from . import database, models, crud, schemas


# สร้างตารางในฐานข้อมูล
models.Base.metadata.create_all(bind=database.engine)

# สร้าง FastAPI instance
app = FastAPI(
    title="Interactive Map & RTARF API",
    description="API สำหรับจัดการข้อมูลโหนดบนแผนที่และ RTARF Events",
    version="1.0.0"
)


# Dependency Injection
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===============================================================
# API Endpoints for Nodes
# ===============================================================

@app.post("/nodes/", 
          response_model=schemas.Node, 
          status_code=status.HTTP_201_CREATED,
          tags=["Nodes"])
def create_new_node(node: schemas.NodeCreate, db: Session = Depends(get_db)):
    """
    สร้างโหนดใหม่ในระบบ

    - **name**: ชื่อของโหนด (required)
    - **description**: คำอธิบาย (optional)
    - **node_type**: ประเภทของโหนด (required)
    - **latitude**: พิกัดละติจูด (required)
    - **longitude**: พิกัดลองจิจูด (required)
    """
    db_node = crud.create_node(db=db, node=node)
    # แปลง geometry เป็น lat/lon ก่อนส่งกลับ
    return schemas.Node.from_orm_with_location(db_node)


@app.get("/nodes/", 
         response_model=List[schemas.Node],
         tags=["Nodes"])
def read_all_nodes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    ดึงข้อมูลโหนดทั้งหมด พร้อมระบบแบ่งหน้า (pagination)
    """
    nodes = crud.get_nodes(db, skip=skip, limit=limit)
    # แปลงแต่ละ node
    return [schemas.Node.from_orm_with_location(node) for node in nodes]


@app.get("/nodes/{node_id}", 
         response_model=schemas.Node,
         tags=["Nodes"])
def read_single_node(node_id: int, db: Session = Depends(get_db)):
    """
    ดึงข้อมูลโหนดเดียวด้วย ID
    """
    db_node = crud.get_node(db, node_id=node_id)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Node with ID {node_id} not found"
        )
    return schemas.Node.from_orm_with_location(db_node)


@app.put("/nodes/{node_id}",
         response_model=schemas.Node,
         tags=["Nodes"])
def update_existing_node(node_id: int, node: schemas.NodeCreate, db: Session = Depends(get_db)):
    """
    อัพเดทข้อมูลโหนดที่มีอยู่
    """
    db_node = crud.update_node(db, node_id=node_id, node=node)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    return schemas.Node.from_orm_with_location(db_node)


@app.delete("/nodes/{node_id}",
            status_code=status.HTTP_204_NO_CONTENT,
            tags=["Nodes"])
def delete_existing_node(node_id: int, db: Session = Depends(get_db)):
    """
    ลบโหนดออกจากระบบ
    """
    success = crud.delete_node(db, node_id=node_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    return None


# ===============================================================
# API Endpoints for RTARF Events
# ===============================================================

@app.post("/rtarf-events/",
          response_model=schemas.RtarfEvent,
          status_code=status.HTTP_201_CREATED,
          tags=["RTARF Events"])
def create_new_rtarf_event(event: schemas.RtarfEventCreate, db: Session = Depends(get_db)):
    """
    สร้าง RTARF Event ใหม่
    """
    # ตรวจสอบว่า event_id ซ้ำหรือไม่
    existing = crud.get_rtarf_event(db, event_id=event.event_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event with event_id '{event.event_id}' already exists"
        )
    return crud.create_rtarf_event(db=db, event=event)


@app.get("/rtarf-events/",
         response_model=List[schemas.RtarfEvent],
         tags=["RTARF Events"])
def read_all_rtarf_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    ดึงข้อมูล RTARF Events ทั้งหมด
    """
    return crud.get_rtarf_events(db, skip=skip, limit=limit)


@app.get("/rtarf-events/{event_id}",
         response_model=schemas.RtarfEvent,
         tags=["RTARF Events"])
def read_single_rtarf_event(event_id: str, db: Session = Depends(get_db)):
    """
    ดึงข้อมูล RTARF Event เดียวด้วย event_id
    """
    db_event = crud.get_rtarf_event(db, event_id=event_id)
    if db_event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with event_id '{event_id}' not found"
        )
    return db_event


# ===============================================================
# Health Check
# ===============================================================

@app.get("/health", tags=["Health"])
def health_check():
    """
    ตรวจสอบสถานะของ API
    """
    return {"status": "healthy", "message": "API is running"}