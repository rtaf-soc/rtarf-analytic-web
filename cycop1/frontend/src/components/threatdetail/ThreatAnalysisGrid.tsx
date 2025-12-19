import React from "react";
import { Server, AlertTriangle, Globe, Cpu, Terminal, ExternalLink, FileText } from "lucide-react";
import { DetailItem, ActionButton } from "./common";

export const ThreatAnalysisGrid = ({ data }: { data: any }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Key Assets */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-sm">
          <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
            <Server size={18} className="text-blue-500" /> Key Assets & Artifacts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 bg-red-950/20 p-3 rounded-lg border border-red-900/30 flex items-center gap-3">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <div>
                <div className="text-red-400 text-xs font-bold uppercase">Primary Artifact</div>
                <div className="text-white font-mono text-lg tracking-wide">{data.attacker_ip}</div>
                <div className="text-red-400/70 text-xs flex items-center gap-1 mt-1">
                  <Globe size={10} /> {data.attacker_location}
                </div>
              </div>
            </div>
            <DetailItem label="Target Asset" value={data.target_asset} icon={<Server size={14} />} />
            <DetailItem label="Technique" value={data.technique} icon={<Cpu size={14} />} />
          </div>
        </div>

        {/* Automations */}
        <div className="bg-black rounded-xl border border-slate-800 shadow-lg overflow-hidden">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-orange-500" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Playbook Recommendations / Automation
              </span>
            </div>
            <div className="text-orange-500 text-xs font-bold">12 Recommendations</div>
          </div>
          <div className="p-0">
            {data.automations.map((log: string, index: number) => (
              <div key={index} className="flex gap-3 px-4 py-2 border-b border-slate-900/50 hover:bg-slate-900/30 transition">
                <div className="flex items-center justify-center w-5 h-5 rounded bg-orange-900/30 text-orange-500 text-[10px] font-bold shrink-0">M</div>
                <span className="text-slate-400 text-xs font-mono truncate">{log}</span>
              </div>
            ))}
            <div className="px-4 py-2 text-xs text-blue-500 cursor-pointer hover:underline flex items-center gap-1">
              View all issues & insights <ExternalLink size={10} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-sm">
          <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
            <FileText size={16} /> Description
          </h3>
          <p className="text-slate-400 leading-relaxed text-sm">{data.description}</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h3 className="text-slate-100 font-semibold mb-4">Response Actions</h3>
          <div className="space-y-3">
            <ActionButton label="Isolate Endpoint" sub="Network Containment" color="red" />
            <ActionButton label="Block Artifact IP" sub="Palo Alto NGFW" color="orange" />
            <ActionButton label="Run Forensics" sub="Cortex XDR" color="slate" />
          </div>
        </div>
      </div>
    </div>
  );
};