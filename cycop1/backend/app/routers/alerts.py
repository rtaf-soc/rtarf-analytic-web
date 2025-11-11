# app/routers/alerts.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, schemas, database

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/create-alert-from-rtarf", response_model=List[schemas.Alert])
async def create_alert_from_rtarf(db: Session = Depends(get_db)):
    """
    สร้าง alerts จาก RTARF events
    """
    try:
        result = await crud.get_all_event_and_insert_into_alert(db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create alert lists: {str(e)}"
        )

@router.get("/summary")
async def get_alert_summary(db: Session = Depends(get_db)):
    """
    Get total alert count and grouped counts by alert_name.
    """
    try:
        result = crud.alert_summary(db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alert summary: {str(e)}"
        )

@router.get("/", response_model=List[schemas.Alert])
def read_all_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    source: Optional[str] = Query(None, description="Filter by source"),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูล alerts ทั้งหมด
    """
    return crud.get_alerts(db, skip=skip, limit=limit, severity=severity, source=source)

@router.get("/node/{node_id}", response_model=List[schemas.Alert])
def read_alerts_by_node(
    node_id: int,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    ดึง alerts ล่าสุดของโหนดเฉพาะ
    """
    return crud.get_latest_alerts_by_node(db, node_id=node_id, limit=limit)

@router.get("/ip/{ip_address}", response_model=List[schemas.Alert])
def read_alerts_by_ip(
    ip_address: str,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    ดึง alerts ล่าสุดจาก IP address
    """
    return crud.get_latest_alerts_by_ip(db, ip_address=ip_address, limit=limit)