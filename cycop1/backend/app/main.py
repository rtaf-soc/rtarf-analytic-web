from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from app.services.get_nodes import get_all_nodes
from app.services.get_layers import get_all_layers
from app.services.get_nodeplot import get_nodes_and_links_by_layer
# from . import elastic_client, database, models, scheduler
# from .routers import nodes, connections, rtarf_events, alerts, dashboard, network_graph, node_events
import json
import logging
import time

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    force=True
)
logger = logging.getLogger("app.main")

# FastAPI instance
app = FastAPI(
    title="Defensive Operator API",
    description="API for nodes, layers, and nodeplot",
    version="1.0.0"
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    logger.info(f"→ {request.method} {request.url.path}")

    response = await call_next(request)

    process_time = time.time() - start_time
    status_emoji = "✅" if response.status_code < 400 else "❌"
    logger.info(
        f"{status_emoji} {request.method} {request.url.path} → "
        f"{response.status_code} ({process_time:.3f}s)"
    )

    return response

allowed_origins = [
    "https://defnex-analytic.please-scan.com",
    "http://localhost:5173",      # ไว้ dev
]

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# @app.on_event("startup")
# async def startup_initialize():
#     """Initialize connections and start scheduler on startup"""
#     logger.info("🚀 Starting application...")
    
#     # Start background scheduler
#     scheduler.start_scheduler()
    
#     # Optional: Run initial sync immediately
#     # await scheduler.trigger_sync_now()

# @app.on_event("shutdown")
# async def shutdown_event():
#     """Close connections and stop scheduler on shutdown"""
#     logger.info("🛑 Shutting down application...")
    
#     # Stop scheduler
#     scheduler.stop_scheduler()
    
#     # Close Elasticsearch connection
#     await elastic_client.es.close()
    
#     logger.info("✅ Shutdown complete")

# # ===============================================================
# # Include Routers
# # ===============================================================

# app.include_router(nodes.router, prefix="/nodes", tags=["Nodes"])
# app.include_router(connections.router, prefix="/connections", tags=["Network Connections"])
# app.include_router(rtarf_events.router, prefix="/rtarf-events", tags=["RTARF Events"])
# app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
# app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
# app.include_router(network_graph.router, prefix="/network-graph", tags=["Network Graph"])
# app.include_router(node_events.router, prefix="/node-events", tags=["Node Events"])

# # ===============================================================
# # Print Registered Routes
# # ===============================================================

# @app.on_event("startup")
# async def startup_print_routes():
#     """Print all registered routes on startup"""
#     print("\n" + "="*50)
#     print("🚀 API Routes Registered:")
#     print("="*50)
#     for route in app.routes:
#         if hasattr(route, "methods"):
#             methods = ",".join(route.methods)
#             print(f"{methods:8} {route.path}")
#     print("="*50 + "\n")

# ===============================================================
# Health Check & Scheduler Status
# ===============================================================

# Routes
@app.get("/api/health", tags=["Health"])
def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy"}

@app.get("/api/nodes", tags=["Nodes"])
def get_nodes():
    """Return all nodes"""
    return get_all_nodes()

@app.get("/api/layers", tags=["Layers"])
def get_layers():
    """Return all layers with name and value"""
    raw_layers = get_all_layers()
    layers = [{"name": item["name"], "value": item["value"]} for item in raw_layers]
    return layers

@app.get("/api/nodeplot", tags=["NodePlot"])
def nodeplot(layer: str = Query(..., description="Layer name")):
    """Return nodes and links for a specific layer"""
    data = get_nodes_and_links_by_layer(layer)
    if not data or not data.get('nodes'):
        return [] 

    nodes_list = []
    for node_id, node in data['node_hash'].items():
        status_json_str = data['status_hash'].get(node_id, {}).get('status', '{}')
        try:
            status = json.loads(status_json_str) if status_json_str else {}
        except Exception:
            status = {}

        linked_nodes = []
        for link in data['links']:
            if link.get('sourceNode') == node_id and link.get('destinationNode'):
                linked_nodes.append(link['destinationNode'])
            elif link.get('destinationNode') == node_id and link.get('sourceNode'):
                linked_nodes.append(link['sourceNode'])

        nodes_list.append({
            "id": node_id,
            "name": node.get("name"),
            "latitude": node.get("latitude"),
            "longitude": node.get("longitude"),
            "status": status,
            "links": linked_nodes
        })

    return nodes_list

@app.get("/api/defstatus", tags=["DefconStatus"])
def get_defcon_status():
    from app.services.get_defcon_status import call_api, ORG_ID
    return call_api(f"api/Analytic/org/{ORG_ID}/action/GetDefConStatus")

@app.get("/api/reconcountry", tags=["ReconCountries"])
def get_threat_alerts():
    from app.services.get_recon_countries import call_api, ORG_ID
    return call_api(f"api/Analytic/org/{ORG_ID}/action/GetReconCountries")

@app.get("/api/threatdistributions", tags=["ThreatDistributions"])
def get_threat_alerts():
    from app.services.get_threat_distributions import call_api, ORG_ID
    return call_api(f"api/Analytic/org/{ORG_ID}/action/GetThreatDistributions")

@app.get("/api/threatalerts", tags=["ThreatAlerts"])
def get_threat_alerts():
    from app.services.get_threat_alerts import call_api, ORG_ID
    return call_api(f"api/Analytic/org/{ORG_ID}/action/GetThreatAlerts")

# @app.get("/api/scheduler/status", tags=["Scheduler"])
# def get_scheduler_status():
#     """
#     Get scheduler status and scheduled jobs
#     """
#     return scheduler.get_scheduler_status()

# @app.post("/api/scheduler/trigger-sync", tags=["Scheduler"])
# async def trigger_manual_sync():
#     """
#     Manually trigger Elasticsearch sync
#     """
#     try:
#         await scheduler.trigger_sync_now()
#         return {"status": "success", "message": "Sync triggered successfully"}
#     except Exception as e:
#         return {"status": "error", "message": str(e)}

# @app.post("/api/scheduler/trigger-cleanup", tags=["Scheduler"])
# async def trigger_manual_cleanup():
#     """
#     Manually trigger old events cleanup
#     """
#     try:
#         await scheduler.trigger_cleanup_now()
#         return {"status": "success", "message": "Cleanup triggered successfully"}
#     except Exception as e:
#         return {"status": "error", "message": str(e)}

# @app.post("/api/scheduler/trigger-alert-sync", tags=["Scheduler"])
# async def trigger_manual_alert_sync():
#     """
#     Manually trigger alert sync from RtarfEvents
#     """
#     try:
#         await scheduler.trigger_alert_sync_now()
#         return {"status": "success", "message": "Alert sync triggered successfully"}
#     except Exception as e:
#         return {"status": "error", "message": str(e)}
