# app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import time
import logging
from . import elastic_client, database, models, scheduler
from .routers import nodes, connections, rtarf_events, alerts, dashboard, network_graph, node_events

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    force=True
)
logger = logging.getLogger("app.main")

# สร้างตารางในฐานข้อมูล (รวม sync_metadata table)
models.Base.metadata.create_all(bind=database.engine)
scheduler.SyncMetadata.__table__.create(bind=database.engine, checkfirst=True)

# สร้าง FastAPI instance
app = FastAPI(
    title="Interactive Map & RTARF API",
    description="API สำหรับจัดการข้อมูลโหนดบนแผนที่และ RTARF Events",
    version="1.0.0"
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log incoming request
    logger.info(f"→ {request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Log response with status and time
    status_emoji = "✅" if response.status_code < 400 else "❌"
    logger.info(
        f"{status_emoji} {request.method} {request.url.path} → "
        f"{response.status_code} ({process_time:.3f}s)"
    )
    
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================================================
# Lifecycle Event Handlers
# ===============================================================

@app.on_event("startup")
async def startup_initialize():
    """Initialize connections and start scheduler on startup"""
    logger.info("🚀 Starting application...")
    
    # Start background scheduler
    scheduler.start_scheduler()
    
    # Optional: Run initial sync immediately
    # await scheduler.trigger_sync_now()

@app.on_event("shutdown")
async def shutdown_event():
    """Close connections and stop scheduler on shutdown"""
    logger.info("🛑 Shutting down application...")
    
    # Stop scheduler
    scheduler.stop_scheduler()
    
    # Close Elasticsearch connection
    await elastic_client.es.close()
    
    logger.info("✅ Shutdown complete")

# ===============================================================
# Include Routers
# ===============================================================

app.include_router(nodes.router, prefix="/nodes", tags=["Nodes"])
app.include_router(connections.router, prefix="/connections", tags=["Network Connections"])
app.include_router(rtarf_events.router, prefix="/rtarf-events", tags=["RTARF Events"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(network_graph.router, prefix="/network-graph", tags=["Network Graph"])
app.include_router(node_events.router, prefix="/node-events", tags=["Node Events"])

# ===============================================================
# Print Registered Routes
# ===============================================================

@app.on_event("startup")
async def startup_print_routes():
    """Print all registered routes on startup"""
    print("\n" + "="*50)
    print("🚀 API Routes Registered:")
    print("="*50)
    for route in app.routes:
        if hasattr(route, "methods"):
            methods = ",".join(route.methods)
            print(f"{methods:8} {route.path}")
    print("="*50 + "\n")

# ===============================================================
# Health Check & Scheduler Status
# ===============================================================

@app.get("/api/health", tags=["Health"])
def health_check():
    """
    ตรวจสอบสถานะของ API
    """
    return {"status": "healthy", "message": "API is running"}

@app.get("/api/scheduler/status", tags=["Scheduler"])
def get_scheduler_status():
    """
    Get scheduler status and scheduled jobs
    """
    return scheduler.get_scheduler_status()

@app.post("/api/scheduler/trigger-sync", tags=["Scheduler"])
async def trigger_manual_sync():
    """
    Manually trigger Elasticsearch sync
    """
    try:
        await scheduler.trigger_sync_now()
        return {"status": "success", "message": "Sync triggered successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/scheduler/trigger-cleanup", tags=["Scheduler"])
async def trigger_manual_cleanup():
    """
    Manually trigger old events cleanup
    """
    try:
        await scheduler.trigger_cleanup_now()
        return {"status": "success", "message": "Cleanup triggered successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/scheduler/trigger-alert-sync", tags=["Scheduler"])
async def trigger_manual_alert_sync():
    """
    Manually trigger alert sync from RtarfEvents
    """
    try:
        await scheduler.trigger_alert_sync_now()
        return {"status": "success", "message": "Alert sync triggered successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

