import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { fetchAlertSummary, type AlertSummary } from "../services/postgresService";

const DevConDashboard = () => {
  const [alertData, setAlertData] = useState<AlertSummary | null>(null);
  const [defconLevel] = useState(1);
  const threats = [
    { id: "THREAT 5", code: "8281034OCT24", color: "bg-yellow-300" },
    { id: "THREAT 4", code: "2809420CT24", color: "bg-yellow-300" },
    { id: "THREAT 3", code: "2805350CT24", color: "bg-yellow-400" },
    { id: "THREAT 2", code: "2801030CT24", color: "bg-red-500" },
    { id: "THREAT 1", code: "272315OCT24", color: "bg-yellow-400" },
  ];

  useEffect(() => {
    const loadAlertData = async () => {
      const summary = await fetchAlertSummary();
      console.log("Show alert:", summary);
      setAlertData(summary);
    };
    loadAlertData();
  }, []);

  // ✅ Convert backend data to pie chart data
  const pieData =
    alertData?.alert_summarys
      ?.slice(0, 5) // top 5 categories for pie
      .map((item, i) => ({
        label: item.alert_name,
        value: item.count,
        // Randomized color palette (you can tweak)
        color: [
          "bg-purple-500",
          "bg-pink-500",
          "bg-green-500",
          "bg-yellow-400",
          "bg-blue-400",
        ][i % 5],
        hex: ["#a855f7", "#ec4899", "#22c55e", "#facc15", "#60a5fa"][i % 5],
      })) || [];

  // ✅ Fallback while loading
  if (!alertData) {
    return (
      <div className="flex justify-center items-center h-screen bg-black text-white">
        Loading Threat Dashboard...
      </div>
    );
  }

  // ✅ Calculate total for pie chart
  const totalValue = pieData.reduce((sum, item) => sum + item.value, 0) || 1;

  // ✅ Generate pie chart arcs
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
    <div className="w-60 h-[100vh] bg-black p-2 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden">
      {/*DEFCON Status*/}

      <div className="bg-black backdrop-blur-sm rounded-lg p-3 border-8 border-gray-500 flex flex-col">
        {/*ชื่อ DEFCON ให้อยู่ตรงกลาง*/}
        <div className="text-[25px] text-white font-bold mb-3 tracking-wider text-center">
          DEFCON
        </div>

        {/* ส่วน DEFCON Level */}
        <div className="flex items-center justify-between">
          {/* 🔹 กรอบด้านซ้าย 4 ช่อง */}
          <div className="flex flex-col justify-center gap-1.5">
            {[4, 3, 2, 1].map((level) => (
              <div
                key={level}
                className={`w-12 h-4 border-2 ${level === defconLevel
                  ? "border-green-500 bg-green-400 shadow-[0_0_10px_rgba(0,255,0,0.7)]"
                  : "border-gray-600 bg-transparent"
                  }`}
              ></div>
            ))}
          </div>

          {/* 🔸 วงกลม Defcon Level */}
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

      {/* ActivityChart */}
      <div
        className="relative bg-black p-[6px] 
        bg-gradient-to-b from-[#b0c4de] to-[#4a5568] shadow-[0_0_14px_rgba(0,150,255,0.3)] mt-1 mb-1"
      >
        <div className="bg-black rounded-lg p-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-2px_4px_rgba(0,0,0,0.7)]">
          <div className="text-[9px] text-white mb-1 tracking-wide text-center font-bold">
            Top 3 ประเทศ ลาดตระเวนมายังเครือข่ายประจำสัปดาห์
          </div>

          <div
            className="bg-gray-900/70 p-2 rounded-lg border-[2px] border-[#5c6e87] 
            shadow-[inset_0_1px_3px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.6)]"
          >
            <div className="h-14 flex items-end justify-center gap-3">
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
            </div>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div
        className="relative bg-black p-[6px] 
  bg-gradient-to-b from-[#b0c4de] to-[#4a5568] 
  shadow-[0_0_10px_rgba(0,150,255,0.25)] mt-[2px] mb-[2px]"
      >
        <div
          className="bg-black rounded-lg p-[6px] 
    shadow-[inset_0_1px_3px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.7)]"
        >
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

              <div className="flex-1 space-y-[2px]">
                {pieData.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-[4px] text-[8px]"
                  >
                    <div className={`w-2 h-2 rounded-sm ${item.color}`}></div>
                    <span className="text-gray-300 line-clamp-2">
                      {item.label}
                    </span>
                    <span className="text-gray-500">{item.value}%</span>
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

        <div className="space-y-1 overflow-y-auto max-h-44 pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          {threats.map((threat, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-black rounded-md"
            >
              {/* แถบสีทางซ้าย */}
              <div className={`${threat.color} w-4 h-8 flex-shrink-0`}></div>

              {/* ข้อความ Threat ID และ Code */}
              <div className="flex flex-col text-[15px] leading-tight">
                <span className="text-white font-semibold">{threat.id}</span>
                <span className="text-white font-mono text-[12px]">
                  {threat.code}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DevConDashboard;
