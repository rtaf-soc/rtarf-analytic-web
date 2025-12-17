from datetime import datetime, timedelta

def get_kill_chain_mock_data(day_range: int = 7):
    """
    สร้างข้อมูล Mock สำหรับ Cyber Kill Chain
    เพื่อให้ Frontend นำไปแสดงผลระหว่างรอต่อ Database จริง
    """
    
    # คำนวณเวลา (Mock)
    now = datetime.now()
    start_time = now - timedelta(days=day_range)
    
    # ข้อมูล Phase ต่างๆ (แปลจาก Mock Data เดิม)
    phases = [
        {
            "phase_id": "reconnaissance",
            "phase_name": "Reconnaissance",
            "phase_name_th": "การสอดแนม",
            "total_detections": 1250,
            "sources": {"firewall_logs": 800, "dns_logs": 450, "crowdstrike": 0},
            "detection_methods": ["Port Scan", "Whois Query", "Email Scrape"],
            "top_detection_sources": [
                {"source_text": "External Port Scan Attempt", "count": 700, "source_type": "event_name"},
                {"source_text": "Unusual DNS Query Volume", "count": 350, "source_type": "alert_category"},
                {"source_text": "High-volume external traffic", "count": 200, "source_type": "event_objective"},
            ],
        },
        {
            "phase_id": "weaponization",
            "phase_name": "Weaponization",
            "phase_name_th": "การสร้างอาวุธ",
            "total_detections": 0,
            "sources": {},
            "detection_methods": [],
            "top_detection_sources": [],
        },
        {
            "phase_id": "delivery",
            "phase_name": "Delivery",
            "phase_name_th": "การนำส่ง",
            "total_detections": 420,
            "sources": {"email_gateway": 300, "palo-xsiam": 120},
            "detection_methods": ["Malicious Attachment", "Phishing Link", "Dropper"],
            "top_detection_sources": [
                {"source_text": "Blocked Malicious Attachment", "count": 250, "source_type": "alert_category"},
                {"source_text": "User Clicked Phishing Link", "count": 100, "source_type": "event_name"},
                {"source_text": "Unusual File Download", "count": 70, "source_type": "event_objective"},
            ],
        },
        {
            "phase_id": "exploitation",
            "phase_name": "Exploitation",
            "phase_name_th": "การใช้ประโยชน์",
            "total_detections": 150,
            "sources": {"suricata": 80, "crowdstrike": 70},
            "detection_methods": ["Shellcode", "RCE", "SQLi"],
            "top_detection_sources": [
                {"source_text": "Web Shell Execution Attempt", "count": 70, "source_type": "event_name"},
                {"source_text": "Suspicious Remote Command", "count": 60, "source_type": "alert_category"},
                {"source_text": "Exploit Public-Facing App", "count": 20, "source_type": "event_objective"},
            ],
        },
        {
            "phase_id": "installation",
            "phase_name": "Installation",
            "phase_name_th": "การติดตั้ง",
            "total_detections": 45,
            "sources": {"crowdstrike": 40, "registry_logs": 5},
            "detection_methods": ["New Service", "Registry Change", "Persistence"],
            "top_detection_sources": [
                {"source_text": "New Service Created", "count": 25, "source_type": "event_name"},
                {"source_text": "Registry Key Modified", "count": 10, "source_type": "alert_category"},
                {"source_text": "Defense Evasion", "count": 10, "source_type": "event_objective"},
            ],
        },
        {
            "phase_id": "command_control",
            "phase_name": "Command and Control",
            "phase_name_th": "การควบคุมและสั่งการ",
            "total_detections": 20,
            "sources": {"proxy_logs": 15, "palo-xsiam": 5},
            "detection_methods": ["C2 Beacon", "HTTPS Tunnel", "DNS Tunnel"],
            "top_detection_sources": [
                {"source_text": "Connection to Known C2 IP", "count": 15, "source_type": "event_objective"},
                {"source_text": "Unusual Outbound Traffic", "count": 5, "source_type": "alert_category"},
            ],
        },
        {
            "phase_id": "actions_objectives",
            "phase_name": "Actions on Objectives",
            "phase_name_th": "การปฏิบัติการตามเป้าหมาย",
            "total_detections": 5,
            "sources": {"dlp_system": 5},
            "detection_methods": ["Data Exfil", "Ransomware", "Lateral Move"],
            "top_detection_sources": [
                {"source_text": "Attempted Sensitive Data Exfil", "count": 5, "source_type": "alert_category"},
            ],
        },
    ]

    # คำนวณ Total และ Active Phases
    total_detections = sum(p['total_detections'] for p in phases)
    active_phases = sum(1 for p in phases if p['total_detections'] > 0)

    return {
        "phases": phases,
        "total_detections": total_detections,
        "time_range": {
            "start": start_time.isoformat(),
            "end": now.isoformat()
        },
        "active_phases": active_phases,
        "methodology": "Cyber Kill Chain (Mock Data)"
    }