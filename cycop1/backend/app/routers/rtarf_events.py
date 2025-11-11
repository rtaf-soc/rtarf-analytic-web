# app/routers/rtarf_events.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, schemas, database, elastic_client

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/",
          response_model=schemas.RtarfEvent,
          status_code=status.HTTP_201_CREATED)
def create_new_rtarf_event(event: schemas.RtarfEventCreate, db: Session = Depends(get_db)):
    """
    สร้าง RTARF Event ใหม่
    """
    existing = crud.get_event(db, event_id=event.event_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Event with event_id '{event.event_id}' already exists"
        )
    return crud.create_event(db=db, event=event)

@router.get("/", response_model=List[schemas.RtarfEvent])
def read_all_rtarf_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูล RTARF Events ทั้งหมด
    """
    return crud.get_events(db, skip=skip, limit=limit, severity=severity)

@router.get("/{event_id}", response_model=schemas.RtarfEvent)
def read_single_rtarf_event(event_id: str, db: Session = Depends(get_db)):
    """
    ดึงข้อมูล RTARF Event เดียวด้วย event_id
    """
    db_event = crud.get_event(db, event_id=event_id)
    if db_event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with event_id '{event_id}' not found"
        )
    return db_event

@router.get("/node/{node_id}", response_model=List[schemas.RtarfEvent])
def read_events_by_node(
    node_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    ดึง events ที่เกี่ยวข้องกับโหนดเฉพาะ
    """
    return crud.get_events_by_node(db, node_id=node_id, skip=skip, limit=limit)

@router.get("/ip/{ip_address}", response_model=List[schemas.RtarfEvent])
def read_events_by_ip(
    ip_address: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    ดึง events จาก IP address
    """
    return crud.get_events_by_ip(db, ip_address=ip_address, skip=skip, limit=limit)

@router.post("/sync-from-elasticsearch", response_model=schemas.SyncResponse)
async def query_rtarf_event(db: Session = Depends(get_db)):
    """
    Sync RTARF events from Elasticsearch to PostgreSQL
    """
    try:
        result = await crud.insert_rtarf_event_into_postgres(db, elastic_client.es)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync events: {str(e)}"
        )