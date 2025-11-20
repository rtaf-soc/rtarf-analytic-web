import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

# โหลดค่า .env
load_dotenv(".env")

API_PATH = os.getenv("API_PATH", "https://defnex-api.please-scan.com")
API_AUTHEN_PASSWORD = os.getenv("API_AUTHEN_PASSWORD", "v5QQY1WXhrV8")
ORG_ID = os.getenv("ORG_ID", "default")

def get_all_layers():
    """เรียก API GetLayers และ return JSON หรือ raw text"""
    api_path = f"api/Node/org/{ORG_ID}/action/GetLayers"
    url = f"{API_PATH}/{api_path}"
    print("Request →", url)

    response = requests.get(
        url,
        auth=HTTPBasicAuth(ORG_ID, API_AUTHEN_PASSWORD)
    )

    print("Status code:", response.status_code)
    print("Response text:", response.text[:500])  # debug แค่ 500 ตัวแรก

    response.raise_for_status()

    try:
        return response.json()
    except ValueError:
        print("Response is not JSON")
        return response.text

if __name__ == "__main__":
    layers = get_all_layers()
    print("Layers:", layers)
