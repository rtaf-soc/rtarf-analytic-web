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

@router.get("/summary")
def get_alert_summary(db: Session = Depends(get_db)):
    """
    Get alert summary statistics
    """
    try:
        return crud.alert_summary(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alert summary: {str(e)}"
        )

@router.get("/statistics")
def get_comprehensive_alert_stats(db: Session = Depends(get_db)):
    """
    Get comprehensive alert statistics including:
    - Total alerts
    - Recent alerts (24h)
    - Breakdown by severity, status, and source
    """
    try:
        return crud.get_alert_statistics(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alert statistics: {str(e)}"
        )

@router.post("/sync-from-events")
async def sync_all_events_to_alerts(db: Session = Depends(get_db)):
    """
    Manually sync ALL RtarfEvents to Alerts table.
    Only creates alerts for events that don't already have them.
    
    Use this for:
    - Initial setup
    - After database issues
    - Manual catch-up sync
    
    Note: For large datasets, this may take several minutes.
    """
    try:
        result = await crud.sync_rtarf_events_to_alerts(db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync events to alerts: {str(e)}"
        )

@router.post("/sync-new-events")
async def sync_new_events_to_alerts(
    last_sync_hours: Optional[int] = Query(None, description="Hours to look back (optional)"),
    db: Session = Depends(get_db)
):
    """
    Sync only NEW RtarfEvents to Alerts (much faster than full sync).
    
    Query Parameters:
    - last_sync_hours: Only sync events from last N hours (optional)
    
    If last_sync_hours is not provided, syncs based on last successful sync timestamp.
    """
    try:
        from datetime import datetime, timedelta
        
        last_sync_time = None
        if last_sync_hours:
            last_sync_time = datetime.utcnow() - timedelta(hours=last_sync_hours)
        
        result = await crud.sync_new_rtarf_events_to_alerts(
            db=db,
            last_sync_time=last_sync_time
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync new events: {str(e)}"
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

@router.get("/latest", response_model=List[schemas.Alert])
def get_lastest_alert(db: Session = Depends(get_db)):
    try:
        result = crud.get_latest_alerts(db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alert latest list: {str(e)}"
     )
