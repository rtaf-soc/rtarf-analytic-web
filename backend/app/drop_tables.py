# app/drop_tables.py
from app.database import Base, engine

Base.metadata.drop_all(bind=engine)
print("Dropped all tables!")
