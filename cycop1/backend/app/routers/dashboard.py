# app/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from .. import schemas, database, models

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/statistics", response_model=schemas.DashboardStats)
def get_dashboard_statistics(db: Session = Depends(get_db)):
    """
    ดึงสถิติสำหรับ Dashboard
    """
    # Count totals
    total_nodes = db.query(func.count(models.NodePosition.id)).scalar()
    total_connections = db.query(func.count(models.NetworkConnection.id)).scalar()
    total_events = db.query(func.count(models.RtarfEvent.id)).scalar()
    total_alerts = db.query(func.count(models.Alert.id)).scalar()
    
    # Count active connections
    active_connections = db.query(func.count(models.NetworkConnection.id)).filter(
        models.NetworkConnection.connection_status == "active"
    ).scalar()
    
    # Count suspicious connections
    suspicious_connections = db.query(func.count(models.NetworkConnection.id)).filter(
        models.NetworkConnection.connection_type == "suspicious"
    ).scalar()
    
    # Count alerts by severity
    critical_alerts = db.query(func.count(models.Alert.id)).filter(
        models.Alert.severity == "critical"
    ).scalar()
    
    high_alerts = db.query(func.count(models.Alert.id)).filter(
        models.Alert.severity == "high"
    ).scalar()
    
    medium_alerts = db.query(func.count(models.Alert.id)).filter(
        models.Alert.severity == "medium"
    ).scalar()
    
    low_alerts = db.query(func.count(models.Alert.id)).filter(
        models.Alert.severity == "low"
    ).scalar()
    
    return schemas.DashboardStats(
        total_nodes=total_nodes or 0,
        total_connections=total_connections or 0,
        total_events=total_events or 0,
        total_alerts=total_alerts or 0,
        active_connections=active_connections or 0,
        suspicious_connections=suspicious_connections or 0,
        critical_alerts=critical_alerts or 0,
        high_alerts=high_alerts or 0,
        medium_alerts=medium_alerts or 0,
        low_alerts=low_alerts or 0
    )