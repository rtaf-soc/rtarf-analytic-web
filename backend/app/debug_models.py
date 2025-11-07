# app/debug_models.py

# Import ทุกอย่างที่จำเป็นเพื่อจำลองการทำงาน
from . import models

print("--- Inspecting SQLAlchemy Metadata ---")
print(f"All tables known to Base.metadata: {models.Base.metadata.tables.keys()}")
print("-" * 40)

# เข้าถึงตาราง node_positions โดยตรง
node_positions_table = models.Base.metadata.tables.get('node_positions')

if node_positions_table is not None:
    print("Indexes found for 'node_positions' table:")
    
    # วนลูปดู Index ทั้งหมดที่ผูกกับตารางนี้
    for index in node_positions_table.indexes:
        print(f"  - Index Name: {index.name}")
        print(f"    Columns: {[c.name for c in index.columns]}")
        print(f"    Is Unique: {index.unique}")
        print(f"    PostgreSQL 'using': {index.dialect_options['postgresql']['using']}")
        print("-" * 20)
else:
    print("Could not find 'node_positions' table in metadata.")

print("--- Inspection Complete ---")

