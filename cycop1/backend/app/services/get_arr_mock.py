import random

def get_arr_mock():
    routers = []
    
    # Loop สร้าง Router 5 ตัว (Router 1 ถึง Router 5)
    for i in range(1, 6):
        
        # สร้าง Threat 5 ตัว สำหรับ Router นี้
        threats = []
        for j in range(1, 6):
            threats.append({
                "threatName": f"THREAT #{j}",
                "threatDetail": f"28{i:02d}{j:02d}OCT24", # Gen วันที่หลอกๆ ให้ไม่ซ้ำกัน
                "serverity": None, # ตามที่คุณต้องการ (หรือใส่ "critical", "high" เพื่อ test สี)
                "incidentID": f"INC-{i}-{j}", # ID แบบไม่ซ้ำ เช่น INC-1-1
                "quantity": 0,
                "percentage": 0
            })

        # นำ Threat ทั้ง 5 ไปใส่ใน Router Object
        routers.append({
            "id": f"router-{i}",
            "name": f"Router {i}", # ชื่อ Router
            "status": "warning",   # สถานะ Router (mock ไว้ก่อน)
            "stats": { "critical": 0, "high": 0, "medium": 0, "low": 5 },
            "threat_list": threats # <--- array threat 5 ตัว อยู่ในนี้
        })

    return routers