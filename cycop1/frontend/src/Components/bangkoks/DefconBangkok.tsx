// src/components/bangkoks/DefconBangkok.tsx
import { useState, useEffect, useRef } from "react";
import {
  fetchAlertSummary,
  type AlertSummary,
  fetchLatestAlert,
  type RtarfAverageSeverityPayload,
  fetchRtarfAverageSummary,
  type RtarfSeverityStatistics,
  fetchRtarfSeverityStatistics,
} from "../../services/defensiveService";
import type { AlertBase, NodeGet } from "../../types/defensive";
import * as Chart from "chart.js";

// ------------------------------------------------------
//   ⬇⬇⬇   SITREP COMPONENT ⬇⬇⬇
// ------------------------------------------------------
const Sitrep = ({ selectedNode }: { selectedNode: NodeGet | null }) => {
  if (!selectedNode) {
    return (
      <div className="bg-black rounded-lg p-2 border-8 border-gray-500 flex-1 overflow-hidden w-57">
        <div className="text-[15px] font-bold mb-1.5 text-white border-b border-black pb-2 flex justify-center ">
          SITREP
        </div>

        <div className="bg-cyan-50 rounded p-2 space-y-1.5 text-[15px] h-full overflow-y-auto">
          <div className="text-center text-[12px] text-gray-700">
            Select a node to view SITREP.
          </div>
        </div>
      </div>
    );
  }

  const {
    name,
    latitude,
    longitude,
    ip_address,
    additional_ips,
    network_metadata,
  } = selectedNode;

  const ownerName = (network_metadata as any)?.owner ?? "Unknown";
  const applications: string[] =
    (network_metadata as any)?.applications ?? [];

  const gw =
    additional_ips && additional_ips.length > 0 ? additional_ips[0] : "-";

  return (
    <div className="bg-black rounded-lg p-2 border-8 border-gray-500 flex-1 overflow-hidden w-57">
      <div className="text-[15px] font-bold mb-1.5 text-white border-b border-black pb-2 flex justify-center ">
        SITREP
      </div>

      <div className="bg-cyan-50 rounded p-2 space-y-1.5 text-[15px] h-full overflow-y-auto">

        {/* H/W Information */}
        <div>
          <div className="text-black font-semibold mb-0.5">H/W Information</div>
          <div className="space-y-0 text-black ml-1 text-[12px]">
            <div>
              • Name: <span className="text-blue-700 break-all">{name}</span>
            </div>
            <div>
              • Location:{" "}
              <span className="text-blue-700">
                {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Network Information */}
        <div>
          <div className="text-black font-semibold mb-0.5">Network Information</div>
          <div className="space-y-0 text-black ml-1 text-[12px]">
            <div>
              • IP:{" "}
              <span className="text-blue-700">
                {ip_address ? String(ip_address) : "-"}
              </span>
            </div>
            <div>
              • G/W: <span className="text-blue-700">{gw}</span>
            </div>
          </div>
        </div>

        {/* Owner Information */}
        {/* <div>
          <div className="text-black font-semibold mb-0.5">Owner Information</div>
          <div className="space-y-0 text-black ml-1 text-[12px]">
            <div>
              • Owner name:{" "}
              <span className="text-blue-700">{ownerName}</span>
            </div>
          </div>
        </div> */}

        {/* Used Application */}
        {/* <div>
          <div className="text-black font-semibold mb-0.5">Used Application</div>
          <div className="space-y-0 text-black ml-1 text-[12px]">
            {applications.length === 0 ? (
              <div>• No application data</div>
            ) : (
              <>
                {applications.slice(0, 3).map((app, idx) => (
                  <div key={idx}>• {app}</div>
                ))}
                {applications.length > 3 && (
                  <div className="text-blue-400">
                    + {applications.length - 3} applications
                  </div>
                )}
              </>
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
};
// ------------------------------------------------------
//   ⬆⬆⬆   END SITREP COMPONENT — อยู่ในไฟล์เดียวกัน   ⬆⬆⬆
// ------------------------------------------------------


Chart.Chart.register(
  Chart.BarController,
  Chart.BarElement,
  Chart.CategoryScale,
  Chart.LinearScale,
  Chart.Tooltip
);

interface DefconProps {
  selectedNode: NodeGet | null;
}

const DefconBangkok: React.FC<DefconProps> = ({ selectedNode }) => {
  const [alertData, setAlertData] = useState<AlertSummary | null>(null);
  const [threatData, setThreatData] = useState<AlertBase[]>([]);
  const [avgSeverity, setAvgSeverity] =
    useState<RtarfAverageSeverityPayload | null>(null);
  const [defconLevel, setDefconLevel] = useState(1);
  const [severityStats, setSeverityStats] =
    useState<RtarfSeverityStatistics | null>(null);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart.Chart | null>(null);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // ============================
  // โหลดข้อมูล DEFCON + THREAT
  // ============================
  useEffect(() => {
    const loadAllData = async () => {
      const summary = await fetchAlertSummary();
      const threat = await fetchLatestAlert();
      const severity = await fetchRtarfAverageSummary();
      const severityRanking = await fetchRtarfSeverityStatistics();

      setAlertData(summary);
      setThreatData(threat);
      setAvgSeverity(severity);
      setSeverityStats(severityRanking);

      if (severity && severity.average_severity_level > 0) {
        setDefconLevel(severity.average_severity_level);
      }
    };

    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ============================
  // Chart.js bar chart
  // ============================
  useEffect(() => {
    if (severityStats?.severity_distribution && chartRef.current) {
      const dist = severityStats.severity_distribution;

      if (chartInstance.current) chartInstance.current.destroy();

      const ctx = chartRef.current.getContext("2d");
      if (!ctx) return;

      chartInstance.current = new Chart.Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Critical", "High", "Medium", "Low"],
          datasets: [
            {
              data: [dist.critical, dist.high, dist.medium, dist.low],
              backgroundColor: ["#ef4444", "#f97316", "#facc15", "#60a5fa"],
              borderRadius: 4,
              barThickness: 28,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: "#9ca3af", font: { size: 8 } },
            },
            y: { display: false },
          },
        },
      });
    }

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [severityStats]);

  // ============================
  // ฟังก์ชันสี DEFCON
  // ============================
  const getDefconColor = (level: number) => {
    switch (level) {
      case 4:
        return {
          border: "border-red-500",
          bg: "bg-red-400",
          text: "text-red-400",
          glow: "shadow-[0_0_15px_rgba(255,0,0,0.7)]",
        };
      case 3:
        return {
          border: "border-orange-500",
          bg: "bg-orange-400",
          text: "text-orange-400",
          glow: "shadow-[0_0_15px_rgba(255,165,0,0.7)]",
        };
      case 2:
        return {
          border: "border-yellow-500",
          bg: "bg-yellow-400",
          text: "text-yellow-400",
          glow: "shadow-[0_0_15px_rgba(255,255,0,0.7)]",
        };
      default:
        return {
          border: "border-green-500",
          bg: "bg-green-400",
          text: "text-green-400",
          glow: "shadow-[0_0_15px_rgrgba(0,255,0,0.7)]",
        };
    }
  };

  const defconColors = getDefconColor(defconLevel);

  // ============================
  // pie chart
  // ============================
  const pieData =
    alertData?.alert_summaries
      ?.slice(0, 5)
      .map((item, i) => ({
        label: item.alert_name,
        value: Number(
          ((item.count / alertData.total_alerts) * 100).toFixed(1)
        ),
        hex: ["#a855f7", "#ec4899", "#22c55e", "#facc15", "#60a5fa"][i % 5],
      })) || [];

  const totalValue =
    pieData.reduce((sum, item) => sum + item.value, 0) || 1;

  const renderPieChart = () => {
    let startAngle = 0;

    return pieData.map((item, idx) => {
      const angle = (item.value / totalValue) * 360;

      const x1 = 50 + 45 * Math.cos((startAngle * Math.PI) / 180);
      const y1 = 50 + 45 * Math.sin((startAngle * Math.PI) / 180);
      const x2 = 50 + 45 * Math.cos(((startAngle + angle) * Math.PI) / 180);
      const y2 = 50 + 45 * Math.sin(((startAngle + angle) * Math.PI) / 180);
      const largeArc = angle > 180 ? 1 : 0;

      const active = hoverIndex === idx;
      const path = (
        <path
          key={idx}
          d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`}
          fill={item.hex}
          className={`transition-all duration-300 ${active
              ? "scale-[1.05] drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]"
              : "opacity-80"
            }`}
          onMouseEnter={() => setHoverIndex(idx)}
          onMouseLeave={() => setHoverIndex(null)}
        />
      );

      startAngle += angle;
      return path;
    });
  };

  // ============================
  // RETURN UI
  // ============================
  return (
    <div className="w-60 h-[100vh] bg-black p-2 rounded-2xl shadow-2xl flex flex-col gap-1 overflow-hidden">

      {/* ------------------ DEFCON ------------------ */}
      <div className="bg-black rounded-lg border-8 border-gray-500 p-3">
        <div className="text-center text-white font-bold mb-3">
          สถานการณ์ทางไซเบอร์
        </div>

        <div className="flex justify-between">

          {/* 4-level bar */}
          <div className="flex flex-col gap-1.5">
            {[4, 3, 2, 1].map((level) => {
              const c = getDefconColor(level);
              const active = level <= defconLevel;
              return (
                <div
                  key={level}
                  className={`w-10 h-4 border-2 ${active ? `${c.border} ${c.bg} ${c.glow}` : "border-gray-600"
                    }`}
                />
              );
            })}
          </div>

          {/* DEFCON Circle */}
          <div className="relative">
            <div
              className={`w-24 h-24 rounded-full border-8 ${defconColors.border} bg-black flex items-center justify-center`}
            >
              <span
                className={`text-6xl font-bold ${defconColors.text}`}
              >
                {defconLevel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------ Severity Chart ------------------ */}
      <div
                className="relative bg-black p-[6px] 
        bg-gradient-to-b from-[#b0c4de] to-[#4a5568] shadow-[0_0_14px_rgba(0,150,255,0.3)] mt-1 mb-1">
        <div className="bg-black rounded-lg p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
          <div className="text-[9px] text-white mb-1 tracking-wide text-center font-bold">
            จำนวนการแจ้งเตือนแยกตามระดับความรุนแรง
          </div>

          <div
            className="bg-gray-900/70 p-2 rounded-lg border-[2px] border-[#5c6e87] 
                        shadow-[inset_0_1px_3px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.6)]"
          >
            {severityStats?.severity_distribution ? (
              <>
                <div className="h-16 relative">
                  <canvas ref={chartRef}></canvas>
                </div>
                <div className="flex justify-center gap-3 mt-1">
                  <div className="text-[7px] text-red-400 font-bold">{severityStats.severity_distribution.critical}</div>
                  <div className="text-[7px] text-orange-400 font-bold">{severityStats.severity_distribution.high}</div>
                  <div className="text-[7px] text-yellow-400 font-bold">{severityStats.severity_distribution.medium}</div>
                  <div className="text-[7px] text-blue-400 font-bold">{severityStats.severity_distribution.low}</div>
                </div>
              </>
            ) : (
              <div className="h-14 flex items-center justify-center text-gray-500 text-[8px]">
                กำลังโหลดข้อมูล...
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ------------------ THREAT DISTRIBUTION ------------------ */}
      <div className="bg-black border-8 border-gray-500 p-2 rounded-lg">
        <div className="text-center text-white text-xs font-bold">
          THREAT DISTRIBUTION
        </div>

        <div className="flex gap-2 mt-2">
          <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
            {renderPieChart()}
          </svg>

          <div className="flex-1 space-y-1">
            {pieData.map((item, idx) => (
              <div
                key={idx}
                className={`flex justify-between text-[9px] ${hoverIndex === idx ? "text-white" : "text-gray-400"
                  }`}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <span>{item.label}</span>
                <span>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------ SITREP ------------------ */}
      <Sitrep selectedNode={selectedNode} />
    </div>
  );
};

export default DefconBangkok;
