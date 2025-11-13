import { useState, useEffect, useRef } from "react";
import { fetchAlertSummary, type AlertSummary, fetchLatestAlert, type RtarfAverageSeverityPayload, fetchRtarfAverageSummary, type RtarfSeverityStatistics, fetchRtarfSeverityStatistics } from "../../services/defensiveService";
import { type AlertBase } from "../../types/defensive";
import * as Chart from "chart.js";
import Sitrep from "../SitrepCard";

Chart.Chart.register(
  Chart.BarController,
  Chart.BarElement,
  Chart.CategoryScale,
  Chart.LinearScale,
  Chart.Tooltip
);

const DevConBangkok = () => {
  const [alertData, setAlertData] = useState<AlertSummary | null>(null);
  const [threatData, setThreatData] = useState<AlertBase[]>([]);
  const [avgSeverity, setAvgSeverity] = useState<RtarfAverageSeverityPayload | null>(null);
  const [defconLevel, setDefconLevel] = useState(1);
  const [severityStats, setSeverityStats] = useState<RtarfSeverityStatistics | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart.Chart | null>(null);

 
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

  // Create Chart.js chart when severity stats change
  useEffect(() => {
    if (severityStats?.severity_distribution && chartRef.current) {
      const dist = severityStats.severity_distribution;
      
      // Destroy previous chart if exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart.Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Critical', 'High', 'Medium', 'Low'],
            datasets: [{
              data: [dist.critical, dist.high, dist.medium, dist.low],
              backgroundColor: [
                '#ef4444',
                '#f97316',
                '#facc15',
                '#60a5fa'
              ],
              borderRadius: 4,
              barThickness: 28
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { 
                  color: '#9ca3af',
                  font: { size: 8 }
                }
              },
              y: {
                display: false,
                beginAtZero: true
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [severityStats]);


  // Get color based on DEFCON level
  function getDefconColor(level: number): {
    border: string;
    bg: string;
    text: string;
    glow: string;
  } {
    switch (level) {
      case 4: // Critical
        return {
          border: 'border-red-500',
          bg: 'bg-red-400',
          text: 'text-red-400',
          glow: 'shadow-[0_0_15px_rgba(255,0,0,0.7)]'
        };
      case 3: // High
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-400',
          text: 'text-orange-400',
          glow: 'shadow-[0_0_15px_rgba(255,165,0,0.7)]'
        };
      case 2: // Medium
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-400',
          text: 'text-yellow-400',
          glow: 'shadow-[0_0_15px_rgba(255,255,0,0.7)]'
        };
      case 1: // Low
      default:
        return {
          border: 'border-green-500',
          bg: 'bg-green-400',
          text: 'text-green-400',
          glow: 'shadow-[0_0_15px_rgba(0,255,0,0.7)]'
        };
    }
  }

  const pieData =
    alertData?.alert_summarys
      ?.slice(0, 5) // top 5 categories for pie
      .map((item, i) => ({
        label: item.alert_name,
        value: Number(((item.count / alertData.total_alerts) * 100).toFixed(1)),
        color: [
          "bg-purple-500",
          "bg-pink-500",
          "bg-green-500",
          "bg-yellow-400",
          "bg-blue-400",
        ][i % 5],
        hex: ["#a855f7", "#ec4899", "#22c55e", "#facc15", "#60a5fa"][i % 5],
      })) || [];

  if (!alertData) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        Loading Threat Dashboard...
      </div>
    );
  }

  const totalValue = pieData.reduce((sum, item) => sum + item.value, 0) || 1;

  const generatePieChart = () => {
    let currentAngle = 0;

    return pieData.map((item, idx) => {
      const angle = (item.value / totalValue) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      const x1 = 50 + 45 * Math.cos((startAngle * Math.PI) / 180);
      const y1 = 50 + 45 * Math.sin((startAngle * Math.PI) / 180);
      const x2 = 50 + 45 * Math.cos(((startAngle + angle) * Math.PI) / 180);
      const y2 = 50 + 45 * Math.sin(((startAngle + angle) * Math.PI) / 180);
      const largeArc = angle > 180 ? 1 : 0;

      return (
        <path
          key={idx}
          d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`}
          fill={item.hex}
        />
      );
    });
  };

  const defconColors = getDefconColor(defconLevel);

  return (
    <div className="w-60 h-[100vh] bg-black p-2 rounded-2xl shadow-2xl flex flex-col justify-start gap-1 overflow-hidden">
      {/* DEFCON Status */}
      <div className="bg-black backdrop-blur-sm rounded-lg p-3 border-8 border-gray-500 flex flex-col group hover:border-gray-400 transition-all duration-300">
        {/* ชื่อ DEFCON ให้อยู่ตรงกลาง */}
        <div className="text-[15px] text-white font-bold mb-3 tracking-wider text-center group-hover:text-cyan-300 transition-colors duration-300">
          สถานการณ์ทางไซเบอร์
        </div>

        {/* ส่วน DEFCON Level */}
        <div className="flex items-center justify-between">
          {/* กรอบด้านซ้าย 4 ช่อง */}
          <div className="flex flex-col justify-center gap-1.5">
            {[4, 3, 2, 1].map((level) => {
              const colors = getDefconColor(level);
              const isActive = level <= defconLevel;
              return (
                <div
                  key={level}
                  className={`w-12 h-4 border-2 transition-all duration-300 hover:scale-110 cursor-pointer relative ${
                    isActive
                      ? `${colors.border} ${colors.bg} ${colors.glow}`
                      : "border-gray-600 bg-transparent hover:border-gray-400"
                  }`}
                >
                  {isActive && (
                    <div className={`absolute inset-0 ${colors.bg} opacity-50 animate-pulse`}></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* วงกลม Defcon Level */}
          <div className="relative group/circle cursor-pointer">
            <div
              className={`w-28 h-28 rounded-full border-8 ${defconColors.border} flex items-center justify-center bg-black ${defconColors.glow} transition-all duration-300 group-hover/circle:scale-110 group-hover/circle:border-[10px]`}
            >
              <span className={`text-7xl font-bold leading-none ${defconColors.text} group-hover/circle:scale-110 transition-transform duration-300`}>
                {defconLevel}
              </span>
            </div>
            <div
              className={`absolute -inset-1 rounded-full border-4 ${defconColors.border} opacity-30 animate-pulse group-hover/circle:opacity-50`}
            ></div>
            <div
              className={`absolute -inset-2 rounded-full border-2 ${defconColors.border} opacity-0 group-hover/circle:opacity-20 group-hover/circle:animate-ping`}
            ></div>
          </div>
        </div>
      </div>

      {/* Severity amount Chart */}
      <div className="relative bg-black p-[6px] bg-gradient-to-b from-[#b0c4de] to-[#4a5568] shadow-[0_0_14px_rgba(0,150,255,0.3)]">
        <div className="bg-black rounded-lg p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
          <div className="text-[9px] text-white mb-2 tracking-wide text-center font-bold">
            จำนวนการแจ้งเตือนแยกตามระดับความรุนแรง
          </div>

          <div className="bg-gray-900/70 p-2 rounded-lg border-[2px] border-[#5c6e87] shadow-[inset_0_1px_3px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.6)]">
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

      {/* Pie Chart */}
      <div className="relative bg-black p-[6px] bg-gradient-to-b from-[#b0c4de] to-[#4a5568] shadow-[0_0_10px_rgba(0,150,255,0.25)]">
        <div className="bg-black rounded-lg p-[6px] shadow-[inset_0_1px_3px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
          <div className="text-[9px] text-white mb-[4px] tracking-wide text-center font-bold">
            THREAT DISTRIBUTION
          </div>

          <div className="bg-gray-900/70 p-[6px] rounded-lg border-[1.5px] border-[#5c6e87] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_2px_3px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-[6px]">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {generatePieChart()}
                </svg>
              </div>

              <div className="flex-1 space-y-[2px]">
                {pieData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-[4px] text-[8px]">
                    <div className={`w-2 h-2 rounded-sm ${item.color}`}></div>
                    <span className="text-gray-300 line-clamp-2">
                      {item.label}
                    </span>
                    <span className="text-gray-500">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Sitrep />
    </div>
  );
};

export default DevConBangkok;