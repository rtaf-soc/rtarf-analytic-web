import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

// Define types
interface Threat {
  id: string;
  incident: number;
  color: string;
}

interface PieDataItem {
  label: string;
  value: number;
  color: string;
  hex: string;
}

interface SeverityStats {
  name: string;
  percentage: number;
  quantity: number;
}

interface ApiSeverity {
  threatName?: string;
  threatDetail?: string;
  serverity?: string;
  quantity?: number;
  percentage?: number;
  mitrTechniqueName?: string | null;
  mitrTacticName?: string | null;
}

interface ApiAlert {
  threatName?: string;
  threatDetail?: string;
  level?: number;
  incidentID?: string;
  severity?: number;
}

const DevConDashboard = () => {
  const [defconLevel, setDefconLevel] = useState<number>(1);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [pieData, setPieData] = useState<PieDataItem[]>([]);
  
  const [severityStats, setSeverityStats] = useState<SeverityStats[]>([]);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper Function: ย่อชื่อ Threat ที่ยาวเกินไป
  const formatThreatName = (name: string): string => {
    const nameMap: Record<string, string> = {
      "Spyware Detected via Anti-Spyware profile": "Spyware (Anti-Spyware)",
      "Scan Detected via Zone Protection Profile": "Zone Protection Scan",
      "Flood Detected via Zone Protection Profile": "Zone Protection Flood",
      "Command and Control": "C2",
      "Vulnerability Protection": "Vulnerability",
      "Cryptominer Detected via Anti-Spyware profile": "Cryptominer",
    };

    if (nameMap[name]) {
      return nameMap[name];
    }

    if (name.length > 25) {
      return name.substring(0, 23) + "...";
    }

    return name;
  };

  // Helper: เลือกสีแท่งกราฟตามชื่อ
  const getSeverityBarColor = (name: string, index: number): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("critical")) return "bg-red-500";
    if (lowerName.includes("high")) return "bg-orange-500";
    if (lowerName.includes("medium")) return "bg-yellow-500";
    if (lowerName.includes("low")) return "bg-blue-500";
    if (lowerName.includes("info")) return "bg-gray-500";

    const defaultColors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-blue-500",
    ];
    return defaultColors[index] || "bg-gray-500";
  };

  const getThreatColor = (level: number): string => {
    const colorMap: Record<number, string> = {
      1: "bg-red-600",
      2: "bg-red-500",
      3: "bg-orange-500",
      4: "bg-yellow-400",
      5: "bg-yellow-300",
    };
    return colorMap[level] || "bg-gray-500";
  };

  const getThreatTypeColor = (type: string): { color: string; hex: string } => {
    const colorMap: Record<string, { color: string; hex: string }> = {
      "IP Sweep": { color: "bg-purple-500", hex: "#a855f7" },
      "Malwares": { color: "bg-pink-500", hex: "#ec4899" },
      "DDoS": { color: "bg-green-500", hex: "#22c55e" },
      "Phising": { color: "bg-yellow-400", hex: "#facc15" },
      "Brute Force": { color: "bg-red-500", hex: "#ef4444" },
      "SQL Injection": { color: "bg-orange-500", hex: "#f97316" },
      "XSS": { color: "bg-cyan-500", hex: "#06b6d4" },
      "Spyware Detected via Anti-Spyware profile": { color: "bg-purple-500", hex: "#a855f7" },
      "Vulnerability": { color: "bg-pink-500", hex: "#ec4899" },
      "Scan Detected via Zone Protection Profile": { color: "bg-green-500", hex: "#22c55e" },
      "Malware": { color: "bg-red-500", hex: "#ef4444" },
      "Other": { color: "bg-gray-500", hex: "#6b7280" },
      "Lateral Movement": { color: "bg-blue-500", hex: "#3b82f6" },
      "Credential Access": { color: "bg-yellow-500", hex: "#eab308" },
      "Reconnaissance": { color: "bg-cyan-500", hex: "#06b6d4" },
      "Antivirus": { color: "bg-green-500", hex: "#22c55e" },
      "Persistence": { color: "bg-indigo-500", hex: "#6366f1" },
      "Discovery": { color: "bg-teal-500", hex: "#14b8a6" },
      "Execution": { color: "bg-rose-500", hex: "#f43f5e" },
      "Command and Control": { color: "bg-violet-500", hex: "#8b5cf6" },
      "Initial Access": { color: "bg-amber-500", hex: "#f59e0b" },
      "Flood Detected via Zone Protection Profile": { color: "bg-red-400", hex: "#f87171" },
      "Exfiltration": { color: "bg-fuchsia-500", hex: "#d946ef" },
      "Collection": { color: "bg-lime-500", hex: "#84cc16" },
      "anomaly": { color: "bg-gray-400", hex: "#9ca3af" },
      "Others": { color: "bg-gray-500", hex: "#6b7280" },
    };
    return colorMap[type] || { color: "bg-gray-500", hex: "#6b7280" };
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [defconRes, severitiesRes, distributionsRes, alertsRes] =
        await Promise.all([
          fetch(`/api/defstatus`),
          fetch(`/api/severities`),
          fetch(`/api/threatdistributions`),
          fetch(`/api/threatalerts`),
        ]);

      if (!defconRes.ok || !severitiesRes.ok || !distributionsRes.ok || !alertsRes.ok) {
        throw new Error("Failed to fetch data from one or more APIs");
      }

      const defconData = await defconRes.json();
      const severitiesData = await severitiesRes.json();
      const distributionsData = await distributionsRes.json();
      const alertsData = await alertsRes.json();

      setDefconLevel(defconData.level || defconData.defconLevel || 1);

      // --- Severities (Bar chart) ---
      const severityArray: ApiSeverity[] = Array.isArray(severitiesData)
        ? severitiesData
        : [];

      const targetSeverities = ["Critical", "High", "Medium", "Low"];

      const rawData = targetSeverities.map(target => {
        const found = severityArray.find(item => 
          (item.serverity || "").toLowerCase().includes(target.toLowerCase())
        );
        return {
          name: target,
          qty: found ? (found.quantity || 0) : 0
        };
      });

      const maxQty = Math.max(...rawData.map(i => i.qty)) || 1;

      const processedStats: SeverityStats[] = rawData.map(item => {
        let calculatedPercent = (item.qty / maxQty) * 100;
        
        let displayPercent;
        if (item.qty === 0) {
             displayPercent = 1; 
        } else {
             displayPercent = Math.max(15, calculatedPercent); 
        }

        return {
          name: item.name,
          quantity: item.qty,
          percentage: displayPercent,
        };
      });

      setSeverityStats(processedStats);

      // Threat Distribution (Pie chart)
      const distributionsArray = Array.isArray(distributionsData.distributions)
        ? distributionsData.distributions
        : Array.isArray(distributionsData)
        ? distributionsData
        : [];

      const validDistributions = distributionsArray.filter(
        (item: any) =>
          (item.quantity || 0) > 0 || (item.percentage || item.value || 0) > 0
      );

      let formattedDistributions: PieDataItem[];

      if (validDistributions.length === 0) {
        formattedDistributions = [];
      } else {
        const totalQuantity = validDistributions.reduce(
          (sum: number, item: any) => sum + (item.quantity || 0),
          0
        );

        const totalPercentage = validDistributions.reduce(
          (sum: number, item: any) =>
            sum + (item.percentage || item.value || 0),
          0
        );
        const hasPercentage = totalPercentage > 0;

        const sortedDistributions = [...validDistributions].sort(
          (a: any, b: any) => {
            if (hasPercentage) {
              return (
                (b.percentage || b.value || 0) - (a.percentage || a.value || 0)
              );
            }
            return (b.quantity || 0) - (a.quantity || 0);
          }
        );

        const top4 = sortedDistributions.slice(0, 4);
        const others = sortedDistributions.slice(4);

        const othersQuantity = others.reduce(
          (sum: number, item: any) => sum + (item.quantity || 0),
          0
        );
        const othersPercentageValue = others.reduce(
          (sum: number, item: any) =>
            sum + (item.percentage || item.value || 0),
          0
        );

        let othersPercentage;
        if (hasPercentage) {
          othersPercentage = othersPercentageValue;
        } else {
          othersPercentage =
            totalQuantity > 0
              ? Math.round((othersQuantity / totalQuantity) * 100)
              : 0;
        }

        formattedDistributions = top4.map((item: any): PieDataItem => {
          const label =
            item.threatName || item.type || item.label || item.name || "";
          const colors = getThreatTypeColor(label);

          let percentage;
          if (hasPercentage) {
            percentage = item.percentage || item.value || 0;
          } else {
            percentage =
              totalQuantity > 0
                ? Math.round(((item.quantity || 0) / totalQuantity) * 100)
                : 0;
          }

          return {
            label,
            value: percentage,
            color: colors.color,
            hex: colors.hex,
          };
        });

        if (othersQuantity > 0 || othersPercentageValue > 0) {
          const colors = getThreatTypeColor("Others");
          formattedDistributions.push({
            label: "Others",
            value: othersPercentage,
            color: colors.color,
            hex: colors.hex,
          });
        }
      }

      setPieData(formattedDistributions);

      // Threat Alerts
      const alertsArray = Array.isArray(alertsData.alerts)
        ? alertsData.alerts
        : Array.isArray(alertsData)
        ? alertsData
        : [];

      const formattedAlerts = alertsArray
        .sort(
          (a: ApiAlert, b: ApiAlert) =>
            (a.level || a.severity || 99) - (b.level || b.severity || 99)
        )
        .map(
          (alert: ApiAlert, idx: number): Threat => ({
            id: alert.threatName || `THREAT ${idx + 1}`,
            incident: parseInt(alert.incidentID || `${idx + 1}`),
            color: getThreatColor(alert.level || alert.severity || 5),
          })
        );
      setThreats(formattedAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(), 30000);
    return () => clearInterval(interval);
  }, []);

  const generatePieChart = () => {
    let currentAngle = 0;
    return pieData.map((item, idx) => {
      const angle = (item.value / 100) * 360;
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

  return (
    <div className="w-60 h-[100vh] bg-slate-800 border-gray-700 p-2 shadow-2xl flex flex-col justify-start overflow-hidden relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-white animate-spin" />
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchDashboardData}
        disabled={loading}
        className="absolute top-4 right-4 z-10 p-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        <RefreshCw
          className={`w-3 h-3 text-white ${loading ? "animate-spin" : ""}`}
        />
      </button>

      {/* DEFCON Status */}
      <div className="bg-black backdrop-blur-sm rounded-lg p-3 border-8 border-gray-500 flex flex-col">
        <div className="text-[14px] text-white font-bold mb-3 tracking-wider text-center">
          สถานการณ์ทางไซเบอร์
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col justify-center gap-1.5">
            {[4, 3, 2, 1].map((level) => (
              <div
                key={level}
                className={`w-12 h-4 border-2 ${
                  level === defconLevel
                    ? "border-green-500 bg-green-400 shadow-[0_0_10px_rgba(0,255,0,0.7)]"
                    : "border-gray-600 bg-transparent"
                }`}
              ></div>
            ))}
          </div>

          <div className="relative">
            <div className="w-28 h-28 rounded-full border-8 border-green-500 flex items-center justify-center bg-black shadow-[0_0_15px_rgba(0,255,0,0.3)]">
              <span className="text-8xl font-bold text-green-400">
                {defconLevel}
              </span>
            </div>
            <div className="absolute -inset-1 rounded-full border-4 border-green-400/30 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Activity Chart (SEVERITY) */}
      <div className="relative bg-black p-[6px] bg-gradient-to-b from-[#b0c4de] to-[#4a5568] shadow-[0_0_14px_rgba(0,150,255,0.3)] mt-1 mb-1">
        <div className="bg-black rounded-lg p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
          <div className="text-[9px] text-white mb-1 tracking-wide text-center font-bold">
            จำนวนการแจ้งเตือนแยกตามระดับความรุนแรง
          </div>

          <div className="bg-gray-900/70 p-2 rounded-lg border-[2px] border-[#5c6e87] shadow-[inset_0_1px_3px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.6)]">
            {/* Container หลัก */}
            <div className="flex items-end justify-center gap-2 h-24 pb-1">
              {severityStats.length > 0 ? (
                // เปลี่ยนจาก topCountries.map เป็น severityStats.map
                severityStats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-end h-full w-10"
                  >
                    {/* แท่งกราฟ */}
                    <div className="flex items-end justify-center h-16 w-full mb-1">
                      <div
                        className={`w-8 rounded-t-md shadow-[0_-2px_6px_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.6)] ${getSeverityBarColor(
                          stat.name,
                          idx
                        )}`}
                        style={{ height: `${stat.percentage}%` }}
                      ></div>
                    </div>

                    {/* ตัวหนังสือ */}
                    <div className="flex flex-col items-center w-full">
                      <span className="text-[9px] text-white font-bold leading-tight drop-shadow-md">
                        {stat.quantity}
                      </span>
                      {/* เปลี่ยน country.name เป็น stat.name */}
                      <span className="text-[8px] text-gray-300 leading-tight truncate w-full text-center mt-0.5">
                        {stat.name.replace(" (M)", "")}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                // Placeholder กรณีไม่มีข้อมูล
                <>
                   {/* Mock Critical */}
                   <div className="flex flex-col items-center justify-end h-full w-10">
                      <div className="flex items-end justify-center h-16 w-full mb-1">
                         <div className="w-8 bg-red-600 rounded-t-md h-[20%]"></div>
                      </div>
                      <div className="flex flex-col items-center w-full">
                         <span className="text-[9px] text-white font-bold">0</span>
                         <span className="text-[8px] text-gray-300">Critical</span>
                      </div>
                   </div>
                   
                   {/* Mock High */}
                   <div className="flex flex-col items-center justify-end h-full w-10">
                      <div className="flex items-end justify-center h-16 w-full mb-1">
                         <div className="w-8 bg-orange-500 rounded-t-md h-[55%]"></div>
                      </div>
                      <div className="flex flex-col items-center w-full">
                         <span className="text-[9px] text-white font-bold">0</span>
                         <span className="text-[8px] text-gray-300">High</span>
                      </div>
                   </div>

                   {/* Mock Medium */}
                   <div className="flex flex-col items-center justify-end h-full w-10">
                      <div className="flex items-end justify-center h-16 w-full mb-1">
                         <div className="w-8 bg-yellow-500 rounded-t-md h-[40%]"></div>
                      </div>
                      <div className="flex flex-col items-center w-full">
                         <span className="text-[9px] text-white font-bold">0</span>
                         <span className="text-[8px] text-gray-300">Medium</span>
                      </div>
                   </div>

                   {/* Mock Low */}
                   <div className="flex flex-col items-center justify-end h-full w-10">
                      <div className="flex items-end justify-center h-16 w-full mb-1">
                         <div className="w-8 bg-green-400 rounded-t-md h-[75%]"></div>
                      </div>
                      <div className="flex flex-col items-center w-full">
                         <span className="text-[9px] text-white font-bold">0</span>
                         <span className="text-[8px] text-gray-300">Low</span>
                      </div>
                   </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="relative bg-black p-[6px] bg-gradient-to-b from-[#b0c4de] to-[#4a5568] shadow-[0_0_10px_rgba(0,150,255,0.25)] mt-[2px] mb-[2px]">
        <div className="bg-black rounded-lg p-[6px] shadow-[inset_0_1px_3px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
          <div className="text-[9px] text-white mb-[4px] tracking-wide text-center font-bold">
            THREAT DISTRIBUTION
          </div>

          <div className="bg-gray-900/70 p-[6px] rounded-lg border-[1.5px] border-[#5c6e87] shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_2px_3px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-[6px]">
              <div className="relative w-20 h-20 flex-shrink-0">
                {pieData.length > 0 && (
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {generatePieChart()}
                  </svg>
                )}
              </div>

              <div className="flex-1 space-y-[2px]">
                {pieData.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-[4px] text-[7px]"
                  >
                    <div
                      className={`w-2 h-2 rounded-sm ${item.color} flex-shrink-0`}
                    ></div>
                    <span
                      className="flex-1 truncate text-ellipsis overflow-hidden whitespace-nowrap"
                      style={{ color: item.hex }}
                      title={item.label}
                    >
                      {formatThreatName(item.label)}
                    </span>
                    <span className="text-white flex-shrink-0">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Threat Alert List */}
      <div className="bg-black backdrop-blur-sm rounded-lg p-2 border-8 border-gray-500 flex-1 flex flex-col min-h-0">
        <div className="text-[15px] mb-2 text-white flex items-center gap-1.5 justify-center font-bold flex-shrink-0">
          THREAT ALERT LIST
        </div>

        <div className="space-y-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 custom-scroll flex-1">
          {threats.map((threat, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-black rounded-md"
            >
              <div className={`${threat.color} w-4 h-8 flex-shrink-0`}></div>
              <div className="flex flex-col text-[15px] leading-tight">
                <span className="text-white font-semibold">
                  {formatThreatName(threat.id)}
                </span>
                <span className="text-white font-mono text-[12px]">
                  {threat.incident}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DevConDashboard;