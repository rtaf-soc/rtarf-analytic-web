#!/usr/bin/env python3
#backend/app/drop_table.py
"""
Drop all tables from the database
Run from backend directory: python drop_tables.py
"""
import sys
import os

# Add the parent directory to the path so we can import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine
from app import models  # Important: Import models so they're registered with Base
W
def drop_all_tables():
    """Drop all tables defined in models"""
    print("🗑️  Dropping all tables...")
    print(f"📊 Tables to drop: {list(Base.metadata.tables.keys())}")
    
    # Confirm before dropping
    response = input("\n⚠️  Are you sure you want to drop all tables? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Operation cancelled")
        return
    
    try:
        # Drop all tables
        Base.metadata.drop_all(bind=engine)
        print("✅ Successfully dropped all tables!")
        print(f"   Dropped: {', '.join(Base.metadata.tables.keys())}")
    except Exception as e:
        print(f"❌ Error dropping tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    drop_all_tables()