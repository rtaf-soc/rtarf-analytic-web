# Frontend Dockerfile
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Default command for development (change to "npm run build" for production)
CMD ["npm", "run", "dev", "--", "--host"]