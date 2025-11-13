import { useState, useEffect, useRef } from "react";
import { type RtarfSeverityStatistics, fetchRtarfSeverityStatistics } from "../services/defensiveService";
import * as Chart from "chart.js";

Chart.Chart.register(
  Chart.BarController,
  Chart.BarElement,
  Chart.CategoryScale,
  Chart.LinearScale,
  Chart.Tooltip
);


const SeveritySummaryCard: React.FC = () => {
    const [severityStats, setSeverityStats] = useState<RtarfSeverityStatistics | null>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart.Chart | null>(null);

    useEffect(() => {
        const loadAllData = async () => {
            const severityRanking = await fetchRtarfSeverityStatistics();
            console.log("Show severity ranking:", severityRanking);
            setSeverityStats(severityRanking);
        };

        loadAllData();

        const interval = setInterval(loadAllData, 30000);
        return () => clearInterval(interval);
    }, []);

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

    return (
        <>
            {/* Severity amount Chart */}
            <div
                className="relative bg-black p-[6px] 
        bg-gradient-to-b from-[#b0c4de] to-[#4a5568] shadow-[0_0_14px_rgba(0,150,255,0.3)] mt-1 mb-1"
            >
                <div className="bg-black rounded-lg p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
                    <div className="text-[9px] text-white mb-1 tracking-wide text-center font-bold">
                        จำนวนการแจ้งเตือนแยกตามระดับความรุนแรง
                    </div>

                    <div
                        className="bg-gray-900/70 p-2 rounded-lg border-[2px] border-[#5c6e87] 
            shadow-[inset_0_1px_3px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.6)]"
                    >
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
        </>
    )
}

export default SeveritySummaryCard;