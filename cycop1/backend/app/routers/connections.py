# app/routers/connections.py
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
          response_model=schemas.NetworkConnection,
          status_code=status.HTTP_201_CREATED)
def create_new_connection(
    connection: schemas.NetworkConnectionCreate,
    db: Session = Depends(get_db)
):
    """
    สร้างการเชื่อมต่อเครือข่ายใหม่
    """
    source_node = crud.get_node(db, node_id=connection.source_node_id)
    if not source_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source node with ID {connection.source_node_id} not found"
        )
    
    dest_node = crud.get_node(db, node_id=connection.destination_node_id)
    if not dest_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination node with ID {connection.destination_node_id} not found"
        )
    
    db_connection = crud.create_connection(db=db, connection=connection)
    return db_connection

@router.get("/", response_model=List[schemas.NetworkConnection])
def read_all_connections(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    connection_type: Optional[str] = Query(None, description="Filter by connection type"),
    protocol: Optional[str] = Query(None, description="Filter by protocol"),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลการเชื่อมต่อทั้งหมด พร้อม filters
    """
    connections = crud.get_connections(
        db,
        skip=skip,
        limit=limit,
        connection_type=connection_type,
        protocol=protocol
    )
    return connections

@router.get("/{connection_id}", response_model=schemas.NetworkConnectionWithNodes)
def read_single_connection(
    connection_id: int,
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลการเชื่อมต่อเดียว พร้อมข้อมูล nodes
    """
    db_connection = crud.get_connection(db, connection_id=connection_id)
    if db_connection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection with ID {connection_id} not found"
        )
    
    response_data = schemas.NetworkConnection.from_orm(db_connection)
    
    return schemas.NetworkConnectionWithNodes(
        **response_data.dict(),
        source_node=schemas.Node.from_orm_with_location(db_connection.source_node) if db_connection.source_node else None,
        destination_node=schemas.Node.from_orm_with_location(db_connection.destination_node) if db_connection.destination_node else None
    )

@router.get("/node/{node_id}", response_model=List[schemas.NetworkConnection])
def read_node_connections(
    node_id: int,
    direction: str = Query("both", regex="^(outgoing|incoming|both)$"),
    db: Session = Depends(get_db)
):
    """
    ดึงการเชื่อมต่อของโหนดเฉพาะ
    
    - **direction**: ทิศทางของการเชื่อมต่อ (outgoing, incoming, both)
    """
    node = crud.get_node(db, node_id=node_id)
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID {node_id} not found"
        )
    
    connections = crud.get_node_connections(db, node_id=node_id, direction=direction)
    return connections

@router.put("/{connection_id}", response_model=schemas.NetworkConnection)
def update_existing_connection(
    connection_id: int,
    connection: schemas.NetworkConnectionUpdate,
    db: Session = Depends(get_db)
):
    """
    อัพเดทข้อมูลการเชื่อมต่อที่มีอยู่
    """
    db_connection = crud.update_connection(db, connection_id=connection_id, connection=connection)
    if db_connection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection with ID {connection_id} not found"
        )
    return db_connection

@router.post("/upsert", response_model=schemas.NetworkConnection)
def upsert_connection(
    connection: schemas.NetworkConnectionCreate,
    db: Session = Depends(get_db)
):
    """
    อัพเดทถ้ามีอยู่แล้ว หรือสร้างใหม่ถ้ายังไม่มี
    """
    db_connection = crud.update_or_create_connection(db=db, connection=connection)
    return db_connection

@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_connection(
    connection_id: int,
    db: Session = Depends(get_db)
):
    """
    ลบการเชื่อมต่อออกจากระบบ
    """
    success = crud.delete_connection(db, connection_id=connection_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connection with ID {connection_id} not found"
        )
    return None

@router.get("/statistics/summary", response_model=List[schemas.ConnectionStatistics])
def get_connection_statistics(
    node_id: Optional[int] = Query(None, description="Filter by node ID"),
    db: Session = Depends(get_db)
):
    """
    ดึงสถิติการเชื่อมต่อ
    """
    stats = crud.get_connection_statistics(db, node_id=node_id)
    
    return [
        schemas.ConnectionStatistics(
            protocol=stat.protocol or "unknown",
            connection_type=stat.connection_type or "unknown",
            count=stat.count,
            total_bytes_sent=stat.total_bytes_sent or 0,
            total_bytes_received=stat.total_bytes_received or 0
        )
        for stat in stats
    ]