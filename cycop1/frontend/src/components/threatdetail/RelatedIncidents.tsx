import React from "react";
import { List, Clock } from "lucide-react";

export const RelatedIncidents = ({ alerts }: { alerts: any[] }) => {
  const getSeverityStyle = (label: string) => {
    switch (label) {
      case "H": return { bg: "bg-red-600", text: "text-white", border: "border-red-800" };
      case "M": return { bg: "bg-orange-500", text: "text-black", border: "border-orange-700" };
      case "L": return { bg: "bg-blue-500", text: "text-white", border: "border-blue-700" };
      default: return { bg: "bg-slate-600", text: "text-white", border: "border-slate-700" };
    }
  };

  return (
    <div>
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
        <List size={16} /> Related Incidents / Context
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {alerts.map((alert, index) => {
          const style = getSeverityStyle(alert.label);
          return (
            <div
              key={index}
              className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 hover:bg-slate-800 transition cursor-pointer flex items-start gap-3 group"
            >
              <div className="flex flex-col shrink-0">
                <span className={`${style.bg} ${style.text} text-[10px] font-bold px-1.5 py-0.5 rounded-t-sm text-center w-full`}>
                  {alert.label}
                </span>
                <span className="bg-black text-slate-300 text-xs font-mono font-bold px-1.5 py-0.5 rounded-b-sm border border-t-0 border-slate-700 text-center">
                  {alert.score}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-300 truncate group-hover:text-blue-400 transition">
                  {alert.id}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {alert.title}
                </div>
                <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                  <Clock size={10} /> {alert.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};