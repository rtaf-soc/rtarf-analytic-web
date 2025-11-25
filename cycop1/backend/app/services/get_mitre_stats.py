import os
import requests
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth

load_dotenv()

API_PATH = os.getenv("API_PATH")
API_KEY = os.getenv("API_AUTHEN_PASSWORD")
ORG_ID = "default"
print("API_PATH = ", API_PATH)
print("API_KEY = ", API_KEY)
print("ORG_ID = ", ORG_ID)

def call_api(path: str, payload: dict):
    url = f"{API_PATH}/{path}"

    headers = {
        "Content-Type": "application/json"
    }

    r = requests.post(
        url,
        json=payload,
        headers=headers,
        auth=HTTPBasicAuth("api", API_KEY)
    )

    if r.status_code != 200:
        return {"error": r.status_code, "message": r.text}

    return r.json()
