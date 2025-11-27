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

// Interface สำหรับรับค่าจาก API (Private interfaces สำหรับไฟล์นี้)
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

const BangkokLayout = () => {
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  // ✅ State เก็บข้อมูลจริง (ใช้ Type UiThreatSummary)
  const [realSummary, setRealSummary] = useState<UiThreatSummary | null>(null);
  const [realThreats, setRealThreats] = useState<AlertBase[]>([]);

  // ✅ 1. Fetch ข้อมูลจาก API ของเราเอง
  useEffect(() => {
    const initData = async () => {
      try {
        const [severitiesRes, alertsRes] = await Promise.all([
          fetch('/api/severities'),
          fetch('/api/threatalerts')
        ]);

        const severitiesData = await severitiesRes.json();
        const alertsData = await alertsRes.json();

        // --- A. Map Summary Data ---
        const stats: UiThreatSummary = { critical: 0, high: 0, medium: 0, low: 0 };
        
        if (Array.isArray(severitiesData)) {
          severitiesData.forEach((item: ApiSeverityItem) => {
            const key = (item.serverity || '').toLowerCase();
            // Map ตาม keyword ที่ API ส่งมา
            if (key.includes('critical')) stats.critical = item.quantity || 0;
            else if (key.includes('high')) stats.high = item.quantity || 0;
            else if (key.includes('medium')) stats.medium = item.quantity || 0;
            else if (key.includes('low')) stats.low = item.quantity || 0;
          });
        }
        setRealSummary(stats);

        // --- B. Map Threat List ---
        const rawAlerts = Array.isArray(alertsData.alerts) ? alertsData.alerts : (Array.isArray(alertsData) ? alertsData : []);
        
        const mappedThreats: AlertBase[] = rawAlerts.map((item: ApiAlertItem) => {
          // แปลงคะแนนตัวเลข (เช่น "95") เป็น Label (เช่น "critical")
          const severityLabel = mapScoreToSeverity(item.serverity || "0");

          return {
            incident_id: item.incidentID || "N/A",
            description: item.threatName || "Unknown Threat",
            severity: severityLabel, 
            timestamp: new Date().toISOString(),
            event_id: item.incidentID || "0"
          };
        });

        // เรียงลำดับ Critical ขึ้นก่อน
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
    initData();
  }, []);

  // ✅ 2. สร้างข้อมูลว่าง (Empty Data) สำหรับเหล่าทัพอื่น
  const emptySummary: UiThreatSummary = { critical: 0, high: 0, medium: 0, low: 0 };
  const emptyThreats: AlertBase[] = [];

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
          
          {/* 🟢 1. กองบัญชาการกองทัพไทย (RTARF) -> ส่งข้อมูลจริง */}
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

          {/* ⚪ 2. กองทัพบก -> ส่งข้อมูลว่าง */}
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพบก"
              filterSeverity="medium"
              logoPath="../public/img/ทบ.png"
              backgroundColor="bg-green-700"
              borderColor="border-gray-700"
              dataSummary={emptySummary}
              dataThreats={emptyThreats}
            />
          </div>

          {/* ⚪ 3. กองทัพอากาศ -> ส่งข้อมูลว่าง */}
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพอากาศ"
              filterSeverity="high"
              logoPath="../public/img/ทอ.png"
              backgroundColor="bg-blue-600"
              borderColor="border-gray-700"
              dataSummary={emptySummary}
              dataThreats={emptyThreats}
            />
          </div>

          {/* ⚪ 4. กองทัพเรือ -> ส่งข้อมูลว่าง */}
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพเรือ"
              filterSeverity="low"
              logoPath="../public/img/ทร.png"
              backgroundColor="bg-blue-900"
              borderColor="border-gray-700"
              dataSummary={emptySummary}
              dataThreats={emptyThreats}
            />
          </div>

          {/* ⚪ 5. สำนักงานตำรวจแห่งชาติ -> ส่งข้อมูลว่าง */}
          <div className="flex-shrink-0">
            <BangkokThreat
              title="สำนักงานตำรวจแห่งชาติ"
              filterSeverity="all"
              logoPath="../public/img/ตอ.png"
              backgroundColor="bg-red-800"
              borderColor="border-gray-700"
              dataSummary={emptySummary}
              dataThreats={emptyThreats}
            />
          </div>
        
        </div>
      </div>
    </div>
  );
};

export default BangkokLayout;