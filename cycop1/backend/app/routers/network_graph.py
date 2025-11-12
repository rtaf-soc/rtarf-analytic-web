# app/routers/network_graph.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from .. import crud, schemas, database

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=schemas.NetworkGraphData)
def get_network_graph_data(
    node_type: Optional[str] = Query(None, description="Filter nodes by type"),
    connection_type: Optional[str] = Query(None, description="Filter connections by type"),
    limit_nodes: int = Query(100, ge=1, le=1000),
    limit_connections: int = Query(500, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    """
    ดึงข้อมูลสำหรับแสดง Network Graph
    """
    nodes = crud.get_nodes(db, skip=0, limit=limit_nodes, node_type=node_type)
    connections = crud.get_connections(
        db,
        skip=0,
        limit=limit_connections,
        connection_type=connection_type
    )
    
    return schemas.NetworkGraphData(
        nodes=[schemas.Node.from_orm_with_location(node) for node in nodes],
        connections=connections
    )