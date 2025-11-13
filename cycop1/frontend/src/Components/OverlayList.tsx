import React, { useState, useEffect } from "react";
import { Globe, Check } from "lucide-react";

const OverlayList = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  interface DateFormatter {
    (date: Date): string;
  }

  const formatDate: DateFormatter = (date) => {
    const days: string[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months: string[] = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    return `${days[date.getDay()]} ${date.getDate()} ${
      months[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  interface OverlayItem {
    name: string;
    color: string;
    checked: boolean;
  }

  const formatTime: DateFormatter = (date: Date): string => {
    return date.toLocaleTimeString("en-US", { hour12: false });
  };

  const overlayItems = [
    { name: "RTARF INTERNAL NETWORK", color: "bg-blue-500", checked: true },
    { name: "EXTERNAL NETWORK", color: "bg-blue-600", checked: false },
    { name: "THAILAND INFRASTRUCTURE", color: "bg-blue-700", checked: false },
    { name: "OPPOSITE INFRASTRUCTURE", color: "bg-purple-500", checked: false },
    { name: "OPPOSITE TARGET LIST", color: "bg-purple-600", checked: false },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-60 bg-blue text-white p-1 border-r-2 border-black flex flex-col">
      {/* Logo and DateTime */}
      <div className="bg-black rounded-lg p-2 mb-2 border border-black">
        <div className="flex justify-center mb-1">
          <div className="w-30 h-12 flex items-center justify-center">
            <div className="text-center mt-6">
              <img src="img/rtarf.png" alt="" />
            </div>
          </div>
        </div>
        <div className="text-center mt-8">
          <div className="text-[15px] text-gray-300 font-bold">
            {formatDate(currentTime)}
          </div>
          <div className="text-sm font-mono font-bold text-white">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      <div className="bg-slate-700 rounded p-1 relative overflow-hidden border-8 border-gray-500 mb-1">
        {/* SVG World Map */}
        <img
          src="img/world.svg"
          alt="World Map"
          className="w-full h-24 object-contain rounded"
        />

        {/* Marker: Thailand position */}
        {/* พิกัดนี้อิงจาก world.svg ที่เป็นแบบแผนที่ Mercator */}
        <div
          className="absolute border-3 border-green-500 animate-pulse"
          style={{
            left: "72%", // ปรับได้ตามจุดจริงใน SVG
            top: "40%", // ปรับได้ตามจุดจริงใน SVG
            width: "25px",
            height: "25px",
          }}
        ></div>

        {/* เพิ่ม Glow Effect รอบ marker */}
        <div
          className="absolute rounded-full bg-green-400 opacity-50 blur-sm"
          style={{
            left: "calc(73% - 3px)",
            top: "calc(48% - 3px)",
            width: "12px",
            height: "12px",
          }}
        ></div>
      </div>

      {/* Overlay List */}
      <div className="bg-black rounded-lg p-2 mb-1 border-8 border-gray-500 flex-shrink-0 w-57">
        <div className="text-[15px] font-bold mb-1.5 text-white border-b border-gray-600 pb-1 flex justify-center">
          OVERLAY LIST
        </div>
        <div className="space-y-1">
          {overlayItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 ${item.color} `}>
                {item.checked && <Check className="w-2 h-2 text-white" />}
              </div>
              <span className="text-[12px] text-gray-300 flex-1 font-bold">
                {item.name}
              </span>
            </div>
          ))}
        </div>

        {/* Control buttons */}
        <div className="flex gap-1 mt-2 pt-2 border-t border-gray-600">
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>🔍</span>
          </button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>📁</span>
          </button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>💾</span>
          </button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>🗑️</span>
          </button>
        </div>
      </div>

      {/* SITREP */}
      <div className="bg-black rounded-lg p-2 border-8 border-gray-500 flex-1 overflow-hidden w-57">
        <div className="text-[15px] font-bold mb-1.5 text-white border-b border-black pb-2 flex justify-center ">
          SITREP
        </div>

        <div className="bg-cyan-50 rounded p-2 space-y-1.5 text-[15px] h-full overflow-y-auto">
          {/* H/W Information */}
          <div>
            <div className="text-black font-semibold mb-0.5">
              H/W Information
            </div>
            <div className="space-y-0 text-black ml-1 text-[12px]">
              <div>
                • Name: DESKTOP <span className="text-blue-700">-AUH446P</span>
              </div>
              <div>
                • Location:{" "}
                <span className="text-blue-700">13.7563, 100.5018</span>
              </div>
            </div>
          </div>

          {/* Network Information */}
          <div>
            <div className="text-black font-semibold mb-0.5">
              Network Information
            </div>
            <div className="space-y-0 text-black ml-1 text-[12px]">
              <div>• IP: 192.168.1.14/26</div>
              <div>• G/W: 192.168.101.1</div>
            </div>
          </div>

          {/* OwnerIn formation*/}
          <div>
            <div className="text-black font-semibold mb-0.5">
              Owner Information
            </div>
            <div className="space-y-0 text-black ml-1 text-[12px]">
              <div>• Owner name: Unknown</div>
            </div>
          </div>

          {/* Used Application */}
          <div>
            <div className="text-black font-semibold mb-0.5">
              Used Application
            </div>
            <div className="space-y-0 text-black ml-1 text-[12px]">
              <div>• Slack Messenger v4.27.154</div>
              <div>• Word 97/PC v6.32.10.1</div>
              <div>• Microsoft Excel 2019 v1.23.41</div>
              <div className="text-blue-400">+ 32 applications</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlayList;
