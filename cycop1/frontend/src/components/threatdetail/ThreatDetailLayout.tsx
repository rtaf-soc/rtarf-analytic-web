import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Menu } from "lucide-react"; // ✅ Import ไอคอน Hamburger Menu
import "leaflet/dist/leaflet.css";

// Import Components
import { Sidebar } from "./SideBar";
import { TopHeader } from "./TopHeader";
import { GlobalThreatStats } from "./GlobalThreatStats";
import { RelatedIncidents } from "./RelatedIncidents";
import { ThreatMainBanner } from "./ThreatMainBanner";
import { ThreatAnalysisGrid } from "./ThreatAnalysisGrid";
import { LoadingScreen } from "./LoadingScreen";

// Import Service
import { fetchThreatAlerts } from "../../services/defensiveService";

// Interface
interface ApiThreatResponse {
  threatName: string;
  threatDetail: string;
  serverity: string | null;
  incidentID: string;
  quantity: number;
  percentage: number;
}

// Mock Data (คงเดิม)
const threatDatabase: Record<string, any> = {
  "1": { 
    id: "INC-00001",
    title: "THREAT #5 - Unauthorized Access",
    subtitle: "Suspicious login attempt detected on critical server",
    severity_label: "H", severity_score: 75, severity_full: "HIGH",
    status: "ACTIVE", status_duration: "2 hours",
    timestamp: "2024-10-28T10:30:00Z",
    attacker_ip: "203.144.1.5", attacker_location: "Bangkok, Thailand",
    target_asset: "Financial DB Server", detection_source: "SIEM Log",
    technique: "Brute Force (T1110)",
    description: "ตรวจพบการพยายามล็อกอินผิดพลาดเกิน 50 ครั้ง ในเวลา 1 นาที บนเครื่อง Server การเงิน",
    automations: ["Lock User Account", "Block IP Address"],
  },
  "2": { 
    id: "INC-00002",
    title: "THREAT #4 - Malware Outbreak",
    subtitle: "Ransomware signature detected in file share",
    severity_label: "C", severity_score: 98, severity_full: "CRITICAL",
    status: "CONTAINED", status_duration: "45 mins",
    timestamp: "2024-10-28T09:42:00Z",
    attacker_ip: "192.168.1.50", attacker_location: "Internal Network",
    target_asset: "File Share Server", detection_source: "Endpoint Protection",
    technique: "Data Encrypted for Impact (T1486)",
    description: "พบไฟล์นามสกุล .enc ถูกสร้างขึ้นจำนวนมาก คาดว่าเป็น Ransomware สายพันธุ์ใหม่",
    automations: ["Isolate Host", "Snapshot Recovery"],
  },
  "70": { 
    id: "INC-00070",
    title: "THREAT #3 - Data Exfiltration",
    subtitle: "Large data transfer to unknown external IP",
    severity_label: "M", severity_score: 55, severity_full: "MEDIUM",
    status: "INVESTIGATING", status_duration: "5 hours",
    timestamp: "2024-10-28T05:35:00Z",
    attacker_ip: "8.8.4.4", attacker_location: "Unknown",
    target_asset: "Workstation-Admin", detection_source: "Network DLP",
    technique: "Exfiltration Over C2 Channel (T1041)",
    description: "มีการส่งข้อมูลขนาด 5GB ออกไปยัง IP ปลายทางที่ไม่รู้จักผ่านพอร์ต 443",
    automations: ["Throttle Bandwidth", "Capture Packet"],
  },
  "15": { 
    id: "INC-00015",
    title: "THREAT #2 - Policy Violation",
    severity_label: "L", severity_score: 20, severity_full: "LOW",
    status: "RESOLVED", status_duration: "1 day",
    timestamp: "2024-10-28T01:03:00Z",
    attacker_ip: "-", attacker_location: "Internal",
    target_asset: "User Laptop", detection_source: "Compliance Scan",
    technique: "-",
    description: "ตรวจพบการติดตั้งโปรแกรมที่ไม่ได้รับอนุญาต (Unauthorized Software)",
    automations: ["Notify User"],
  },
  "21": { 
    id: "INC-00021",
    title: "THREAT #1 - System Reboot",
    severity_label: "L", severity_score: 10, severity_full: "LOW",
    status: "CLOSED", status_duration: "-",
    timestamp: "2024-10-27T23:15:00Z",
    attacker_ip: "-", attacker_location: "-",
    target_asset: "Server Farm", detection_source: "Health Monitor",
    technique: "-",
    description: "Server ทำการ Reboot ตัวเองตาม Schedule Patch Update",
    automations: [],
  },
  "DEFAULT": {
    id: "UNKNOWN",
    title: "Threat Details Not Found",
    severity_label: "?", severity_score: 0, severity_full: "UNKNOWN",
    status: "UNKNOWN", status_duration: "-",
    timestamp: new Date().toISOString(),
    attacker_ip: "-", attacker_location: "-",
    target_asset: "-", detection_source: "-",
    technique: "-",
    description: "ไม่พบข้อมูลรายละเอียดของ Incident ID นี้ หรือข้อมูลอาจยังไม่ถูก Sync เข้าระบบ",
    automations: [],
  }
};

const recentAlerts = [
  { id: "INC-00001", label: "H", score: 75, title: "Unauthorized Access", time: "2 hrs ago", color: "orange" },
  { id: "INC-00002", label: "C", score: 98, title: "Malware Outbreak", time: "3 hrs ago", color: "red" },
  { id: "INC-00070", label: "M", score: 55, title: "Data Exfiltration", time: "5 hrs ago", color: "yellow" },
  { id: "INC-00015", label: "L", score: 20, title: "Policy Violation", time: "1 day ago", color: "blue" },
];

const initialStats = [
  { label: "CRITICAL", count: 0, color: "text-red-500", bg: "bg-red-950/40", border: "border-red-900/50" },
  { label: "HIGH", count: 0, color: "text-orange-500", bg: "bg-orange-950/40", border: "border-orange-900/50" },
  { label: "MEDIUM", count: 0, color: "text-yellow-500", bg: "bg-yellow-950/40", border: "border-yellow-900/50" },
  { label: "LOW", count: 0, color: "text-blue-500", bg: "bg-blue-950/40", border: "border-blue-900/50" },
];

const ThreatDetailLayout: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState(initialStats);
  const [searchParams] = useSearchParams();
  const incidentId = searchParams.get("id");

  // ✅ 1. เพิ่ม State สำหรับควบคุม Sidebar บนมือถือ
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const selectedData = incidentId && threatDatabase[incidentId] 
    ? threatDatabase[incidentId] 
    : threatDatabase["DEFAULT"];

  useEffect(() => {
    const calculateStats = async () => {
      try {
        const response = await fetchThreatAlerts();
        const rawData = response as unknown as ApiThreatResponse[];
        const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        rawData.forEach((item) => {
          const severity = item.serverity ? item.serverity.toUpperCase() : "LOW";
          if (severity === "CRITICAL") counts.CRITICAL++;
          else if (severity === "HIGH") counts.HIGH++;
          else if (severity === "MEDIUM") counts.MEDIUM++;
          else counts.LOW++; 
        });
        setGlobalStats([
          { label: "CRITICAL", count: counts.CRITICAL, color: "text-red-500", bg: "bg-red-950/40", border: "border-red-900/50" },
          { label: "HIGH", count: counts.HIGH, color: "text-orange-500", bg: "bg-orange-950/40", border: "border-orange-900/50" },
          { label: "MEDIUM", count: counts.MEDIUM, color: "text-yellow-500", bg: "bg-yellow-950/40", border: "border-yellow-900/50" },
          { label: "LOW", count: counts.LOW, color: "text-blue-500", bg: "bg-blue-950/40", border: "border-blue-900/50" },
        ]);
      } catch (error) {
        console.error("Failed to load stats:", error);
      }
    };
    calculateStats();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => { setIsLoading(false); }, 2000);
    return () => clearTimeout(timer);
  }, [incidentId]);

  if (isLoading) { return <LoadingScreen />; }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-black overflow-hidden font-sans text-slate-300">
      
      {/* ✅ 2. Sidebar: ไม่ต้องซ่อนแล้ว (Sidebar จัดการตัวเองด้วย props) */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>

        {/* ✅ 3. Mobile Header Bar: แสดงเฉพาะมือถือ (md:hidden) เพื่อให้มีปุ่มกดเปิดเมนู */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-950/80 border-b border-slate-900 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Menu size={24} />
            </button>
            <span className="font-bold text-blue-400 tracking-wider">CYBER DEFENSE</span>
          </div>
          <div className="text-xs text-slate-500 font-mono">RTARF v2.0</div>
        </div>

        <TopHeader caseId={selectedData.id} />

        <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 scrollbar-hide">
          
          <div className="animate-enter delay-100 hover:scale-[1.01] transition-transform duration-300">
            <GlobalThreatStats stats={globalStats} />
          </div>
          
          <div className="animate-enter delay-200">
            <RelatedIncidents alerts={recentAlerts} />
          </div>

          <div className="animate-enter delay-300 hover:brightness-110 transition-all duration-500">
            <ThreatMainBanner data={selectedData} />
          </div>

          <div className="animate-enter delay-400">
            <ThreatAnalysisGrid data={selectedData} />
          </div>

        </div>
      </main>
    </div>
  );
};

export default ThreatDetailLayout;