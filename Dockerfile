# ใช้ nginx เป็น base image
FROM nginx:alpine

# คัดลอกไฟล์ index.html ไปวางในโฟลเดอร์ของ nginx
COPY index.html /usr/share/nginx/html/index.html

# เปิด port 80
EXPOSE 80

# คำสั่งเริ่มต้น (ใช้ค่า default ของ nginx)
CMD ["nginx", "-g", "daemon off;"]
