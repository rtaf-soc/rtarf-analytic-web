# app/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import time
import logging
from . import elastic_client, database, models
from .routers import nodes, connections, rtarf_events, alerts, dashboard, network_graph

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# สร้างตารางในฐานข้อมูล
models.Base.metadata.create_all(bind=database.engine)

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

# Lifecycle event handlers
@app.on_event("startup")
async def startup_event():
    """Initialize connections on startup"""
    pass

@app.on_event("shutdown")
async def shutdown_event():
    """Close connections on shutdown"""
    await elastic_client.es.close()

# Include routers (they will show in terminal and /docs)
app.include_router(nodes.router, prefix="/nodes", tags=["Nodes"])
app.include_router(connections.router, prefix="/connections", tags=["Network Connections"])
app.include_router(rtarf_events.router, prefix="/rtarf-events", tags=["RTARF Events"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(network_graph.router, prefix="/network-graph", tags=["Network Graph"])

# Optional: Print all registered routes on startup
@app.on_event("startup")
async def startup_event():
    """Initialize connections on startup"""
    print("\n" + "="*50)
    print("🚀 API Routes Registered:")
    print("="*50)
    for route in app.routes:
        if hasattr(route, "methods"):
            methods = ",".join(route.methods)
            print(f"{methods:8} {route.path}")
    print("="*50 + "\n")

# ===============================================================
# Health Check
# ===============================================================

@app.get("/health", tags=["Health"])
def health_check():
    """
    ตรวจสอบสถานะของ API
    """
    return {"status": "healthy", "message": "API is running"}