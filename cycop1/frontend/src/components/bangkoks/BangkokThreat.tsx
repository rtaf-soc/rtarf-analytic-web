import { useState, useEffect } from "react";
import { fetchLatestAlert } from "../../services/defensiveService";
import { type AlertBase } from "../../types/defensive";
import SeverityStatistics from "./SeverityStatistics";
import { useNavigate } from "react-router-dom"; 
import "./BangkokThreat.css";

// Interface
export interface UiThreatSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface BangkokThreatProps {
  title?: string;
  filterSeverity?: 'all' | 'critical' | 'high' | 'medium' | 'low';
  logoPath?: string;
  backgroundColor?: string;
  borderColor?: string;
  dataSummary?: UiThreatSummary | null;
  dataThreats?: AlertBase[];
  onThreatClick?: (incidentId: string) => void;
}

const BangkokThreat = ({
  title = "THREAT ALERT LIST",
  filterSeverity,
  logoPath,
  backgroundColor = "bg-black",
  borderColor = "border-gray-500",
  dataSummary,
  dataThreats,
  onThreatClick,
}: BangkokThreatProps) => {

  const navigate = useNavigate();

  // State ภายใน
  const [internalAlertData, setAlertData] = useState<UiThreatSummary | null>(null);
  const [internalThreatData, setThreatData] = useState<AlertBase[]>([]);

  // Logic เลือกข้อมูล
  const finalAlertData = dataSummary !== undefined ? dataSummary : internalAlertData;
  const finalThreatData = dataThreats !== undefined ? dataThreats : internalThreatData;

  useEffect(() => {
    if (dataSummary !== undefined || dataThreats !== undefined) {
      return;
    }
    const loadAlertData = async () => {
      try {
        const threat = await fetchLatestAlert();
        setThreatData(threat);
      } catch (error) {
        console.error(error);
      }
    };
    loadAlertData();
  }, [dataSummary, dataThreats]);

  function getSeverityColor(severity?: string): string {
    switch (severity?.toLowerCase()) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-blue-500";
      default: return "bg-gray-300";
    }
  }

  const filteredThreats = filterSeverity && filterSeverity !== 'all'
    ? finalThreatData.filter((item) => item.severity === filterSeverity)
    : finalThreatData;

  const threats = filteredThreats?.map((item) => ({
    description: item.description,
    code: String(item.incident_id),
    color: getSeverityColor(item.severity),
  })) || [];

  // --- LOADING STATE ---
  if (!finalAlertData && finalThreatData.length === 0) {
    return (
      <div className={`w-63 h-60 ${backgroundColor} rounded-2xl shadow-2xl flex flex-col items-center justify-center p-4`}>
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-3 border-gray-700 border-t-cyan-400 animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 rounded-full border-3 border-gray-700 border-b-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-lg animate-pulse">⚠</div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="text-cyan-400 text-xs font-bold tracking-wider animate-pulse">
            LOADING DATA
          </div>
        </div>
      </div>
    );
  }

  // --- CONTENT STATE ---
  return (
    <div className={`w-63 h-60 ${backgroundColor} rounded-2xl shadow-2xl flex flex-col`}>
      <div className="p-1">
        <SeverityStatistics threats={filteredThreats} />
      </div>

      <div className={`backdrop-blur-sm rounded-lg p-2 border-8 ${borderColor} flex-1 flex flex-col overflow-hidden`}>
        <div className="text-[15px] mb-1 text-white flex items-center justify-between font-bold px-2">
          <div className="w-8 flex-shrink-0">
            {logoPath && <img src={logoPath} alt={title} className="w-8 h-8 object-contain" />}
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
                onClick={() => {
                    navigate(`/threatdetail?id=${threat.code}`);
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
                  <div className={`absolute inset-0 ${threat.color} blur-xl animate-pulse`}></div>
                </div>
                <div className={`${threat.color} w-4 h-8 flex-shrink-0 relative group-hover:shadow-lg transition-all duration-300`}>
                  <div className={`absolute inset-0 ${threat.color} blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300`}></div>
                </div>
                <div className="flex flex-col flex-1 min-w-0 text-[15px] leading-tight z-10">
                  <span className="text-white font-semibold truncate group-hover:text-gray-200 transition-colors duration-300" title={threat.description}>
                    {threat.description}
                  </span>
                  <span className="text-gray-400 font-mono text-[12px] truncate group-hover:text-gray-300 transition-colors duration-300" title={threat.code}>
                    {threat.code}
                  </span>
                </div>
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