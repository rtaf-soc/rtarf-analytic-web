import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";

export const Sidebar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => date.toLocaleTimeString("en-US", { hour12: false });

  return (
    <aside className="h-full w-64 bg-slate-950 border-r border-slate-900 flex flex-col shrink-0">
      <div className="p-3 border-b border-slate-900">
        <div className="bg-black rounded-lg p-2 mb-2 border border-slate-800">
          <div className="flex justify-center mb-1">
            <div className="w-30 h-12 flex items-center justify-center">
              <div className="text-center mt-6">
                <img src="img/rtarf.png" alt="RTARF Logo" className="object-contain h-20" />
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <div className="text-[15px] text-gray-400 font-bold">{formatDate(currentTime)}</div>
            <div className="text-sm font-mono font-bold text-white">{formatTime(currentTime)}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {["Dashboard", "Threat Map", "Incidents", "Analysis", "Settings"].map((item, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-md cursor-pointer flex items-center space-x-3 transition-colors ${
              idx === 2
                ? "bg-blue-900/50 text-blue-100 border border-blue-800 shadow-md shadow-blue-900/20"
                : "text-slate-500 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            <Activity size={18} />
            <span className="font-medium text-sm">{item}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
};