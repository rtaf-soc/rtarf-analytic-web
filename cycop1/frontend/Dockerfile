# Frontend Dockerfile (Production-ready)
FROM node:20

# Set working directory
WORKDIR /app/src

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files (รวม .env.production)
COPY . .

# Build production frontend
RUN npm run build

# Serve production bundle
RUN npm install -g serve

# Serve /dist folder on port 80
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
