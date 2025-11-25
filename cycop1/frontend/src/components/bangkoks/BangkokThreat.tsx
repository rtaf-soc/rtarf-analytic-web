import { useState, useEffect } from "react";
import { fetchAlertSummary, type AlertSummary, fetchLatestAlert } from "../../services/defensiveService";
import { type AlertBase } from "../../types/defensive";
import SeverityStatistics from "./SeverityStatistics";
import "./BangkokThreat.css"

interface BangkokThreatProps {
  title?: string;
  filterSeverity?: 'all' | 'critical' | 'high' | 'medium' | 'low';
  logoPath?: string;
  backgroundColor?: string; // ✅ เพิ่ม props สีพื้นหลัง
  borderColor?: string; // ✅ เพิ่ม props สีขอบ border
}

const BangkokThreat = ({
  title = "THREAT ALERT LIST",
  filterSeverity,
  logoPath,
  backgroundColor = "bg-black", // ✅ ค่าพื้นฐาน
  borderColor = "border-gray-500", // ✅ ค่าพื้นฐาน
}: BangkokThreatProps) => {
  const [alertData, setAlertData] = useState<AlertSummary | null>(null);
  const [threatData, setThreatData] = useState<AlertBase[]>([]);

  useEffect(() => {
    const loadAlertData = async () => {
      const summary = await fetchAlertSummary();
      const threat = await fetchLatestAlert();
      console.log("Show alert:", summary);
      console.log("Show threat:", threat);
      setAlertData(summary);
      setThreatData(threat);
    };
    loadAlertData();
  }, []);

  function getSeverityColor(severity?: string): string {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-300";
    }
  }

  const filteredThreats = filterSeverity && filterSeverity !== 'all'
    ? threatData.filter((item) => item.severity === filterSeverity)
    : threatData;

  const threats = filteredThreats?.map((item) => ({
    description: item.description,
    code: item.incident_id,
    color: getSeverityColor(item.severity),
  }));

  if (!alertData) {
  return (
    <div className={`w-63 h-60 ${backgroundColor} rounded-2xl shadow-2xl flex flex-col items-center justify-center p-4`}>
      <div className="relative">
        {/* Spinning border rings */}
        <div className="w-16 h-16 rounded-full border-3 border-gray-700 border-t-cyan-400 animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 rounded-full border-3 border-gray-700 border-b-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
        
        {/* Center glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
        </div>
        
        {/* Alert icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-lg animate-pulse">⚠</div>
        </div>
      </div>
      
      {/* Loading text */}
      <div className="mt-4 text-center">
        <div className="text-cyan-400 text-xs font-bold tracking-wider animate-pulse">
          LOADING DATA
        </div>
        <div className="flex justify-center gap-1 mt-2">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
      
      {/* Optional logo display during loading */}
      {logoPath && (
        <div className="mt-3 opacity-50">
          <img src={logoPath} alt="Loading" className="w-10 h-10 object-contain grayscale animate-pulse" />
        </div>
      )}
    </div>
  );
}

  return (
    <div className={`w-63 h-60 ${backgroundColor} rounded-2xl shadow-2xl flex flex-col`}>
      <div className="p-1">
        <SeverityStatistics threats={filteredThreats} />
      </div>

      {/* Threat Alert List - adjust to fill remaining space */}
      <div className={`backdrop-blur-sm rounded-lg p-2 border-8 ${borderColor} flex-1 flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="text-[15px] mb-1 text-white flex items-center justify-between font-bold px-2">
          <div className="w-8 flex-shrink-0">
            {logoPath && (
              <img src={logoPath} alt={title} className="w-8 h-8 object-contain" />
            )}
          </div>
          <div className="flex-1 overflow-hidden px-1">
            <div className="animate-scroll-left whitespace-nowrap">
              <span className="inline-block">{title}</span>
              <span className="inline-block ml-8">{title}</span>
            </div>
          </div>
          <div className="w-8 flex-shrink-0"></div>
        </div>
        <div className="space-y-1 overflow-y-auto flex-1 pr-1 custom-scroll">
          {threats.length > 0 ? (
            threats.map((threat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-black rounded-md hover:bg-gray-900 transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                {/* Glowing animated background on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
                  <div className={`absolute inset-0 ${threat.color} blur-xl animate-pulse`}></div>
                </div>

                {/* แถบสีทางซ้าย with glow effect */}
                <div className={`${threat.color} w-4 h-8 flex-shrink-0 relative group-hover:shadow-lg transition-all duration-300`}>
                  <div className={`absolute inset-0 ${threat.color} blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300`}></div>
                </div>

                {/* ข้อความ Threat ID และ Code */}
                <div className="flex flex-col flex-1 min-w-0 text-[15px] leading-tight z-10">
                  <span
                    className="text-white font-semibold truncate group-hover:text-gray-200 transition-colors duration-300"
                    title={threat.description}
                  >
                    {threat.description}
                  </span>
                  <span
                    className="text-gray-400 font-mono text-[12px] truncate group-hover:text-gray-300 transition-colors duration-300"
                    title={threat.code}
                  >
                    {threat.code}
                  </span>
                </div>

                {/* Pulse indicator on right side */}
                <div className="flex-shrink-0 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className={`w-2 h-2 rounded-full ${threat.color} animate-pulse`}></div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-center text-sm py-4">
              No threats found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BangkokThreat;
