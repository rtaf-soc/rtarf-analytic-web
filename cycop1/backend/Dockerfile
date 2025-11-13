# ใช้ Python slim image
FROM python:3.12-slim

# ตั้ง working directory
WORKDIR /app

# คัดลอก requirements
COPY requirement.txt .

# ติดตั้ง dependencies
RUN pip install --no-cache-dir -r requirement.txt

# คัดลอก source code ทั้งหมด
COPY app/ ./app/

# กำหนด environment variable (optional)
ENV PYTHONUNBUFFERED=1

# รัน Uvicorn พร้อม bind ทุก interface
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
