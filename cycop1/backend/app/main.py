from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from app.services.get_nodes import get_all_nodes
from app.services.get_layers import get_all_layers
from app.services.get_nodeplot import get_nodes_and_links_by_layer
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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # แก้เป็น frontend domain จริงถ้าต้องการ
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        return []  # fallback empty array

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
