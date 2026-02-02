import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, ShieldAlert, Activity, TrendingUp, 
  Search, Filter, Menu, Bell, Zap, LayoutDashboard, Clock, MoreHorizontal,
  ChevronLeft, ChevronRight, ChevronDown
} from "lucide-react";
import { mapScoreToSeverity } from "../mitreCard/mitreData";
import { LoadingScreen } from "../threatdetail/LoadingScreen";
import { Sidebar } from "../threatdetail/SideBar"; 
import type { SidebarConfig } from "../threatdetail/SideBar"; 

// --- Interfaces ---
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

interface ApiAlertItem {
  threatName?: string;
  threatDetail?: string;
  incidentID?: string;
  serverity?: string;
}

// --- Helper Functions ---
const getSidebarConfig = (id: string | null): SidebarConfig => {
    const defaultMenu = [
        { label: "Dashboard", icon: LayoutDashboard, path: `/orgsum?id=${id || 'rtarf'}` }, 
    ];

    switch (id?.toLowerCase()) {
        case "rtarf": return { title: "กองบัญชาการกองทัพไทย", logo: "/img/rtarf.png", menuItems: defaultMenu };
        case "rta": return { title: "กองทัพบก", logo: "/img/ทบ.png", menuItems: defaultMenu };
        case "rtaf": return { title: "กองทัพอากาศ", logo: "/img/ทอ.png", menuItems: defaultMenu };
        case "rtn": return { title: "กองทัพเรือ", logo: "/img/ทร.png", menuItems: defaultMenu };
        case "rtp": return { title: "สำนักงานตำรวจแห่งชาติ", logo: "/img/ตอ.png", menuItems: defaultMenu }; // แก้ไขเป็น ตอ.png
        default: return { title: "กองบัญชาการกองทัพไทย", logo: "/img/rtarf.png", menuItems: defaultMenu };
    }
};

const TopHeaderMock = ({ title, subtitle, status }: { title: string, subtitle: string, status: string }) => {
    const navigate = useNavigate();
    return (
        <header className="flex-none flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-slate-800 z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-100 tracking-wide">{title}</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                         <span>SYSTEM STATUS: <span className="text-green-400">{status.toUpperCase()}</span></span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                 <button className="p-2 text-slate-400 hover:text-white relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-black"></span>
                </button>
            </div>
        </header>
    );
};

// --- Main Page Component ---
const OrgSummary = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orgId = searchParams.get("id");
    
    // Data States
    const [orgData, setOrgData] = useState<OrgStatusApi | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [severityPercent, setSeverityPercent] = useState({ c: 0, h: 0, m: 0, l: 0 });

    // Table States
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(0); 
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const currentSidebarConfig = getSidebarConfig(orgId);

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
                    fetchedData = {
                        id: "rtarf",
                        name: "กองบัญชาการกองทัพไทย",
                        short_name: "RTARF",
                        status: "Normal",
                        message: "System Operational",
                        stats: { critical: 0, high: 0, medium: 0, low: 0 },
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
                console.error("Error", error);
                setOrgData(null);
            } finally {
                const elapsedTime = Date.now() - startTime;
                if (elapsedTime < 1500) await new Promise(r => setTimeout(r, 1500 - elapsedTime));
                setIsLoading(false);
            }
        };
        if (orgId) fetchData();
    }, [orgId]);

    // Search & Pagination Logic
    const filteredThreats = orgData?.threat_list.filter((threat) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            threat.threatName.toLowerCase().includes(searchLower) ||
            threat.threatDetail.toLowerCase().includes(searchLower) ||
            threat.incidentID.toLowerCase().includes(searchLower)
        );
    }) || [];

    const totalCount = filteredThreats.length;
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentData = filteredThreats.slice(startIndex, endIndex);

    const handleChangePage = (newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const statsForUI = orgData ? [
        { label: "CRITICAL", count: orgData.stats.critical, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
        { label: "HIGH", count: orgData.stats.high, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
        { label: "MEDIUM", count: orgData.stats.medium, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
        { label: "LOW", count: orgData.stats.low, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    ] : [];

    const getSeverityColor = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case "critical": return "text-red-500 bg-red-950/40 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]";
            case "high": return "text-orange-500 bg-orange-950/40 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]";
            case "medium": return "text-yellow-500 bg-yellow-950/40 border-yellow-500/30";
            case "low": return "text-blue-500 bg-blue-950/40 border-blue-500/30";
            default: return "text-gray-400 bg-gray-900 border-gray-700";
        }
    };

    if (isLoading) return <LoadingScreen />;
    if (!orgData) return <div className="bg-black h-screen flex items-center justify-center text-white">Organization not found</div>;

    const totalEvents = orgData.threat_list.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

    return (
        <div className="flex flex-col md:flex-row h-screen w-screen bg-black overflow-hidden font-sans text-slate-300">
            
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                config={currentSidebarConfig}
            />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full bg-[#050505]">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>

                <div className="md:hidden flex-none flex items-center justify-between p-4 bg-slate-950/80 border-b border-slate-900 backdrop-blur-md z-30">
                    <div className="flex items-center space-x-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-1 rounded-md text-slate-400 hover:text-white">
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-blue-400 tracking-wider">ORG SUMMARY</span>
                    </div>
                </div>

                <TopHeaderMock title={orgData.name} subtitle={orgData.short_name.toUpperCase()} status={orgData.status} />

                <div className="flex-1 flex flex-col p-4 md:p-6 space-y-4 overflow-hidden">
                    
                    {/* ส่วนบน: Stats */}
                    <div className="flex-none grid grid-cols-1 xl:grid-cols-5 gap-4">
                        <div className="xl:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {statsForUI.map((stat, idx) => (
                                <div key={idx} className={`relative overflow-hidden p-4 rounded-xl border ${stat.border} ${stat.bg} backdrop-blur-sm flex flex-col items-center justify-center gap-1 group`}>
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${stat.color.replace('text', 'bg')}`}></div>
                                    <span className={`text-xs font-bold tracking-widest ${stat.color}`}>{stat.label}</span>
                                    <span className="text-4xl font-bold text-white drop-shadow-lg">{stat.count.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="xl:col-span-1 bg-[#0f0f12] border border-slate-800 rounded-xl p-4 flex flex-col justify-center items-center relative overflow-hidden shadow-lg hidden xl:flex">
                             <div className="absolute inset-x-0 bottom-0 h-1 flex">
                                <div style={{ width: `${severityPercent.c}%` }} className="bg-red-500 h-full" />
                                <div style={{ width: `${severityPercent.h}%` }} className="bg-orange-500 h-full" />
                                <div style={{ width: `${severityPercent.m}%` }} className="bg-yellow-500 h-full" />
                                <div style={{ width: `${severityPercent.l}%` }} className="bg-blue-500 h-full" />
                             </div>
                             <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Total Incidents</div>
                             <div className="text-3xl font-bold text-white flex items-center gap-2">
                                <Activity className="text-cyan-500" size={20} />
                                {totalEvents.toLocaleString()}
                             </div>
                        </div>
                    </div>

                    {/* --- ส่วนล่าง: ตารางและกราฟ --- */}
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        <div className="lg:col-span-8 flex flex-col h-full gap-4">
                            
                            {/* Toolbar */}
                            <div className="flex-none flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide">
                                    <ShieldAlert className="text-cyan-400" size={24} />
                                    Active Threats Case Log
                                </h3>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <div className="flex items-center bg-slate-900/80 border border-slate-700/50 rounded-lg px-3 py-1.5 w-full md:w-64 focus-within:border-cyan-500/50 transition-all">
                                        <Search size={14} className="text-slate-400 mr-2" />
                                        <input 
                                            type="text" 
                                            placeholder="Search cases..." 
                                            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-500"
                                            value={searchTerm}
                                            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                                        />
                                    </div>
                                    <button className="p-1.5 bg-slate-900 text-slate-400 rounded-lg hover:text-white border border-slate-700/50 transition-colors"><Filter size={18}/></button>
                                </div>
                            </div>
                            
                            {/* --- TABLE CARD --- */}
                            <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0c] border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl relative">
                                
                                <div className="flex-none grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/30 text-xs font-mono text-slate-400 uppercase tracking-wider">
                                    <div className="col-span-1">Status</div>
                                    <div className="col-span-2">Incident ID</div>
                                    <div className="col-span-6">Threat Description</div>
                                    <div className="col-span-2">Detected At</div>
                                    <div className="col-span-1 text-right">Action</div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scroll relative">
                                    {currentData.length > 0 ? (
                                        <div className="divide-y divide-slate-800/50">
                                            {currentData.map((threat, idx) => {
                                                const severity = mapScoreToSeverity(threat.serverity || "0");
                                                const styleClass = getSeverityColor(severity);
                                                return (
                                                    <div key={idx} 
                                                        onClick={() => navigate(`/threatdetail?id=${threat.incidentID}`)}
                                                        className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-900/40 transition-colors cursor-pointer group items-center"
                                                    >
                                                        <div className="col-span-1">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${styleClass} whitespace-nowrap`}>
                                                                {severity}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-2 font-mono text-cyan-400/80 text-sm group-hover:text-cyan-300 transition-colors">
                                                            #{threat.incidentID}
                                                        </div>
                                                        <div className="col-span-6 pr-4">
                                                            <h4 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors mb-0.5 truncate">{threat.threatName}</h4>
                                                            <p className="text-[11px] text-slate-500 line-clamp-1 group-hover:text-slate-400">{threat.threatDetail || "Suspicious activity detected via sensor node."}</p>
                                                        </div>
                                                        <div className="col-span-2 text-xs text-slate-500 flex items-center gap-1.5">
                                                            <Clock size={12} />
                                                            <span>{new Date().toLocaleTimeString()}</span>
                                                        </div>
                                                        <div className="col-span-1 text-right">
                                                            <button className="p-1.5 hover:bg-slate-800 rounded-full text-slate-500 hover:text-cyan-400 transition-colors">
                                                                <MoreHorizontal size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 absolute inset-0">
                                            <Search size={48} className="mb-4" />
                                            <p>No results found</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-none px-6 py-2 bg-[#0a0a0c] border-t border-slate-800 text-xs text-slate-400 flex flex-col md:flex-row justify-end items-center gap-4 z-10">
                                    <div className="flex items-center gap-2">
                                        <span>Rows per page:</span>
                                        <div className="relative">
                                            <select 
                                                value={rowsPerPage} 
                                                onChange={handleChangeRowsPerPage}
                                                className="appearance-none bg-slate-900 border border-slate-700 rounded px-2 py-1 pr-6 focus:outline-none focus:border-cyan-500 cursor-pointer text-slate-300"
                                            >
                                                <option value={25}>25</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                                <option value={200}>200</option> 
                                            </select>
                                            <ChevronDown size={14} className="absolute right-1.5 top-1.5 pointer-events-none text-slate-500" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span>
                                            {totalCount > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, totalCount)} of {totalCount}
                                        </span>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => handleChangePage(page - 1)} 
                                                disabled={page === 0}
                                                className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleChangePage(page + 1)} 
                                                disabled={endIndex >= totalCount}
                                                className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- RIGHT: STATS AREA --- */}
                        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scroll pr-1 pb-4">
                            
                            <div className="bg-[#0f0f12] border border-slate-800 rounded-2xl p-5 shadow-lg">
                                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                    <TrendingUp size={16} className="text-blue-500" /> Severity Analysis
                                </h3>
                                <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-900 mb-6 shadow-inner">
                                    <div style={{ width: `${severityPercent.c}%` }} className="bg-red-500 h-full" />
                                    <div style={{ width: `${severityPercent.h}%` }} className="bg-orange-500 h-full" />
                                    <div style={{ width: `${severityPercent.m}%` }} className="bg-yellow-500 h-full" />
                                    <div style={{ width: `${severityPercent.l}%` }} className="bg-blue-500 h-full" />
                                </div>
                                <div className="space-y-3">
                                    {[{ label: "Critical", count: orgData.stats.critical, color: "bg-red-500" }, { label: "High", count: orgData.stats.high, color: "bg-orange-500" }, { label: "Medium", count: orgData.stats.medium, color: "bg-yellow-500" }, { label: "Low", count: orgData.stats.low, color: "bg-blue-500" }].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/30 border border-slate-800/50">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                                                <span className="text-sm text-slate-300 font-medium">{item.label}</span>
                                            </div>
                                            <span className="text-base font-bold text-white">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative overflow-hidden rounded-2xl p-6 text-center group border border-blue-500/20 bg-gradient-to-b from-blue-900/10 to-slate-900/40">
                                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors duration-500"></div>
                                <div className="relative z-10">
                                    <Activity className="mx-auto text-blue-400 mb-2 opacity-80" size={28} />
                                    <div className="text-4xl font-bold text-white mb-1 tracking-tight">
                                        {orgData.threat_list.reduce((acc, curr) => acc + (curr.quantity || 1), 0).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] font-mono text-blue-300/60 uppercase tracking-widest">Total Events Detected</div>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default OrgSummary;