import React from "react";
import { ChevronLeft, Share2 } from "lucide-react";

interface TopHeaderProps {
  caseId: string;
}

export const TopHeader = ({ caseId }: TopHeaderProps) => {
  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center space-x-4">
        <button className="p-2 hover:bg-slate-900 rounded-full text-slate-500 transition">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-slate-100 font-semibold text-lg flex items-center gap-2">
            Incident Response
            <span className="text-slate-100 text-sm font-normal">/ {caseId}</span>
          </h1>
        </div>
      </div>
    </header>
  );
};