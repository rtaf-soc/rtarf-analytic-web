# db.py
import os
from geoalchemy2 import Geometry
from sqlalchemy import Index, Text, create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:patpimol00823@localhost:5432/defensive_db"
)

engine = create_engine(DATABASE_URL, echo=True)  # echo=True to see SQL queries
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class Rtarf(Base):
    __tablename__ = "rtarf_event"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, unique=True, index=True, nullable=False)

    # Palo-XSIAM fields
    mitre_tactics_ids_and_names = Column(JSONB)
    mitre_techniques_ids_and_names = Column(JSONB)
    description = Column(String)
    severity = Column(String)
    alert_categories = Column(JSONB)

    # CrowdStrike fields
    crowdstrike_tactics = Column(JSONB)
    crowdstrike_tactics_ids = Column(JSONB)
    crowdstrike_techniques = Column(JSONB)
    crowdstrike_techniques_ids = Column(JSONB)
    crowdstrike_severity = Column(String(50))  
    crowdstrike_event_name = Column(String)
    crowdstrike_event_objective = Column(String)
    
    timestamp = Column(DateTime, default=datetime.utcnow)

class NodePosition(Base): 
    __tablename__ = "node_positions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True) 
    description = Column(Text, nullable=True) 
    node_type = Column(String(50), index=True)

    # --- ส่วนสำคัญ ---
    # 1. ใช้ String 'POINT' บอกชนิด Geometry
    # 2. ใช้ SRID 4326 สำหรับพิกัดมาตรฐาน (lat/lon)
    location = Column(Geometry(geometry_type='POINT', srid=4326), index=True)

    # --- ส่วนสำคัญมาก (Performance) ---
    # สร้าง Spatial Index ประเภท GIST บนคอลัมน์ location
    # เพื่อเร่งความเร็วในการค้นหาข้อมูลตามพื้นที่ (Geospatial Queries)
    __table_args__ = (
        Index('idx_node_positions_location', location, postgresql_using='gist'),
    )

    def __repr__(self):
        return f"<NodePosition(id={self.id}, name='{self.name}')>"

# Create tables
def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")


# Only create tables if this file is run directly
if __name__ == "__main__":
    print("Creating database tables...")
    init_db()