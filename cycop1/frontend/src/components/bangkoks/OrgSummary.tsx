import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Activity, AlertTriangle, TrendingUp, Search, Filter } from "lucide-react";
import { mapScoreToSeverity } from "../mitreCard/mitreData";
import { LoadingScreen } from "../threatdetail/LoadingScreen";

interface OrgStatusApi {
  id: string;
  name: string;
  short_name: string;
  status: string;
  message: string;
  stats: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  threat_list: Array<{
    threatName: string;
    threatDetail: string;
    serverity: string | null;
    incidentID: string;
    quantity: number;
    percentage: number;
  }>;
}

interface ApiSeverityItem {
  serverity?: string;
  quantity?: number;
}
interface ApiAlertItem {
  threatName?: string;
  threatDetail?: string;
  incidentID?: string;
  serverity?: string;
}

const OrgSummary = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orgId = searchParams.get("id");

  const [orgData, setOrgData] = useState<OrgStatusApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [severityPercent, setSeverityPercent] = useState({ c: 0, h: 0, m: 0, l: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const startTime = Date.now();

      try {
        let fetchedData: OrgStatusApi | null = null;

        if (orgId === "rtarf") {
          const [severitiesRes, alertsRes] = await Promise.all([
            fetch("/api/severities"),
            fetch("/api/threatalerts"),
          ]);
          const severitiesData = await severitiesRes.json();
          const alertsData = await alertsRes.json();

          const rawAlerts = Array.isArray(alertsData.alerts) ? alertsData.alerts : Array.isArray(alertsData) ? alertsData : [];
          const threatList = rawAlerts.map((item: ApiAlertItem) => ({
            threatName: item.threatName || "Unknown",
            threatDetail: item.threatDetail || "",
            serverity: item.serverity || "low",
            incidentID: item.incidentID || "N/A",
            quantity: 1,
            percentage: 0,
          }));

          const stats = { critical: 0, high: 0, medium: 0, low: 0 }; // จะถูกคำนวณใหม่
          fetchedData = {
            id: "rtarf",
            name: "กองบัญชาการกองทัพไทย",
            short_name: "RTARF",
            status: "Normal",
            message: "System Operational",
            stats: stats,
            threat_list: threatList,
          };
        } else {
          const response = await fetch("/api/bkkthreat");
          if (!response.ok) throw new Error("Failed to fetch");
          const data: OrgStatusApi[] = await response.json();
          fetchedData = data.find((o) => o.id === orgId) || null;
        }

        if (fetchedData) {
          const newStats = { critical: 0, high: 0, medium: 0, low: 0 };
          let total = 0;
          
          fetchedData.threat_list.forEach((item) => {
            const normalizedSev = mapScoreToSeverity(item.serverity || "0").toLowerCase();
            const qty = item.quantity || 1;
            if (normalizedSev === "critical") newStats.critical += qty;
            else if (normalizedSev === "high") newStats.high += qty;
            else if (normalizedSev === "medium") newStats.medium += qty;
            else if (normalizedSev === "low") newStats.low += qty;
            total += qty;
          });

          fetchedData.stats = newStats;
          
          // คำนวณ % สำหรับกราฟแท่ง
          if (total > 0) {
            setSeverityPercent({
              c: (newStats.critical / total) * 100,
              h: (newStats.high / total) * 100,
              m: (newStats.medium / total) * 100,
              l: (newStats.low / total) * 100,
            });
          }
        }

        setOrgData(fetchedData);

      } catch (error) {
        console.error("Error fetching org summary:", error);
        setOrgData(null);
      } finally {
        const elapsedTime = Date.now() - startTime;
        const minLoadingTime = 3000; 
        if (elapsedTime < minLoadingTime) {
          await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsedTime));
        }
        setIsLoading(false);
      }
    };

    if (orgId) {
      fetchData();
    }
  }, [orgId]);

  if (isLoading) return <LoadingScreen />;

  if (!orgData) {
    return (
      <div className="flex h-screen w-full bg-black items-center justify-center text-white">
        <div className="text-center animate-enter">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold">Organization Not Found</h2>
          <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-gray-800 rounded-lg hover:bg-gray-700">Go Back</button>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "text-red-500 bg-red-950/30 border-red-500/30";
      case "high": return "text-orange-500 bg-orange-950/30 border-orange-500/30";
      case "medium": return "text-yellow-500 bg-yellow-950/30 border-yellow-500/30";
      case "low": return "text-blue-500 bg-blue-950/30 border-blue-500/30";
      default: return "text-gray-400 bg-gray-900 border-gray-700";
    }
  };

  const totalEvents = orgData.threat_list.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

  return (
    <div className="flex flex-col h-screen w-full bg-black overflow-hidden font-sans text-slate-300">
      
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full p-4 md:p-8 space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-enter delay-100 pb-4 border-b border-gray-800/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-gray-900/80 hover:bg-gray-800 rounded-xl transition-all group border border-gray-700 hover:border-cyan-500/50 backdrop-blur-sm"
            >
              <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-cyan-400" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                  {orgData.name}
                </h1>
                <span className="px-2 py-1 bg-cyan-950/50 text-cyan-400 rounded text-xs font-mono border border-cyan-800">
                  {orgData.short_name.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                System Status: <span className="text-green-400 font-medium">{orgData.status}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-800 text-xs text-gray-400 font-mono flex items-center gap-2">
               <Activity className="w-3 h-3" /> Live Feed
            </div>
            <div className="px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-800 text-xs text-gray-400 font-mono">
               Last Updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          
          <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto scrollbar-hide animate-enter delay-200">
            
            {/* 4 Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="CRITICAL" value={orgData.stats.critical} color="text-red-500" bg="bg-red-950/20" border="border-red-500/20" />
              <StatCard label="HIGH" value={orgData.stats.high} color="text-orange-500" bg="bg-orange-950/20" border="border-orange-500/20" />
              <StatCard label="MEDIUM" value={orgData.stats.medium} color="text-yellow-500" bg="bg-yellow-950/20" border="border-yellow-500/20" />
              <StatCard label="LOW" value={orgData.stats.low} color="text-blue-500" bg="bg-blue-950/20" border="border-blue-500/20" />
            </div>

            {/* Severity Distribution Chart */}
            <div className="bg-gray-900/40 backdrop-blur-md rounded-xl border border-gray-800 p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Severity Breakdown
              </h3>
              
              {/* Visual Bar */}
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden flex mb-4">
                <div style={{ width: `${severityPercent.c}%` }} className="h-full bg-red-500 transition-all duration-1000"></div>
                <div style={{ width: `${severityPercent.h}%` }} className="h-full bg-orange-500 transition-all duration-1000"></div>
                <div style={{ width: `${severityPercent.m}%` }} className="h-full bg-yellow-500 transition-all duration-1000"></div>
                <div style={{ width: `${severityPercent.l}%` }} className="h-full bg-blue-500 transition-all duration-1000"></div>
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div>Critical</span><span>{severityPercent.c.toFixed(1)}%</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div>High</span><span>{severityPercent.h.toFixed(1)}%</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div>Medium</span><span>{severityPercent.m.toFixed(1)}%</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Low</span><span>{severityPercent.l.toFixed(1)}%</span></div>
              </div>
            </div>

            {/* Total Events Box */}
            <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl border border-cyan-500/20 p-6 flex flex-col items-center justify-center text-center">
               <div className="text-sm text-cyan-400 font-mono tracking-wider mb-1">TOTAL EVENTS DETECTED</div>
               <div className="text-5xl font-bold text-white drop-shadow-md">{totalEvents.toLocaleString()}</div>
            </div>

          </div>

          {/* Right Column: Active Threats List (8 Columns) */}
          <div className="lg:col-span-8 bg-gray-900/30 backdrop-blur-sm rounded-2xl border border-gray-800 flex flex-col overflow-hidden animate-enter delay-300">
            
            {/* List Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
                <h2 className="font-semibold text-slate-200">Active Threats Case Log</h2>
              </div>
              <div className="flex gap-2">
                 <button className="p-2 bg-black/40 rounded-lg text-gray-400 hover:text-white border border-transparent hover:border-gray-700 transition-all"><Search size={16}/></button>
                 <button className="p-2 bg-black/40 rounded-lg text-gray-400 hover:text-white border border-transparent hover:border-gray-700 transition-all"><Filter size={16}/></button>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
              {orgData.threat_list.length > 0 ? (
                orgData.threat_list.map((threat, idx) => {
                  const severity = mapScoreToSeverity(threat.serverity || "0");
                  const styleClass = getSeverityColor(severity);

                  return (
                    <div
                      key={idx}
                      onClick={() => navigate(`/threatdetail?id=${threat.incidentID}`)}
                      className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-black/40 hover:bg-gray-800/60 rounded-xl border border-gray-800/50 hover:border-cyan-500/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        {/* Status Icon */}
                        <div className={`w-2 h-12 rounded-full ${styleClass.split(' ')[0].replace('text','bg')}`}></div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styleClass}`}>
                                {severity}
                             </span>
                             <span className="text-xs text-gray-500 font-mono">#{threat.incidentID}</span>
                          </div>
                          <h3 className="font-bold text-gray-200 group-hover:text-white text-lg">{threat.threatName}</h3>
                          <p className="text-sm text-gray-500 line-clamp-1">{threat.threatDetail || "No additional details available."}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 mt-3 md:mt-0 pl-6 md:border-l border-gray-800">
                         <div className="text-right min-w-[80px]">
                           <div className="text-2xl font-bold text-white">{(threat.quantity || 1).toLocaleString()}</div>
                           <div className="text-[10px] text-gray-500 uppercase tracking-wider">Count</div>
                         </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-50">
                   <ShieldAlert size={48} />
                   <p>No active threats found in the registry.</p>
                </div>
              )}
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};

// Enhanced Stat Card
const StatCard = ({ label, value, color, bg, border }: { label: string; value: number; color: string; bg: string; border: string }) => (
  <div className={`relative p-4 rounded-xl border ${border} ${bg} overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}>
    <div className={`text-xs font-bold tracking-widest mb-1 ${color}`}>{label}</div>
    <div className={`text-3xl font-bold text-white`}>{value.toLocaleString()}</div>
    {/* Decorative blur */}
    <div className={`absolute -bottom-4 -right-4 w-16 h-16 ${color.replace('text','bg')} opacity-20 blur-xl rounded-full`}></div>
  </div>
);

export default OrgSummary;