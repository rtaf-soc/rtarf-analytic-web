import React from "react";
import { Shield } from "lucide-react";

export const ThreatMainBanner = ({ data }: { data: any }) => {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-900/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

      <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-stretch rounded-md overflow-hidden shadow-lg shadow-red-900/20">
              <div className="bg-red-600 text-white font-bold px-3 py-1 flex items-center justify-center text-lg">
                {data.severity_label}
              </div>
              <div className="bg-black text-slate-200 font-mono font-bold px-3 py-1 flex items-center justify-center text-lg border-y border-r border-slate-700">
                {data.severity_score}
              </div>
            </div>
            <span className="text-red-500 font-bold tracking-wider text-sm border border-red-900/50 bg-red-950/30 px-2 py-0.5 rounded">
              {data.severity_full}
            </span>
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Shield size={12} /> Source: {data.detection_source}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-100 tracking-tight leading-tight mb-2">
            {data.title}
          </h2>
          <p className="text-slate-400 text-sm font-normal italic">
            {data.subtitle}
          </p>
        </div>

        <div className="flex flex-col items-end justify-start gap-2 min-w-[150px]">
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">
              Status
            </div>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-slate-200 font-bold">{data.status}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Open for {data.status_duration}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};