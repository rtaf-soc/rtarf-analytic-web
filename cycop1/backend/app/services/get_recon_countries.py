import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv(".env")

API_PATH = os.getenv("API_HTTP_ENDPOINT", "https://defnex-api.please-scan.com")
API_KEY = os.getenv("API_KEY", "")
ORG_ID = os.getenv("API_ORG", "default")

def call_api(api_name):
    url = f"{API_PATH}/{api_name}"

    print("Request →", url)

    try:
        response = requests.get(
            url,
            auth=HTTPBasicAuth("api", API_KEY), 
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        response.raise_for_status()
        return response.json()

    except Exception as e:
        return {"error": str(e)}

print(call_api(f"api/Analytic/org/{ORG_ID}/action/GetReconCountries"))

