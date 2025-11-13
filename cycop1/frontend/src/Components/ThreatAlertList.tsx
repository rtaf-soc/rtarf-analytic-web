import { useState, useEffect, useRef } from "react";
import { fetchAlertSummary, type AlertSummary, fetchLatestAlert, type RtarfAverageSeverityPayload, fetchRtarfAverageSummary, type RtarfSeverityStatistics, fetchRtarfSeverityStatistics } from "../services/defensiveService";
import type { AlertBase } from "../types/defensive";


const ThreatAlertList: React.FC = () => {
    const [threatData, setThreatData] = useState<AlertBase[]>([]);

    useEffect(() => {
        const loadAllData = async () => {
            const threat = await fetchLatestAlert();
            console.log("Show threat:", threat);
            setThreatData(threat);
        };

        loadAllData();

        const interval = setInterval(loadAllData, 30000);
        return () => clearInterval(interval);
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

    const threats = threatData?.map((item) => ({
        description: item.description,
        code: item.incident_id,
        color: getSeverityColor(item.severity),
    })
    )

    return (
        <>
            {/* Threat Alert List */}
            <div className="bg-black backdrop-blur-sm rounded-lg p-2 mt-1 mb-1 border-8 border-gray-500 shadow-lg">
                <div className="text-[14px] mb-2 text-white flex items-center gap-1.5 justify-center font-bold">
                    <span className="animate-pulse text-red-500">⚠</span>
                    THREAT ALERT LIST
                    <span className="animate-pulse text-red-500">⚠</span>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-44 pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                    {threats.map((threat, idx) => (
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
                    ))}
                </div>
            </div>
        </>
    )
}

export default ThreatAlertList;