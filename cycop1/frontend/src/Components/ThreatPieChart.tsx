import { useState, useEffect } from "react";
import { fetchAlertSummary, type AlertSummary } from "../services/defensiveService";

const ThreatPieChart: React.FC = () => {
    const [alertData, setAlertData] = useState<AlertSummary | null>(null);

    // state สำหรับ sync hover ระหว่าง slice และ legend
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    useEffect(() => {
        const loadAllData = async () => {
            const summary = await fetchAlertSummary();
            setAlertData(summary);
        };

        loadAllData();

        const interval = setInterval(loadAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    // เตรียมข้อมูล Pie Chart
    const pieData =
        alertData?.alert_summaries
            ?.slice(0, 5)
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

    // สร้างกราฟ Pie Chart + Hover Animation
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

            const isActive = hoverIndex === idx;

            return (
                <path
                    key={idx}
                    d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={item.hex}
                    className={`
                        transform
                        transition-all
                        duration-300
                        origin-center
                        cursor-pointer
                        ${isActive ? "scale-[1.08] drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" : "opacity-80"}
                    `}
                    onMouseEnter={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                    style={{ transformOrigin: "50% 50%" }}
                />
            );
        });
    };

    return (
        <>
            {/* Pie Chart */}
            <div
                className="
                    relative bg-black p-[6px] 
                    bg-gradient-to-b from-[#b0c4de] to-[#4a5568] 
                    shadow-[0_0_10px_rgba(0,150,255,0.25)] mt-[2px] mb-[2px]
                "
            >
                <div
                    className="bg-black rounded-lg p-[6px] 
                        shadow-[inset_0_1px_3px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.7)]"
                >
                    {/* TITLE */}
                    <div className="text-[9px] text-white mb-[4px] tracking-wide text-center font-bold">
                        THREAT DISTRIBUTION
                    </div>

                    <div
                        className="bg-gray-900/70 p-[6px] rounded-lg border-[1.5px] border-[#5c6e87]
                            shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_2px_3px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex items-center gap-[6px]">
                            <div className="relative w-20 h-20 flex-shrink-0">
                                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                    {generatePieChart()}
                                </svg>
                            </div>

                            {/* LEGEND */}
                            <div className="flex-1 space-y-[2px]">
                                {pieData.map((item, idx) => {
                                    const isActive = hoverIndex === idx;

                                    return (
                                        <div
                                            key={idx}
                                            onMouseEnter={() => setHoverIndex(idx)}
                                            onMouseLeave={() => setHoverIndex(null)}
                                            className={`
                                                flex items-center gap-[4px] text-[8px]
                                                cursor-pointer transition-all duration-200
                                                ${isActive ? "scale-[1.05] translate-x-[3px] text-white" : ""}
                                            `}
                                        >
                                            <div
                                                className={`
                                                    w-2 h-2 rounded-sm ${item.color}
                                                    transition-transform duration-200
                                                    ${isActive ? "scale-125" : ""}
                                                `}
                                            ></div>

                                            <span
                                                className={`
                                                    line-clamp-2 transition-colors duration-200
                                                    ${isActive ? "text-white" : "text-gray-300"}
                                                `}
                                            >
                                                {item.label}
                                            </span>

                                            <span
                                                className={`
                                                    transition-colors duration-200
                                                    ${isActive ? "text-sky-300" : "text-gray-500"}
                                                `}
                                            >
                                                {item.value}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ThreatPieChart;
