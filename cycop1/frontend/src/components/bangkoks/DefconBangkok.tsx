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

interface Country {
  name: string;
  percentage: number;
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

const DevConBangkok = () => {
  const [defconLevel, setDefconLevel] = useState<number>(1);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [pieData, setPieData] = useState<PieDataItem[]>([]);
  const [topCountries, setTopCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      "Others": { color: "bg-gray-500", hex: "#6b7280" },
      "Brute Force": { color: "bg-red-500", hex: "#ef4444" },
      "SQL Injection": { color: "bg-orange-500", hex: "#f97316" },
      "XSS": { color: "bg-cyan-500", hex: "#06b6d4" },
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

      if (
        !defconRes.ok ||
        !severitiesRes.ok ||
        !distributionsRes.ok ||
        !alertsRes.ok
      ) {
        throw new Error("Failed to fetch data from one or more APIs");
      }

      const defconData = await defconRes.json();
      const severitiesData = await severitiesRes.json();
      const distributionsData = await distributionsRes.json();
      const alertsData = await alertsRes.json();

      setDefconLevel(defconData.level || defconData.defconLevel || 1);

      // Severities (Bar chart)
      const severityArray: ApiSeverity[] = Array.isArray(severitiesData)
        ? severitiesData
        : [];

      const sortedSeverities: Country[] = severityArray
        .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
        .slice(0, 3)
        .map((item) => ({
          name: item.serverity || "Unknown",
          percentage: Math.min(100, Math.max(20, item.quantity || 0) / 50),
        }));

      setTopCountries(sortedSeverities);

      // Threat Distribution (Pie chart)
      const distributionsArray = Array.isArray(distributionsData.distributions)
        ? distributionsData.distributions
        : Array.isArray(distributionsData)
        ? distributionsData
        : [];

      // กรองเฉพาะ items ที่มี percentage > 0
      const validDistributions = distributionsArray.filter(
        (item: any) => (item.percentage || item.value || 0) > 0
      );

      let formattedDistributions: PieDataItem[];

      if (validDistributions.length === 0) {
        // ถ้าไม่มีข้อมูล ไม่แสดงอะไร
        formattedDistributions = [];
      } else {
        // เรียงตาม percentage จากมากไปน้อย
        const sortedDistributions = [...validDistributions].sort(
          (a: any, b: any) =>
            (b.percentage || b.value || 0) - (a.percentage || a.value || 0)
        );

        // แยกเป็น top 4 และที่เหลือ
        const top4 = sortedDistributions.slice(0, 4);
        const others = sortedDistributions.slice(4);

        // รวม percentage ของ others
        const othersTotal = others.reduce(
          (sum: number, item: any) => sum + (item.percentage || item.value || 0),
          0
        );

        // format top 4
        formattedDistributions = top4.map(
          (item: any): PieDataItem => {
            const label =
              item.threatName || item.type || item.label || item.name || "";
            const colors = getThreatTypeColor(label);
            return {
              label,
              value: item.percentage || item.value || 0,
              color: colors.color,
              hex: colors.hex,
            };
          }
        );

        // เพิ่ม Others ถ้ามี
        if (othersTotal > 0) {
          const colors = getThreatTypeColor("Others");
          formattedDistributions.push({
            label: "Others",
            value: othersTotal,
            color: colors.color,
            hex: colors.hex,
          });
        }
      }

      setPieData(formattedDistributions);

      // Threat Alerts - ใช้ threatName และ incidentID
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
            incident: parseInt(alert.incidentID || `${idx}`),
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
    <div className="w-60 h-[100vh] bg-black p-2 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden relative">
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

      {/* Activity Chart */}
      <div className="relative bg-black p-[6px] bg-gradient-to-b from-[#b0c4de] to-[#4a5568] shadow-[0_0_14px_rgba(0,150,255,0.3)] mt-1 mb-1">
        <div className="bg-black rounded-lg p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
          <div className="text-[9px] text-white mb-1 tracking-wide text-center font-bold">
            จำนวนการแจ้งเตือนแยกตามระดับความรุนแรง
          </div>

          <div className="bg-gray-900/70 p-2 rounded-lg border-[2px] border-[#5c6e87] shadow-[inset_0_1px_3px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.6)]">
            <div className="h-14 flex items-end justify-center gap-3">
              {topCountries.length > 0 ? (
                topCountries.map((country, idx) => (
                  <div
                    key={idx}
                    className={`w-10 rounded-t-md shadow-[0_-2px_6px_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.6)] ${
                      idx === 0
                        ? "bg-cyan-400"
                        : idx === 1
                        ? "bg-pink-500"
                        : "bg-orange-500"
                    }`}
                    style={{ height: `${country.percentage}%` }}
                  ></div>
                ))
              ) : (
                <>
                  <div
                    className="w-10 bg-pink-500 rounded-t-md shadow-[0_-2px_6px_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.6)]"
                    style={{ height: "55%" }}
                  ></div>
                  <div
                    className="w-10 bg-orange-500 rounded-t-md shadow-[0_-2px_6px_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.6)]"
                    style={{ height: "40%" }}
                  ></div>
                  <div
                    className="w-10 bg-cyan-400 rounded-t-md shadow-[0_-2px_6px_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.6)]"
                    style={{ height: "75%" }}
                  ></div>
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
                    className="flex items-center gap-[4px] text-[8px]"
                  >
                    <div className={`w-2 h-2 rounded-sm ${item.color}`}></div>
                    <span
                      className="flex-1 truncate"
                      style={{ color: item.hex }}
                    >
                      {item.label}
                    </span>
                    <span className="text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Threat Alert List */}
      <div className="bg-black backdrop-blur-sm rounded-lg p-2 mt-1 mb-1 border-8 border-gray-500">
        <div className="text-[15px] mb-2 text-white flex items-center gap-1.5 justify-center font-bold">
          THREAT ALERT LIST
        </div>

        <div className="space-y-1 overflow-y-auto max-h-44 pr-1 scrollbar-thin scrollbar-thumb-gray-700 custom-scroll">
          {threats.map((threat, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-black rounded-md"
            >
              <div className={`${threat.color} w-4 h-8 flex-shrink-0`}></div>
              <div className="flex flex-col text-[15px] leading-tight">
                <span className="text-white font-semibold">{threat.id}</span>
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

export default DevConBangkok;