// src/BangkokLayout.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import type L from "leaflet";

import DefconBangkok from "./components/bangkoks/DefconBangkok";
import BangkokThreat, {
  type UiThreatSummary,
} from "./components/bangkoks/BangkokThreat";
import MapViewBangkok from "./components/bangkoks/MapViewBangkok";
import OverlayListBangkok from "./components/bangkoks/OverLaylistBangkok";
import { mapScoreToSeverity } from "./components/mitreCard/mitreData";
import { type AlertBase } from "./types/defensive";
import "./index.css";

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
    threatName: string;
    threatDetail: string;
    serverity: string | null;
    incidentID: string;
    quantity: number;
    percentage: number;
  }>;
}

const BangkokLayout = () => {
  const navigate = useNavigate();
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [realSummary, setRealSummary] = useState<UiThreatSummary | null>(null);
  const [realThreats, setRealThreats] = useState<AlertBase[]>([]);
  const [orgStatuses, setOrgStatuses] = useState<OrgStatusApi[]>([]);
  const [focusIncidentId, setFocusIncidentId] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const [severitiesRes, alertsRes] = await Promise.all([
          fetch("/api/severities"),
          fetch("/api/threatalerts"),
        ]);

        const severitiesData = await severitiesRes.json();
        const alertsData = await alertsRes.json();

        // Map Summary Data
        const stats: UiThreatSummary = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        };

        if (Array.isArray(severitiesData)) {
          severitiesData.forEach((item: ApiSeverityItem) => {
            const key = (item.serverity || "").toLowerCase();
            if (key.includes("critical")) stats.critical = item.quantity || 0;
            else if (key.includes("high")) stats.high = item.quantity || 0;
            else if (key.includes("medium")) stats.medium = item.quantity || 0;
            else if (key.includes("low")) stats.low = item.quantity || 0;
          });
        }
        setRealSummary(stats);

        // Map Threat List
        const rawAlerts = Array.isArray(alertsData.alerts)
          ? alertsData.alerts
          : Array.isArray(alertsData)
          ? alertsData
          : [];

        const mappedThreats: AlertBase[] = rawAlerts.map(
          (item: ApiAlertItem) => {
            const severityLabel = mapScoreToSeverity(item.serverity || "0");
            return {
              incident_id: item.incidentID || "N/A",
              description: item.threatName || "Unknown Threat",
              severity: severityLabel,
              timestamp: new Date().toISOString(),
              event_id: item.incidentID || "0",
            };
          }
        );

        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        mappedThreats.sort((a, b) => {
          const scoreA =
            severityOrder[a.severity as keyof typeof severityOrder] || 0;
          const scoreB =
            severityOrder[b.severity as keyof typeof severityOrder] || 0;
          return scoreB - scoreA;
        });

        setRealThreats(mappedThreats);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    const fetchOrgData = async () => {
      try {
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

  const getOrgDataProps = (targetId: string) => {
    const org = orgStatuses.find((o) => o.id === targetId);

    const emptySummary: UiThreatSummary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
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
        event_id: "0",
      };
    });

    return { summary, threats };
  };

  const rta = getOrgDataProps("rta"); // ทบ.
  const rtaf = getOrgDataProps("rtaf"); // ทอ.
  const rtn = getOrgDataProps("rtn"); // ทร.
  const rtp = getOrgDataProps("rtp"); // ตร.

  return (
    <div className="bg-black h-screen relative overflow-hidden">
      {/* ซ้าย */}
      <div className="fixed left-0 top-0 h-auto z-40 w-60">
        <OverlayListBangkok mainMapBounds={mapBounds} />
      </div>

      {/* เนื้อหากลาง */}
      <div className="ml-60 mr-60 h-full pb-[260px] overflow-auto">
        <MapViewBangkok
          onBoundsChange={setMapBounds}
          focusIncidentId={focusIncidentId} 
        />
      </div>

      {/* ขวา */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-60">
        <DefconBangkok />
      </div>

      {/* ล่าง - Bangkok Threat แนวนอน */}
      <div className="fixed bottom-0 right-59 z-30 bg-black border-t border-gray-900 p-1 h-[260px]">
        <div className="flex items-center gap-2 h-full">
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองบัญชาการกองทัพไทย"
              filterSeverity="all"
              logoPath="../public/img/บก.ทท.png"
              backgroundColor="bg-yellow-700"
              borderColor="border-gray-700"
              dataSummary={realSummary}
              dataThreats={realThreats}
              onThreatClick={(incidentId) => setFocusIncidentId(incidentId)}
              onTitleClick={() => navigate('/orgsum?id=rtarf')}
            />
          </div>

          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพบก"
              filterSeverity="all"
              logoPath="../public/img/ทบ.png"
              backgroundColor="bg-green-700"
              borderColor="border-gray-700"
              dataSummary={rta.summary}
              dataThreats={rta.threats}
              onThreatClick={(incidentId) => setFocusIncidentId(incidentId)}
              onTitleClick={() => navigate('/orgsum?id=rta')}
            />
          </div>

          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพอากาศ"
              filterSeverity="all"
              logoPath="../public/img/ทอ.png"
              backgroundColor="bg-blue-600"
              borderColor="border-gray-700"
              dataSummary={rtaf.summary}
              dataThreats={rtaf.threats}
              onThreatClick={(incidentId) => setFocusIncidentId(incidentId)}
              onTitleClick={() => navigate('/orgsum?id=rtaf')}
            />
          </div>

          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพเรือ"
              filterSeverity="all"
              logoPath="../public/img/ทร.png"
              backgroundColor="bg-blue-900"
              borderColor="border-gray-700"
              dataSummary={rtn.summary}
              dataThreats={rtn.threats}
              onThreatClick={(incidentId) => setFocusIncidentId(incidentId)}
              onTitleClick={() => navigate('/orgsum?id=rtn')}
            />
          </div>

          <div className="flex-shrink-0">
            <BangkokThreat
              title="สำนักงานตำรวจแห่งชาติ"
              filterSeverity="all"
              logoPath="../public/img/ตอ.png"
              backgroundColor="bg-red-800"
              borderColor="border-gray-700"
              dataSummary={rtp.summary}
              dataThreats={rtp.threats}
              onThreatClick={(incidentId) => setFocusIncidentId(incidentId)}
              onTitleClick={() => navigate('/orgsum?id=rtp')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BangkokLayout;