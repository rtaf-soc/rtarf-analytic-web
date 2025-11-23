FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV VITE_API_BASE_URL=https://defnex-api.please-scan.com

EXPOSE 5173
CMD ["sh", "-c", "VITE_API_BASE_URL=$VITE_API_BASE_URL npm run dev -- --host"]
