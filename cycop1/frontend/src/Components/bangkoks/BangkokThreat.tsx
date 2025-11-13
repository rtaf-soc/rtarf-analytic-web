import { useState, useEffect } from "react";
import { fetchAlertSummary, type AlertSummary, fetchLatestAlert } from "../../services/defensiveService";
import { type AlertBase } from "../../types/defensive";

interface BangkokThreatProps {
  title?: string;
  filterSeverity?: 'critical' | 'high' | 'medium' | 'low';
  logoPath?: string; // เพิ่ม props สำหรับ logo
}

const BangkokThreat = ({ title = "THREAT ALERT LIST", filterSeverity, logoPath }: BangkokThreatProps) => {
  const [alertData, setAlertData] = useState<AlertSummary | null>(null);
  const [threatData, setThreatData] = useState<AlertBase[]>([]);

  useEffect(() => {
    const loadAlertData = async () => {
      const summary = await fetchAlertSummary();
      const threat = await fetchLatestAlert();
      console.log("Show alert:", summary);
      console.log("Show threat:", threat)
      setAlertData(summary);
      setThreatData(threat);
    };
    loadAlertData();
  }, []);

  function getSeverityColor(severity?: string): string {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  }

  // Filter threats by severity if specified
  const filteredThreats = filterSeverity
    ? threatData.filter(item => item.severity === filterSeverity)
    : threatData;

  const threats = filteredThreats?.map((item) => ({
    description: item.description,
    code: item.incident_id,
    color: getSeverityColor(item.severity),
  }));

  // Fallback while loading
  if (!alertData) {
    return (
      <div className="flex justify-center items-center h-full bg-black text-white text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-66 h-59 bg-black rounded-2xl shadow-2xl">
      {/* Threat Alert List */}
      <div className="bg-black backdrop-blur-sm rounded-lg p-2 border-8 border-gray-500">
        {/* Header with Logo and Title */}
        <div className="text-[15px] mb-2 text-white flex items-center gap-2 justify-center font-bold">
          {logoPath && (
            <img
              src={logoPath}
              alt={title}
              className="w-8 h-8 object-contain"
            />
          )}
          <span>{title}</span>
        </div>

        <div className="space-y-1 overflow-y-auto max-h-44 pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
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
                <div className={`${threat.color} w-4 h-8 shrink-0 relative group-hover:shadow-lg transition-all duration-300`}>
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
                <div className="shrink-0 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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