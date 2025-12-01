
def get_all_org_status():
    return [
        # --- 1. กองทัพบก (RTA) ---
        {
            "id": "rta",
            "name": "กองทัพบก",
            "short_name": "ทบ.",
            "status": "warning",
            "stats": { "critical": 1, "high": 1, "medium": 1, "low": 2 },
            "threat_list": [
                {
                    "threatName": "Unauthorized Drone Activity",
                    "threatDetail": "281025OCT24",
                    "serverity": "95", # Critical
                    "incidentID": "RTA-001",
                    "quantity": 1,
                    "percentage": 0
                },
                {
                    "threatName": "Radio Frequency Jamming",
                    "threatDetail": "281020OCT24",
                    "serverity": "75", # High
                    "incidentID": "RTA-002",
                    "quantity": 1,
                    "percentage": 0
                },
                {
                    "threatName": "Suspicious Vehicle near HQ",
                    "threatDetail": "280915OCT24",
                    "serverity": "50", # Medium
                    "incidentID": "RTA-003",
                    "quantity": 1,
                    "percentage": 0
                },
                {
                    "threatName": "Internal Network Latency",
                    "threatDetail": "280800OCT24",
                    "serverity": "20", # Low
                    "incidentID": "RTA-004",
                    "quantity": 1,
                    "percentage": 0
                },
                {
                    "threatName": "Routine Border Patrol Update",
                    "threatDetail": "280730OCT24",
                    "serverity": "10", # Low
                    "incidentID": "RTA-005",
                    "quantity": 1,
                    "percentage": 0
                }
            ]
        },
        # --- 2. กองทัพอากาศ (RTAF) ---
        {
            "id": "rtaf",
            "name": "กองทัพอากาศ",
            "short_name": "ทอ.",
            "status": "normal",
            "stats": { "critical": 0, "high": 1, "medium": 2, "low": 2 },
            "threat_list": [
                {
                    "threatName": "Unidentified Radar Signal",
                    "threatDetail": "281100OCT24",
                    "serverity": "78", # High
                    "incidentID": "RTAF-001",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Weather Sensor Malfunction",
                    "threatDetail": "281045OCT24",
                    "serverity": "55", # Medium
                    "incidentID": "RTAF-002",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Airbase Gate Sensor Check",
                    "threatDetail": "280930OCT24",
                    "serverity": "45", # Medium
                    "incidentID": "RTAF-003",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Flight Log Sync Delay",
                    "threatDetail": "280900OCT24",
                    "serverity": "30", # Low
                    "incidentID": "RTAF-004",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Maintenance Schedule Update",
                    "threatDetail": "280815OCT24",
                    "serverity": "15", # Low
                    "incidentID": "RTAF-005",
                    "quantity": 0,
                    "percentage": 0
                }
            ]
        },
        # --- 3. กองทัพเรือ (RTN) ---
        {
            "id": "rtn",
            "name": "กองทัพเรือ",
            "short_name": "ทร.",
            "status": "critical",
            "stats": { "critical": 2, "high": 2, "medium": 1, "low": 0 },
            "threat_list": [
                {
                    "threatName": "Undersea Cable Interference",
                    "threatDetail": "281200OCT24",
                    "serverity": "98", # Critical
                    "incidentID": "RTN-001",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Unauthorized Vessel detected",
                    "threatDetail": "281130OCT24",
                    "serverity": "90", # Critical
                    "incidentID": "RTN-002",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Port Scanner Detected",
                    "threatDetail": "281000OCT24",
                    "serverity": "75", # High
                    "incidentID": "RTN-003",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Sonar System Calibration",
                    "threatDetail": "280945OCT24",
                    "serverity": "65", # High
                    "incidentID": "RTN-004",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Docking System Offline",
                    "threatDetail": "280900OCT24",
                    "serverity": "55", # Medium
                    "incidentID": "RTN-005",
                    "quantity": 0,
                    "percentage": 0
                }
            ]
        },
        # --- 4. สำนักงานตำรวจแห่งชาติ (RTP) ---
        {
            "id": "rtp",
            "name": "สำนักงานตำรวจแห่งชาติ",
            "short_name": "ตร.",
            "status": "normal",
            "stats": { "critical": 0, "high": 0, "medium": 0, "low": 5 },
            "threat_list": [
                {
                    "threatName": "Traffic Cam System Check",
                    "threatDetail": "281010OCT24",
                    "serverity": "35", # Low
                    "incidentID": "RTP-001",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Patrol Unit Check-in",
                    "threatDetail": "280950OCT24",
                    "serverity": "25", # Low
                    "incidentID": "RTP-002",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Database Backup Completed",
                    "threatDetail": "280900OCT24",
                    "serverity": "20", # Low
                    "incidentID": "RTP-003",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Server Temperature Normal",
                    "threatDetail": "280830OCT24",
                    "serverity": "15", # Low
                    "incidentID": "RTP-004",
                    "quantity": 0,
                    "percentage": 0
                },
                {
                    "threatName": "Daily Report Generated",
                    "threatDetail": "280800OCT24",
                    "serverity": "10", # Low
                    "incidentID": "RTP-005",
                    "quantity": 0,
                    "percentage": 0
                }
            ]
        }
    ]