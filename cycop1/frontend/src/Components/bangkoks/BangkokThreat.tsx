import { useState, useEffect } from "react";
import { fetchAlertSummary, type AlertSummary, fetchLatestAlert } from "../../services/defensiveService";
import { type AlertBase } from "../../types/defensive";

interface BangkokThreatProps {
  title?: string;
  filterSeverity?: 'critical' | 'high' | 'medium' | 'low';
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

  const filteredThreats = filterSeverity
    ? threatData.filter((item) => item.severity === filterSeverity)
    : threatData;

  const threats = filteredThreats?.map((item) => ({
    description: item.description,
    code: item.incident_id,
    color: getSeverityColor(item.severity),
  }));

  if (!alertData) {
    return (
      <div className="flex justify-center items-center h-full bg-black text-white text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className={`w-63 h-60 ${backgroundColor} rounded-2xl shadow-2xl`}>
      {/* Threat Alert List */}
      <div className={`backdrop-blur-sm rounded-lg p-2 border-8 ${borderColor}`}>
        {/* Header */}
        <div className="text-[15px] mb-2 text-white flex items-center gap-1 justify-center font-bold">
          {logoPath && (
            <img src={logoPath} alt={title} className="w-8 h-8 object-contain" />
          )}
          <span>{title}</span>
        </div>

        <div className="space-y-1 overflow-y-auto max-h-44 pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {threats.length > 0 ? (
            threats.map((threat, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-black rounded-md">
                <div className={`${threat.color} w-4 h-8 flex-shrink-0`}></div>
                <div className="flex flex-col flex-1 min-w-0 text-[15px] leading-tight">
                  <span className="text-white font-semibold truncate" title={threat.description}>
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
