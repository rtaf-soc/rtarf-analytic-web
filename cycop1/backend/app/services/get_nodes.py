import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv(".env")
# โหลดค่าจาก env
API_PATH = os.getenv("API_PATH", "https://defnex-api.please-scan.com")
API_AUTHEN_PASSWORD = os.getenv("API_AUTHEN_PASSWORD", "v5QQY1WXhrV8")
ORG_ID = os.getenv("ORG_ID", "default")

def get_all_nodes(full_text_search=""):
    url = f"{API_PATH}/api/Node/org/{ORG_ID}/action/GetNodes"
    payload = {"FullTextSearch": full_text_search}
    
    response = requests.post(
        url,
        json=payload,
        auth=HTTPBasicAuth(ORG_ID, API_AUTHEN_PASSWORD)
    )
    
    if response.status_code != 200:
        raise Exception(f"API error {response.status_code}: {response.text}")
    
    return response.json()

if __name__ == "__main__":
    nodes = get_all_nodes()
    for node in nodes:
        print(node)
