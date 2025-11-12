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

@router.get("/severity/statistics")
def get_severity_stats(db: Session = Depends(get_db)):
    """
    Get severity distribution statistics across all events
    
    Returns:
        - total_events: Total number of events
        - severity_distribution: Count by severity level
        - percentages: Percentage distribution
    """
    try:
        stats = crud.get_severity_statistics(db)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get severity statistics: {str(e)}"
        )
        
@router.get("/severity/average")
def get_overall_average_severity(db: Session = Depends(get_db)):
    """
    Get overall average severity level across ALL events
    
    This endpoint is designed for DEFCON-style displays.
    Returns the average severity level (1-4) calculated from all events.
    
    Returns:
        - average_severity_level: Overall average (1-4) for DEFCON display
        - danger_level: Text representation (critical/high/medium/low)
        - total_events: Total number of events
        - events_with_severity: Number of events with severity data
        - raw_average: Precise average before rounding
    """
    try:
        result = crud.get_overall_average_severity_level(db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get overall average severity: {str(e)}"
        )

@router.get("/severity/average/recent")
def get_recent_average_severity(
    hours: int = Query(24, ge=1, le=168, description="Time window in hours (default 24)"),
    db: Session = Depends(get_db)
):
    """
    Get average severity level for recent events only
    
    Useful for showing current threat level based on recent activity.
    
    Query Parameters:
        - hours: Number of hours to look back (1-168, default 24)
    
    Returns:
        - average_severity_level: Recent average (1-4)
        - danger_level: Text representation
        - total_events: Events in time window
        - events_with_severity: Events with severity data
        - raw_average: Precise average
        - time_window_hours: Time window used
    """
    try:
        result = crud.get_recent_average_severity_level(db, hours=hours)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recent average severity: {str(e)}"
        )

@router.get("/severity/trend")
def get_severity_trend_analysis(
    hours: int = Query(24, ge=1, le=168, description="Period length in hours"),
    db: Session = Depends(get_db)
):
    """
    Get severity trend analysis
    
    Compares current period vs previous period to show if threats are increasing.
    
    Query Parameters:
        - hours: Length of each period (1-168, default 24)
    
    Returns:
        - current_level: Average severity in current period
        - previous_level: Average severity in previous period
        - trend: "increasing", "decreasing", or "stable"
        - change: Numerical change in severity level
        - current_period_events: Event count in current period
        - previous_period_events: Event count in previous period
    """
    try:
        result = crud.get_severity_trend(db, hours=hours)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get severity trend: {str(e)}"
        )

@router.get("/severity/events")
def get_events_with_calculated_severity(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    severity_level: Optional[int] = Query(None, ge=1, le=4, description="Filter by severity level (1-4)"),
    danger_level: Optional[str] = Query(None, description="Filter by danger level (critical, high, medium, low)"),
    db: Session = Depends(get_db)
):
    """
    Get RTARF events with calculated average severity from Palo Alto and CrowdStrike
    
    Query Parameters:
        - skip: Number of records to skip (pagination)
        - limit: Maximum number of records to return
        - severity_level: Filter by calculated severity level (1=low, 2=medium, 3=high, 4=critical)
        - danger_level: Filter by danger level string (low, medium, high, critical)
    
    Returns:
        List of events with:
        - palo_severity: Original Palo Alto severity
        - crowdstrike_severity: Original CrowdStrike severity
        - calculated_severity_level: Averaged severity (1-4)
        - calculated_danger_level: Danger assessment (low/medium/high/critical)
    """
    # Validate danger_level if provided
    valid_danger_levels = ["critical", "high", "medium", "low"]
    if danger_level and danger_level.lower() not in valid_danger_levels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid danger_level. Must be one of: {', '.join(valid_danger_levels)}"
        )
    
    try:
        events = crud.get_rtarf_events_with_severity(
            db=db,
            skip=skip,
            limit=limit,
            severity_level=severity_level,
            danger_level=danger_level.lower() if danger_level else None
        )
        return {
            "total": len(events),
            "skip": skip,
            "limit": limit,
            "filters": {
                "severity_level": severity_level,
                "danger_level": danger_level
            },
            "events": events
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get events with severity: {str(e)}"
        )

@router.get("/severity/{event_id}")
def get_event_with_calculated_severity(event_id: str, db: Session = Depends(get_db)):
    """
    Get single RTARF event with calculated average severity
    
    Path Parameters:
        - event_id: Database primary key ID
    
    Returns:
        Event with calculated severity information including:
        - palo_severity: Original Palo Alto severity
        - crowdstrike_severity: Original CrowdStrike severity
        - calculated_severity_level: Averaged severity (1-4)
        - calculated_danger_level: Danger assessment (low/medium/high/critical)
    """
    try:
        event = crud.get_rtarf_event_with_severity(db, event_id=event_id)
        
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with id '{event_id}' not found"
            )
        
        return event
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get event with severity: {str(e)}"
        )

@router.patch("/severity/{event_id}")
def update_event_severity(
    event_id: str,
    palo_severity: Optional[str] = Query(None, description="Update Palo Alto severity"),
    crowdstrike_severity: Optional[str] = Query(None, description="Update CrowdStrike severity"),
    db: Session = Depends(get_db)
):
    """
    Update event severity values and get recalculated severity
    
    Path Parameters:
        - event_id: Database primary key ID
    
    Query Parameters:
        - palo_severity: New Palo Alto severity value
        - crowdstrike_severity: New CrowdStrike severity value
    
    Returns:
        Updated event with recalculated severity
    """
    if palo_severity is None and crowdstrike_severity is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one severity value must be provided"
        )
    
    # Validate severity values
    valid_severities = ["critical", "high", "medium", "low", "informational", "unknown"]
    
    if palo_severity and palo_severity.lower() not in valid_severities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid palo_severity. Must be one of: {', '.join(valid_severities)}"
        )
    
    if crowdstrike_severity and crowdstrike_severity.lower() not in valid_severities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid crowdstrike_severity. Must be one of: {', '.join(valid_severities)}"
        )
    
    try:
        updated_event = crud.update_event_with_severity(
            db=db,
            event_id=event_id,
            palo_severity=palo_severity,
            crowdstrike_severity=crowdstrike_severity
        )
        
        if not updated_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with id '{event_id}' not found"
            )
        
        return updated_event
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update event severity: {str(e)}"
        )

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