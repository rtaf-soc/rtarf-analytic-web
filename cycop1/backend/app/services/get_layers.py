import os
import requests
from requests.auth import HTTPBasicAuth

API_PATH = os.getenv("API_PATH", "https://defnex-api.please-scan.com")
API_AUTHEN_PASSWORD = os.getenv("API_AUTHEN_PASSWORD", "v5QQY1WXhrV8")
ORG_ID = os.getenv("ORG_ID", "default")

def get_all_layers():
    url = f"{API_PATH}/api/Node/org/{ORG_ID}/action/GetLayers"

    response = requests.get(
        url,
        auth=HTTPBasicAuth(ORG_ID, API_AUTHEN_PASSWORD)
    )

    response.raise_for_status()
    return response.json()
