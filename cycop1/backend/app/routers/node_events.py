# app/routers/node_events.py
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


# ===============================================================
# NodeEvent CRUD Endpoints
# ===============================================================

@router.post("/", 
             response_model=schemas.NodeEvent, 
             status_code=status.HTTP_201_CREATED)
def create_node_event(
    node_event: schemas.NodeEventCreate, 
    db: Session = Depends(get_db)
):
    """
    สร้างความเชื่อมโยงระหว่าง Node และ Event
    
    - **node_id**: ID ของ Node (required)
    - **event_id**: ID ของ Event (required)
    - **node_role**: บทบาทของ Node (source, destination, affected, related)
    - **node_ip**: IP address ของ Node (optional)
    - **relevance_score**: คะแนนความเกี่ยวข้อง 0-100 (default: 100)
    - **involvement_metadata**: ข้อมูลเพิ่มเติม (optional)
    """
    # Verify node exists
    db_node = crud.get_node(db, node_event.node_id)
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_event.node_id} not found"
        )
    
    # Verify event exists
    db_event = crud.get_rtarf_event(db, node_event.rtarf_event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {node_event.rtarf_event_id} not found"
        )
    
    # Check if already exists
    existing = crud.get_node_event_by_ids(db, node_event.node_id, node_event.rtarf_event_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This node-event association already exists"
        )
    
    return crud.create_node_event(db=db, node_event=node_event)


@router.post("/bulk", response_model=schemas.BulkNodeEventResponse)
def create_node_events_bulk(
    bulk_data: schemas.BulkNodeEventCreate,
    db: Session = Depends(get_db)
):
    """
    สร้างความเชื่อมโยงหลายรายการพร้อมกัน (bulk insert)
    
    ใช้ upsert strategy - จะอัพเดทถ้ามีอยู่แล้ว
    """
    try:
        created, updated = crud.create_node_events_bulk(db, bulk_data.events)
        return schemas.BulkNodeEventResponse(
            status="success",
            total_processed=len(bulk_data.events),
            created=created,
            failed=0
        )
    except Exception as e:
        return schemas.BulkNodeEventResponse(
            status="error",
            total_processed=len(bulk_data.events),
            created=0,
            failed=len(bulk_data.events),
            errors=[{"message": str(e)}]
        )


@router.get("/", response_model=schemas.NodeEventListResponse)
def get_all_node_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูล NodeEvent ทั้งหมด พร้อม pagination
    """
    node_events = crud.get_node_events(db, skip=skip, limit=limit)
    total = db.query(crud.models.NodeEvent).count()
    
    return schemas.NodeEventListResponse(
        total=total,
        items=node_events,
        page=skip // limit + 1,
        page_size=limit
    )


@router.get("/{node_event_id}", response_model=schemas.NodeEventWithDetails)
def get_node_event_detail(
    node_event_id: int,
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูล NodeEvent เดียว พร้อมรายละเอียดของ Node และ Event
    """
    node_event = crud.get_node_event(db, node_event_id)
    if not node_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NodeEvent with ID {node_event_id} not found"
        )
    
    return node_event


@router.put("/{node_event_id}", response_model=schemas.NodeEvent)
def update_node_event(
    node_event_id: int,
    node_event: schemas.NodeEventUpdate,
    db: Session = Depends(get_db)
):
    """
    อัพเดทข้อมูล NodeEvent
    
    สามารถอัพเดท: node_role, relevance_score, involvement_metadata
    """
    updated = crud.update_node_event(db, node_event_id, node_event)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NodeEvent with ID {node_event_id} not found"
        )
    
    return updated


@router.delete("/{node_event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node_event(
    node_event_id: int,
    db: Session = Depends(get_db)
):
    """
    ลบ NodeEvent
    """
    success = crud.delete_node_event(db, node_event_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NodeEvent with ID {node_event_id} not found"
        )
    return None


# ===============================================================
# Query by Node Endpoints
# ===============================================================

@router.get("/by-node/{node_id}", response_model=List[schemas.NodeEvent])
def get_events_by_node(
    node_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    node_role: Optional[str] = Query(None, description="Filter by node role"),
    db: Session = Depends(get_db)
):
    """
    ดึง Events ทั้งหมดที่เกี่ยวข้องกับ Node
    
    - **node_id**: ID ของ Node
    - **node_role**: กรองตามบทบาท (source, destination, affected, related)
    """
    # Verify node exists
    db_node = crud.get_node(db, node_id)
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    
    return crud.get_events_by_node(db, node_id, skip=skip, limit=limit, node_role=node_role)


@router.get("/by-node-ip/{ip_address}", response_model=List[schemas.NodeEvent])
def get_events_by_node_ip(
    ip_address: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    ดึง Events จาก IP address
    """
    events = crud.get_events_by_node_ip(db, ip_address, skip=skip, limit=limit)
    if not events:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No events found for IP address '{ip_address}'"
        )
    
    return events


@router.get("/node/{node_id}/summary", response_model=schemas.NodeEventSummary)
def get_node_event_summary(
    node_id: int,
    db: Session = Depends(get_db)
):
    """
    ดึงสรุปข้อมูล Events ของ Node
    
    รวมถึง: จำนวน events ทั้งหมด, แยกตามบทบาท, แยกตาม severity
    """
    # Verify node exists
    db_node = crud.get_node(db, node_id)
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    
    summary = crud.get_node_event_summary(db, node_id)
    
    return schemas.NodeEventSummary(
        node_id=node_id,
        node_name=db_node.name,
        total_events=summary["total_events"],
        events_by_role=summary["events_by_role"],
        events_by_severity=summary["events_by_severity"],
        latest_event_time=summary["latest_event_time"]
    )


@router.get("/node/{node_id}/with-events", response_model=schemas.NodeWithEventsResponse)
def get_node_with_events(
    node_id: int,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูล Node พร้อม Events ที่เกี่ยวข้อง
    """
    db_node = crud.get_node(db, node_id)
    if not db_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    
    events = crud.get_events_by_node(db, node_id, limit=limit)
    total = db.query(crud.models.NodeEvent).filter(
        crud.models.NodeEvent.node_id == node_id
    ).count()
    
    return schemas.NodeWithEventsResponse(
        node_id=node_id,
        node_name=db_node.name,
        node_ip=str(db_node.ip_address) if db_node.ip_address else None,
        total_events=total,
        events=events
    )


# ===============================================================
# Query by Event Endpoints
# ===============================================================

@router.get("/by-event/{rtarf_event_id}", response_model=List[schemas.NodeEvent])
def get_nodes_by_event(
    rtarf_event_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    node_role: Optional[str] = Query(None, description="Filter by node role"),
    db: Session = Depends(get_db)
):
    """
    ดึง Nodes ทั้งหมดที่เกี่ยวข้องกับ Event
    
    - **rtarf_event_id**: ID ของ RtarfEvent (Primary Key)
    - **node_role**: กรองตามบทบาท (source, destination, affected, related)
    """
    # Verify event exists
    db_event = crud.get_rtarf_event(db, rtarf_event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {rtarf_event_id} not found"
        )
    
    return crud.get_nodes_by_event(db, rtarf_event_id, skip=skip, limit=limit, node_role=node_role)


@router.get("/event/{rtarf_event_id}/summary", response_model=schemas.EventNodesSummary)
def get_event_nodes_summary(
    rtarf_event_id: int,
    db: Session = Depends(get_db)
):
    """
    ดึงสรุปข้อมูล Nodes ที่เกี่ยวข้องกับ Event
    
    รวมถึง: จำนวน nodes ทั้งหมด, แยกตามบทบาท, IP addresses ที่เกี่ยวข้อง
    """
    # Verify event exists
    db_event = crud.get_rtarf_event(db, rtarf_event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {rtarf_event_id} not found"
        )
    
    summary = crud.get_event_nodes_summary(db, rtarf_event_id)
    
    return schemas.EventNodesSummary(
        event_id=rtarf_event_id,
        event_name=db_event.event_id,
        total_nodes=summary["total_nodes"],
        nodes_by_role=summary["nodes_by_role"],
        affected_ips=summary["affected_ips"]
    )


@router.get("/event/{rtarf_event_id}/with-nodes", response_model=schemas.EventWithNodesResponse)
def get_event_with_nodes(
    rtarf_event_id: int,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูล Event พร้อม Nodes ที่เกี่ยวข้อง
    """
    db_event = crud.get_rtarf_event(db, rtarf_event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {rtarf_event_id} not found"
        )
    
    nodes = crud.get_nodes_by_event(db, rtarf_event_id, limit=limit)
    total = db.query(crud.models.NodeEvent).filter(
        crud.models.NodeEvent.rtarf_event_id == rtarf_event_id
    ).count()
    
    return schemas.EventWithNodesResponse(
        event_id=rtarf_event_id,
        event_name=db_event.event_id,
        severity=db_event.severity,
        total_nodes=total,
        nodes=nodes
    )


# ===============================================================
# Helper/Utility Endpoints
# ===============================================================

@router.post("/link-by-ip", response_model=List[schemas.NodeEvent])
def link_event_to_nodes_by_ip(
    event_id: int,
    source_ip: Optional[str] = Query(None),
    destination_ip: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    เชื่อมโยง Event กับ Nodes โดยอัตโนมัติจาก IP addresses
    
    - **event_id**: ID ของ Event
    - **source_ip**: Source IP address (optional)
    - **destination_ip**: Destination IP address (optional)
    """
    # Verify event exists
    db_event = crud.get_rtarf_event(db, event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found"
        )
    
    if not source_ip and not destination_ip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one IP address (source_ip or destination_ip) must be provided"
        )
    
    links = crud.link_event_to_nodes_by_ip(db, event_id, source_ip, destination_ip)
    
    if not links:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No nodes found with the provided IP addresses"
        )
    
    return links


@router.post("/sync", response_model=schemas.SyncResponse)
def sync_events_with_nodes(
    batch_size: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    ซิงค์ RtarfEvents กับ Nodes โดยอัตโนมัติ
    
    สร้างลิงก์สำหรับ events ที่ยังไม่ได้เชื่อมกับ nodes โดยใช้ IP addresses
    """
    result = crud.sync_events_with_nodes(db, batch_size=batch_size)
    
    return schemas.SyncResponse(
        status=result["status"],
        total_processed=result["events_processed"],
        inserted=result["links_created"],
        updated=0,
        message=f"Created {result['links_created']} node-event links"
    )


@router.delete("/by-node/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node_events_by_node(
    node_id: int,
    db: Session = Depends(get_db)
):
    """
    ลบ NodeEvents ทั้งหมดของ Node
    """
    deleted_count = crud.delete_node_events_by_node(db, node_id)
    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No events found for node with ID {node_id}"
        )
    return None


@router.delete("/by-event/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node_events_by_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    """
    ลบ NodeEvents ทั้งหมดของ Event
    """
    deleted_count = crud.delete_node_events_by_event(db, event_id)
    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No nodes found for event with ID {event_id}"
        )
    return None