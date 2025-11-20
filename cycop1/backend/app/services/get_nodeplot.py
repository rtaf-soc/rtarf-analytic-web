#!/usr/bin/env python3
import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv(".env")

API_PATH = os.getenv("API_PATH", "https://defnex-api.please-scan.com")
ORG_ID = os.getenv("ORG_ID", "default")
API_AUTHEN_PASSWORD = os.getenv("API_AUTHEN_PASSWORD", "")

def make_request(method, api_url, params=None):
    """Make HTTP request to API with BasicAuth"""
    url = f"{API_PATH}/{api_url}"
    try:
        if method.lower() == "get":
            response = requests.get(url, params=params, auth=HTTPBasicAuth(ORG_ID, API_AUTHEN_PASSWORD))
        else:
            response = requests.post(url, json=params, auth=HTTPBasicAuth(ORG_ID, API_AUTHEN_PASSWORD))
        response.raise_for_status()
        print(f"[DEBUG] Request successful: {url}")
        try:
            data = response.json()
            print(f"[DEBUG] Response: {data if isinstance(data, list) else str(data)[:200]}")  # show preview
            return data
        except Exception as e:
            print(f"[ERROR] Failed to parse JSON from {url}: {e}")
            return []
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Request failed: {url} -> {e}")
        return []

def get_nodes_and_links_by_layer(layer):
    """Fetch nodes, status, and links for a given layer"""
    
    # 1. Get nodes
    api_url_get_nodes = f"api/Node/org/{ORG_ID}/action/GetNodesByLayer/{layer}"
    print(f"[DEBUG] Fetching nodes from layer: {layer}")
    nodes = make_request("get", api_url_get_nodes) or []

    if not nodes:
        print(f"[DEBUG] No nodes returned for layer: {layer}")

    # 2. Get node status
    api_url_get_nodes_status = f"api/Node/org/{ORG_ID}/action/GetNodesStatus/{layer}"
    print(f"[DEBUG] Fetching node status for layer: {layer}")
    nodes_status = make_request("get", api_url_get_nodes_status) or []

    # 3. Create node_hash and status_hash
    node_hash = {node.get("id"): node for node in nodes if node.get("id")}
    status_hash = {status.get("nodeId"): status for status in nodes_status if status.get("nodeId")}

    # 4. Fetch links for each node
    links = []
    for node in nodes:
        node_id = node.get("id")
        if not node_id:
            continue
        api_url_get_node_links = f"api/Node/org/{ORG_ID}/action/GetNodeLinks/{node_id}"
        node_links = make_request("get", api_url_get_node_links) or []
        links.extend(node_links)

    print(f"[DEBUG] Total nodes: {len(nodes)}, Total links: {len(links)}")
    
    # 5. Debug printing like Ruby
    for node_id, node in node_hash.items():
        node_name = node.get("name", "Unknown")
        lat = node.get("latitude", 0)
        lon = node.get("longitude", 0)
        status_str = status_hash.get(node_id, {}).get("status", "")
        print(f"[DEBUG] Plotting node [{node_name}], lat=[{lat}], lon=[{lon}], nodeId=[{node_id}], status=[{status_str}]")
    
    for link in links:
        src_id = link.get("sourceNode")
        dst_id = link.get("destinationNode")
        if src_id in node_hash and dst_id in node_hash:
            print(f"[DEBUG] Plotting link [{node_hash[src_id]['name']}] ==> [{node_hash[dst_id]['name']}]")

    return {
        "nodes": nodes,
        "links": links,
        "node_hash": node_hash,
        "status_hash": status_hash
    }


# -----------------------------
# Example usage
# -----------------------------
if __name__ == "__main__":
    layer = os.getenv("LAYER", "RTARF-Internal")  # ใช้ชื่อ layer ตรงตาม GetLayers()
    print(f"Starting to fetch data for layer: {layer}")
    data = get_nodes_and_links_by_layer(layer)
    print(f"[INFO] Fetched data: nodes={len(data['nodes'])}, links={len(data['links'])}")
