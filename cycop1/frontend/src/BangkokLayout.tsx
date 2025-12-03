import { useState, useEffect } from "react";
import DefconBangkok from "./components/bangkoks/DefconBangkok";
// ✅ Import Interface UiThreatSummary ที่เราเพิ่งสร้างจาก BangkokThreat
import BangkokThreat, { type UiThreatSummary } from "./components/bangkoks/BangkokThreat";
import MapViewBangkok from "./components/bangkoks/MapViewBangkok";
import OverlayListBangkok from "./components/bangkoks/OverLaylistBangkok";

// Helper และ Types
import { mapScoreToSeverity } from "./components/mitreCard/mitreData";
import { type AlertBase } from "./types/defensive";

import "./index.css";

// Interface สำหรับรับค่าจาก API (Private interfaces สำหรับไฟล์นี้) - ของเดิม (RTARF)
interface ApiSeverityItem {
  serverity?: string;
  quantity?: number;
}

interface ApiAlertItem {
  threatName?: string;
  threatDetail?: string;
  incidentID?: string;
  serverity?: string; 
}

// ✅ (ใหม่) Interface สำหรับรับค่าจาก Python API (4 เหล่าทัพ)
interface OrgStatusApi {
  id: string; // "rta", "rtaf", "rtn", "rtp"
  name: string;
  short_name: string;
  status: string;
  message: string;
  stats: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  threat_list: Array<{
    threatName: string;    // เปลี่ยนเป็น threatName
    threatDetail: string;  // เพิ่ม threatDetail
    serverity: string | null; // เปลี่ยน key เป็น serverity (และรับ string หรือ null)
    incidentID: string;    // เพิ่ม incidentID
    quantity: number;
    percentage: number;
  }>;
}

const BangkokLayout = () => {
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  // ✅ State เก็บข้อมูลจริง RTARF (ของเดิม)
  const [realSummary, setRealSummary] = useState<UiThreatSummary | null>(null);
  const [realThreats, setRealThreats] = useState<AlertBase[]>([]);

  // ✅ (ใหม่) State เก็บข้อมูล 4 เหล่าทัพจาก Python API Mock Data
  const [orgStatuses, setOrgStatuses] = useState<OrgStatusApi[]>([]);

  // ✅ 1. Fetch ข้อมูลจาก API ของเราเอง (RTARF) + Python API (เหล่าทัพอื่น)
  useEffect(() => {
    const initData = async () => {
      try {
        const [severitiesRes, alertsRes] = await Promise.all([
          fetch('/api/severities'),
          fetch('/api/threatalerts')
        ]);

        const severitiesData = await severitiesRes.json();
        const alertsData = await alertsRes.json();

        // Map Summary Data
        const stats: UiThreatSummary = { critical: 0, high: 0, medium: 0, low: 0 };
        
        if (Array.isArray(severitiesData)) {
          severitiesData.forEach((item: ApiSeverityItem) => {
            const key = (item.serverity || '').toLowerCase();
            if (key.includes('critical')) stats.critical = item.quantity || 0;
            else if (key.includes('high')) stats.high = item.quantity || 0;
            else if (key.includes('medium')) stats.medium = item.quantity || 0;
            else if (key.includes('low')) stats.low = item.quantity || 0;
          });
        }
        setRealSummary(stats);

        // Map Threat List
        const rawAlerts = Array.isArray(alertsData.alerts) ? alertsData.alerts : (Array.isArray(alertsData) ? alertsData : []);
        
        const mappedThreats: AlertBase[] = rawAlerts.map((item: ApiAlertItem) => {
          const severityLabel = mapScoreToSeverity(item.serverity || "0");
          return {
            incident_id: item.incidentID || "N/A",
            description: item.threatName || "Unknown Threat",
            severity: severityLabel, 
            timestamp: new Date().toISOString(),
            event_id: item.incidentID || "0"
          };
        });

        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        mappedThreats.sort((a, b) => {
           const scoreA = severityOrder[a.severity as keyof typeof severityOrder] || 0;
           const scoreB = severityOrder[b.severity as keyof typeof severityOrder] || 0;
           return scoreB - scoreA;
        });

        setRealThreats(mappedThreats);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    // --- B. (ใหม่) Logic ดึงข้อมูล 4 เหล่าทัพจาก Python ---
    const fetchOrgData = async () => {
      try {
        // ยิงไปที่ API Python
        const response = await fetch("/api/bkkthreat");
        if (!response.ok) throw new Error("Failed to fetch python api");
        const data: OrgStatusApi[] = await response.json();
        setOrgStatuses(data);
      } catch (error) {
        console.error("Error fetching Python API:", error);
      }
    };

    initData();      
    fetchOrgData();  

    const interval = setInterval(fetchOrgData, 3000);
    return () => clearInterval(interval);

  }, []);

  // ✅ Helper Function: แปลงข้อมูล API เป็น Props ของการ์ด
  const getOrgDataProps = (targetId: string) => {
    const org = orgStatuses.find((o) => o.id === targetId);
    
    const emptySummary: UiThreatSummary = { critical: 0, high: 0, medium: 0, low: 0 };
    const emptyThreats: AlertBase[] = [];

    if (!org) return { summary: emptySummary, threats: emptyThreats };

    const summary: UiThreatSummary = org.stats;

    const threats: AlertBase[] = (org.threat_list || []).map((item) => {
      
      const scoreStr = item.serverity || "0";
      
      const severityLabel = mapScoreToSeverity(scoreStr);

      return {
        incident_id: item.incidentID,  
        description: item.threatName, 
        severity: severityLabel,       
        timestamp: item.threatDetail || new Date().toISOString(), 
        event_id: "0"
      };
    });

    return { summary, threats };
  };

  // เตรียมข้อมูลสำหรับแต่ละค่าย
  const rta = getOrgDataProps("rta");   // ทบ.
  const rtaf = getOrgDataProps("rtaf"); // ทอ.
  const rtn = getOrgDataProps("rtn");   // ทร.
  const rtp = getOrgDataProps("rtp");   // ตร.

  return (
    <div className="bg-black h-screen relative overflow-hidden">
      {/*ซ้าย*/}
      <div className="fixed left-0 top-0 h-auto z-40 w-60">
        <OverlayListBangkok mainMapBounds={mapBounds} />
      </div>

      {/*เนื้อหากลาง*/}
      <div className="ml-60 mr-60 h-full pb-[260px] overflow-auto">
        <MapViewBangkok onBoundsChange={setMapBounds} />
      </div>

      {/*ขวา*/}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-60">
        <DefconBangkok />
      </div>

      {/* ล่าง-Bangkok Threat แนวนอน */}
      <div className="fixed bottom-0 right-59 z-30 bg-black border-t border-gray-900 p-1 h-[260px]">
        <div className="flex items-center gap-2 h-full">
          
          {/* 🟢 1. กองบัญชาการกองทัพไทย (RTARF) -> ส่งข้อมูลจริง (เหมือนเดิม) */}
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองบัญชาการกองทัพไทย"
              filterSeverity="all"
              logoPath="../public/img/บก.ทท.png"
              backgroundColor="bg-yellow-700"
              borderColor="border-gray-700"
              dataSummary={realSummary} 
              dataThreats={realThreats}
            />
          </div>

          {/* 🟢 2. กองทัพบก -> ข้อมูลจาก Python */}
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพบก"
              filterSeverity="all" 
              logoPath="../public/img/ทบ.png"
              backgroundColor="bg-green-700"
              borderColor="border-gray-700"
              dataSummary={rta.summary}    
              dataThreats={rta.threats}    
            />
          </div>

          {/* 🔵 3. กองทัพอากาศ -> ข้อมูลจาก Python */}
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพอากาศ"
              filterSeverity="all"
              logoPath="../public/img/ทอ.png"
              backgroundColor="bg-blue-600"
              borderColor="border-gray-700"
              dataSummary={rtaf.summary}
              dataThreats={rtaf.threats}
            />
          </div>

          {/* 🔵 4. กองทัพเรือ -> ข้อมูลจาก Python */}
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพเรือ"
              filterSeverity="all"
              logoPath="../public/img/ทร.png"
              backgroundColor="bg-blue-900"
              borderColor="border-gray-700"
              dataSummary={rtn.summary}
              dataThreats={rtn.threats}
            />
          </div>

          {/* 🔴 5. สำนักงานตำรวจแห่งชาติ -> ข้อมูลจาก Python */}
          <div className="flex-shrink-0">
            <BangkokThreat
              title="สำนักงานตำรวจแห่งชาติ"
              filterSeverity="all"
              logoPath="../public/img/ตอ.png"
              backgroundColor="bg-red-800"
              borderColor="border-gray-700"
              dataSummary={rtp.summary}
              dataThreats={rtp.threats}
            />
          </div>
        
        </div>
      </div>
    </div>
  );
};

export default BangkokLayout;