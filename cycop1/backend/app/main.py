# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    title="Simple API",
    description="Minimal FastAPI server with only health endpoint",
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
#         ONLY THIS
# -----------------------------
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
