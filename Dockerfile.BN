FROM python:3.11-slim

# Install Node.js + Supervisord
RUN apt-get update && apt-get install -y curl supervisor && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

WORKDIR /app

# Backend Setup
COPY cycop1/backend/requirements.txt /app/cycop1/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/cycop1/backend/requirements.txt

COPY cycop1/backend /app/cycop1/backend

# Frontend Setup
WORKDIR /app/cycop1/frontend

COPY cycop1/frontend/package*.json ./
RUN npm install

COPY cycop1/frontend .

# Supervisord Config
WORKDIR /app
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000
EXPOSE 5173

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
