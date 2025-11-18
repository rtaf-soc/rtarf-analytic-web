import React, { useState, useEffect } from "react";
import { type RtarfAverageSeverityPayload, fetchRtarfAverageSummary } from "../../services/defensiveService";


const Defconcard: React.FC = () => {
    const [avgSeverity, setAvgSeverity] = useState<RtarfAverageSeverityPayload | null>(null);
    const [defconLevel, setDefconLevel] = useState(1);

    useEffect(() => {
        const loadAllData = async () => {
            const severity = await fetchRtarfAverageSummary();
            console.log("Show severity average:", severity);
            setAvgSeverity(severity);

            if (severity && severity.average_severity_level > 0) {
                setDefconLevel(severity.average_severity_level);
            }
        };

        loadAllData();

        const interval = setInterval(loadAllData, 30000);
        return () => clearInterval(interval);
    }, []);


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

    const defconColors = getDefconColor(defconLevel);

    return (
        <div className="w-60 h-[100vh] bg-black p-1 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden">
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
                                    className={`w-12 h-4 border-2 transition-all duration-300 hover:scale-110 cursor-pointer relative ${isActive
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

                {/* Severity Info */}
                {/* {avgSeverity && (
          <div className="mt-3 text-center">
            <div className="text-xs text-gray-400">ระดับภัยคุกคาม</div>
            <div className={`text-lg font-bold ${defconColors.text} uppercase`}>
              {avgSeverity.danger_level}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {avgSeverity.events_with_severity} / {avgSeverity.total_events} events
            </div>
          </div>
        )} */}
            </div>
        </div>

    );
}

export default Defconcard;
