# app/routers/nodes_bangkok.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, schemas, database

import logging
import traceback

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post(
    "/",
    response_model=schemas.Node,
    status_code=status.HTTP_201_CREATED
)
def create_new_node_bangkok(node: schemas.NodeCreate, db: Session = Depends(get_db)):
    """
    สร้างโหนดใหม่ (Bangkok) เก็บที่ตาราง node_positionsBK
    """
    if node.ip_address:
        existing_node = crud.get_node_by_ip_bangkok(db, ip_address=node.ip_address)
        if existing_node:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bangkok node with IP address '{node.ip_address}' already exists"
            )

    db_node = crud.create_node_bangkok(db=db, node=node)
    return schemas.Node.from_orm_with_location(db_node)


@router.get("/", response_model=List[schemas.Node])
def read_all_nodes_bangkok(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    node_type: Optional[str] = Query(None, description="Filter by node type"),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลโหนด Bangkok ทั้งหมด จากตาราง node_positionsBK พร้อม pagination
    """
    try:
        nodes = crud.get_nodes_bangkok(db, skip=skip, limit=limit, node_type=node_type)
        print("DB nodesBK count =", len(nodes))

        result = [schemas.Node.from_orm_with_location(node) for node in nodes]
        print("Pydantic nodesBK count =", len(result))
        return result
    except Exception as e:
        logging.error("Error in read_all_nodes_bangkok: %s", e)
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"read_all_nodes_bangkok error: {e}"
        )


@router.get("/{node_id}", response_model=schemas.Node)
def read_single_node_bangkok(node_id: int, db: Session = Depends(get_db)):
    """
    ดึงข้อมูลโหนด Bangkok (node_positionsBK) ด้วย ID
    """
    db_node = crud.get_node_bangkok(db, node_id=node_id)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bangkok node with ID {node_id} not found"
        )
    return schemas.Node.from_orm_with_location(db_node)


@router.get("/by-ip/{ip_address}", response_model=schemas.Node)
def read_node_by_ip_bangkok(ip_address: str, db: Session = Depends(get_db)):
    """
    ดึงข้อมูลโหนด Bangkok ด้วย IP address
    """
    db_node = crud.get_node_by_ip_bangkok(db, ip_address=ip_address)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bangkok node with IP address '{ip_address}' not found"
        )
    return schemas.Node.from_orm_with_location(db_node)


@router.put("/{node_id}", response_model=schemas.Node)
def update_existing_node_bangkok(
    node_id: int,
    node: schemas.NodeUpdate,
    db: Session = Depends(get_db)
):
    """
    อัพเดทข้อมูลโหนด Bangkok (node_positionsBK)
    """
    db_node = crud.update_node_bangkok(db, node_id=node_id, node=node)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bangkok node with ID {node_id} not found"
        )
    return schemas.Node.from_orm_with_location(db_node)


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_node_bangkok(node_id: int, db: Session = Depends(get_db)):
    """
    ลบโหนด Bangkok ออกจากระบบ (ตาราง node_positionsBK)
    """
    success = crud.delete_node_bangkok(db, node_id=node_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bangkok node with ID {node_id} not found"
        )
    return None


@router.post("/search-by-area", response_model=List[schemas.Node])
def search_nodes_in_area_bangkok(
    area: schemas.AreaSearchParams,
    db: Session = Depends(get_db)
):
    """
    ค้นหาโหนด Bangkok ในพื้นที่สี่เหลี่ยม (bounding box) จาก node_positionsBK
    """
    nodes = crud.search_nodes_by_area_bangkok(
        db,
        min_lat=area.min_latitude,
        min_lng=area.min_longitude,
        max_lat=area.max_latitude,
        max_lng=area.max_longitude
    )
    return [schemas.Node.from_orm_with_location(node) for node in nodes]


@router.get("/{node_id}/connections", response_model=schemas.NodeWithConnections)
def get_node_with_connections_bangkok(
    node_id: int,
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลโหนด Bangkok พร้อมการเชื่อมต่อทั้งหมด
    (ใช้ตาราง network_connections เดิม อิง node_id)
    """
    db_node = crud.get_node_bangkok(db, node_id=node_id)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bangkok node with ID {node_id} not found"
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
def get_node_with_alerts_bangkok(
    node_id: int,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลโหนด Bangkok พร้อม alerts ล่าสุด
    (ใช้ alert_lists เดิม อิง affected_node_id)
    """
    db_node = crud.get_node_bangkok(db, node_id=node_id)
    if db_node is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bangkok node with ID {node_id} not found"
        )

    alerts = crud.get_latest_alerts_by_node(db, node_id=node_id, limit=limit)
    node_data = schemas.Node.from_orm_with_location(db_node)

    return schemas.NodeWithAlerts(
        **node_data.dict(),
        latest_alerts=alerts,
        total_alerts=len(alerts)
    )
