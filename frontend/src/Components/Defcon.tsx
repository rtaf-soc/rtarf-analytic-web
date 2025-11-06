import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";

const DevConDashboard = () => {
  const [defconLevel] = useState(1);

  const threats = [
    { id: "THREAT 5", code: "8281034OCT24", color: "bg-yellow-400" },
    { id: "THREAT 4", code: "2809420CT24", color: "bg-yellow-400" },
    { id: "THREAT 3", code: "2805350CT24", color: "bg-yellow-400" },
    { id: "THREAT 2", code: "2801030CT24", color: "bg-red-500" },
    { id: "THREAT 1", code: "272315OCT24", color: "bg-yellow-400" },
  ];

  const pieData = [
    { label: "IP Sweep", value: 35, color: "bg-purple-500", hex: "#a855f7" },
    { label: "Malware", value: 25, color: "bg-pink-500", hex: "#ec4899" },
    { label: "DDoS", value: 20, color: "bg-green-500", hex: "#22c55e" },
    { label: "Phishing", value: 12, color: "bg-yellow-400", hex: "#facc15" },
    { label: "Others", value: 8, color: "bg-blue-400", hex: "#60a5fa" },
  ];

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
    <div className="w-72 h-[100vh] bg-black p-3 rounded-lg shadow-2xl flex flex-col justify-between overflow-hidden">
      {/* DEFCON Status */}
      <div className="bg-black backdrop-blur-sm rounded-lg p-3 border-8 border-gray-600 flex flex-col items-center">
        <div className="text-[20px] text-white font-bold mb-2 tracking-widest ">
          DEFCON
        </div>
        <div className="relative mb-2">
          <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center bg-gray-900">
            <span className="text-4xl font-bold text-green-400">
              {defconLevel}
            </span>
          </div>
          <div className="absolute -inset-1 rounded-full border-4 border-green-400/30 animate-pulse"></div>
        </div>
        <div className="space-y-1 w-full">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className="w-full h-1.5 rounded-full bg-green-500"
            ></div>
          ))}
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2 border border-pink-500/30">
        <div className="text-[9px] text-pink-400 mb-1">
          ▸ IT ASSET FOUND/BOTNET/MALWARE CHANNEL
        </div>
        <div className="bg-gray-900/50 p-1 rounded-lg">
          <div className="h-12 flex items-end justify-center gap-2">
            <div
              className="w-12 bg-pink-500 rounded-t-lg"
              style={{ height: "55%" }}
            ></div>
            <div
              className="w-12 bg-orange-500 rounded-t-lg"
              style={{ height: "40%" }}
            ></div>
            <div
              className="w-12 bg-cyan-400 rounded-t-lg"
              style={{ height: "75%" }}
            ></div>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2 border border-purple-500/30 flex-1 flex flex-col justify-center">
        <div className="text-[9px] text-purple-400 mb-1">
          THREAT DISTRIBUTION
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {generatePieChart()}
            </svg>
          </div>
          <div className="flex-1 space-y-0.5">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 text-[8px]">
                <div className={`w-2 h-2 rounded-sm ${item.color}`}></div>
                <span className="text-gray-300 flex-1 truncate">
                  {item.label}
                </span>
                <span className="text-gray-500">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Threat Alert List */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2 border border-yellow-500/30">
        <div className="text-[10px] text-white mb-1 flex items-center gap-1.5 justify-center font-bold">
          THREAT ALERT LIST
        </div>
        <div className="space-y-1">
          {threats.map((threat, idx) => (
            <div
              key={idx}
              className={`${threat.color} text-gray-900 p-1 rounded text-[8px] font-semibold`}
            >
              <div>{threat.id}</div>
              <div className="text-[7px] font-mono">{threat.code}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DevConDashboard;
