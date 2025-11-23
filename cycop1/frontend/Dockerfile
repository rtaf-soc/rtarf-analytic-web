# Dockerfile (Production-Ready)

FROM node:20

WORKDIR /app

# รับค่า Build Arguments
ARG VITE_API_BASE_URL
ARG API_AUTHEN_PASSWORD
ARG ORG_ID

# ตั้งเป็น Environment Variables
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV API_AUTHEN_PASSWORD=$API_AUTHEN_PASSWORD
ENV ORG_ID=$ORG_ID

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application (จะ embed ENV ลงใน build files)
RUN npm run build

# Expose port
EXPOSE 5173

# Run production preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]