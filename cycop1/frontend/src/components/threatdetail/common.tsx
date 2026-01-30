import React from "react";
import { CheckCircle } from "lucide-react";

// Helper Component: แสดงข้อมูลย่อย (ใช้ใน Asset Card)
export const DetailItem = ({ label, value, icon }: any) => (
  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
    <div className="text-slate-500 text-xs mb-1 flex items-center gap-2">
      {icon} {label}
    </div>
    <div className="text-slate-300 font-medium text-sm">{value}</div>
  </div>
);

// Helper Component: ปุ่ม Action (ใช้ใน Response Actions)
export const ActionButton = ({ label, sub, color }: any) => {
  const baseClass =
    "w-full p-3 rounded-lg border text-left transition flex items-center justify-between group";
  const colors: any = {
    red: "bg-red-950/30 border-red-900/50 hover:bg-red-900/40 text-red-400",
    orange:
      "bg-orange-950/30 border-orange-900/50 hover:bg-orange-900/40 text-orange-400",
    slate: "bg-slate-800/40 border-slate-700 hover:bg-slate-800 text-slate-400",
  };
  return (
    <button className={`${baseClass} ${colors[color]}`}>
      <div>
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs opacity-60">{sub}</div>
      </div>
      <CheckCircle
        size={16}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </button>
  );
};