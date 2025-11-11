# app/routers/nodes.py
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

@router.post("/", 
          response_model=schemas.Node, 
          status_code=status.HTTP_201_CREATED)
def create_new_node(node: schemas.NodeCreate, db: Session = Depends(get_db)):
    """
    สร้างโหนดใหม่ในระบบ

    - **name**: ชื่อของโหนด (required)
    - **description**: คำอธิบาย (optional)
    - **node_type**: ประเภทของโหนด (required)
    - **latitude**: พิกัดละติจูด (required)
    - **longitude**: พิกัดลองจิจูด (required)
    - **ip_address**: IP address หลัก (optional)
    - **additional_ips**: IP addresses เพิ่มเติม (optional)
    - **network_metadata**: ข้อมูลเครือข่ายเพิ่มเติม (optional)
    """
    if node.ip_address:
        existing_node = crud.get_node_by_ip(db, ip_address=node.ip_address)
        if existing_node:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Node with IP address '{node.ip_address}' already exists"
            )
    
    db_node = crud.create_node(db=db, node=node)
    return schemas.Node.from_orm_with_location(db_node)

@router.get("/", response_model=List[schemas.Node])
def read_all_nodes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    node_type: Optional[str] = Query(None, description="Filter by node type"),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลโหนดทั้งหมด พร้อมระบบแบ่งหน้า (pagination)
    
    - **skip**: จำนวนรายการที่จะข้าม (default: 0)
    - **limit**: จำนวนรายการสูงสุดที่จะแสดง (default: 100, max: 1000)
    - **node_type**: กรองตามประเภทของโหนด (optional)
    """
    nodes = crud.get_nodes(db, skip=skip, limit=limit, node_type=node_type)
    return [schemas.Node.from_orm_with_location(node) for node in nodes]

@router.get("/{node_id}", response_model=schemas.Node)
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

@router.get("/by-ip/{ip_address}", response_model=schemas.Node)
def read_node_by_ip(ip_address: str, db: Session = Depends(get_db)):
    """
    ดึงข้อมูลโหนดด้วย IP address
    """
    db_node = crud.get_node_by_ip(db, ip_address=ip_address)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with IP address '{ip_address}' not found"
        )
    return schemas.Node.from_orm_with_location(db_node)

@router.put("/{node_id}", response_model=schemas.Node)
def update_existing_node(
    node_id: int, 
    node: schemas.NodeUpdate,
    db: Session = Depends(get_db)
):
    """
    อัพเดทข้อมูลโหนดที่มีอยู่
    
    ส่งเฉพาะ fields ที่ต้องการอัพเดท
    """
    db_node = crud.update_node(db, node_id=node_id, node=node)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    return schemas.Node.from_orm_with_location(db_node)

@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_node(node_id: int, db: Session = Depends(get_db)):
    """
    ลบโหนดออกจากระบบ
    
    Note: จะลบ connections ที่เกี่ยวข้องทั้งหมดด้วย (cascade delete)
    """
    success = crud.delete_node(db, node_id=node_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    return None

@router.post("/search-by-area", response_model=List[schemas.Node])
def search_nodes_in_area(
    area: schemas.AreaSearchParams,
    db: Session = Depends(get_db)
):
    """
    ค้นหาโหนดในพื้นที่สี่เหลี่ยม (bounding box)
    
    - **min_latitude**: ละติจูดต่ำสุด
    - **min_longitude**: ลองจิจูดต่ำสุด
    - **max_latitude**: ละติจูดสูงสุด
    - **max_longitude**: ลองจิจูดสูงสุด
    """
    nodes = crud.search_nodes_by_area(
        db,
        min_lat=area.min_latitude,
        min_lng=area.min_longitude,
        max_lat=area.max_latitude,
        max_lng=area.max_longitude
    )
    return [schemas.Node.from_orm_with_location(node) for node in nodes]

@router.get("/{node_id}/connections", response_model=schemas.NodeWithConnections)
def get_node_with_connections(
    node_id: int,
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลโหนดพร้อมการเชื่อมต่อทั้งหมด
    """
    db_node = crud.get_node(db, node_id=node_id)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    
    connections = crud.get_node_connections(db, node_id=node_id, direction="both")
    outgoing = [c for c in connections if c.source_node_id == node_id]
    incoming = [c for c in connections if c.destination_node_id == node_id]
    
    node_data = schemas.Node.from_orm_with_location(db_node)
    
    return schemas.NodeWithConnections(
        **node_data.dict(),
        outgoing_connections=outgoing,
        incoming_connections=incoming,
        total_outgoing=len(outgoing),
        total_incoming=len(incoming)
    )

@router.get("/{node_id}/alerts", response_model=schemas.NodeWithAlerts)
def get_node_with_alerts(
    node_id: int,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลโหนดพร้อม alerts ล่าสุด
    """
    db_node = crud.get_node(db, node_id=node_id)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    
    alerts = crud.get_latest_alerts_by_node(db, node_id=node_id, limit=limit)
    node_data = schemas.Node.from_orm_with_location(db_node)
    
    return schemas.NodeWithAlerts(
        **node_data.dict(),
        latest_alerts=alerts,
        total_alerts=len(alerts)
    )