import React from "react";
import { BarChart3 } from "lucide-react";

export const GlobalThreatStats = ({ stats }: { stats: any[] }) => {
  return (
    <div>
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
        <BarChart3 size={16} /> Global Threat Status
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.bg} ${stat.border} border rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-opacity-60 transition-all cursor-default`}
          >
            <div
              className={`absolute -top-10 -right-10 w-24 h-24 ${stat.bg.replace(
                "/40",
                "/20"
              )} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`}
            ></div>
            <span className={`text-3xl font-black ${stat.color} z-10 drop-shadow-sm`}>
              {stat.count}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 z-10">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};