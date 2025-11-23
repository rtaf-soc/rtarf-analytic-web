FROM node:20

WORKDIR /app/src

COPY package*.json ./

RUN npm install

COPY . .

# ลบ .env เก่า แล้วสร้างใหม่
RUN rm -f /app/src/.env && \
    echo "VITE_API_BASE_URL=https://defnex-api.please-scan.com" > /app/src/.env && \
    cat /app/src/.env

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]