import React, { useState, useMemo } from "react";
import {
  Shield,
  Search,
  RefreshCw,
  Calendar,
  Grid3x3,
  BarChart3,
  TrendingUp,
} from "lucide-react";

// Components
import TechniqueCard from "../../components/mitreCard/TechniqueCard";
import TechniqueModal from "../../components/mitreCard/TechniqueModal";
import SummaryView from "../../components/mitreCard/SummaryView";
import CoveragedashboardStat from "../killchain"; // ตรวจสอบ path ว่าถูกต้อง
import { getSeverityColor } from "../../components/mitreCard/mitreData";

// Hook & Types
import { useMitreData } from "../../hooks/useMitreData"; // <-- Import Hook ที่เราเพิ่งทำ
import type { MitreTechniqueFramework } from "../../types/mitre";

// Helper Component: StatCard (เพื่อลด code ซ้ำในหน้าหลัก)
const StatCard = ({ title, value, colorClass = "text-white" }: { title: string, value: string | number, colorClass?: string }) => (
  <div className="bg-gray-900 rounded p-3">
    <div className="text-gray-400 text-xs mb-1">{title}</div>
    <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
  </div>
);

const MitreAttackNavigator: React.FC = () => {
  // --- 1. UI State (เก็บเฉพาะ State ที่เกี่ยวกับหน้าจอ) ---
  const [selectedTechnique, setSelectedTechnique] = useState<MitreTechniqueFramework | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"matrix" | "summary" | "kill chain">("matrix");
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Date Range State
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // --- 2. Call Custom Hook (หัวใจหลักที่เปลี่ยนไป) ---
  // ดึงข้อมูลทั้งหมดผ่าน Hook ตัวเดียว ไม่ต้อง fetch เองในหน้านี้แล้ว
  const {
    loading,
    refreshing,
    refresh,
    tactics,
    techniques,
    techniqueStats,
    calculatedStats,
    eventStats,
    summaryStats,
    getDaysInRange
  } = useMitreData({ dateRange });

  // --- 3. Filtering Logic (Client-Side) ---
  // API ใหม่ Filter แค่วันที่ ดังนั้นเราต้องมา Filter Search/Severity ที่หน้าบ้านผ่าน useMemo
  const filteredTechniques = useMemo(() => {
    return techniques.filter((tech) => {
      // Filter by Search Term
      const matchesSearch =
        tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tech.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by Severity
      const stats = techniqueStats[tech.id];
      const matchesSeverity =
        severityFilter === "all" ||
        stats?.severity === severityFilter ||
        (severityFilter === "detected" && (stats?.count || 0) > 0);

      return matchesSearch && matchesSeverity;
    });
  }, [techniques, searchTerm, severityFilter, techniqueStats]);

  // --- 4. Helper Functions ---
  
  const isParentTechnique = (id: string) => !id.includes(".");

  const getTechniquesForTactic = (tacticShortName: string) => {
    // หา Techniques ที่อยู่ใน Tactic นั้นๆ และผ่าน Filter ด้านบนแล้ว
    return filteredTechniques
      .filter((t) => t.tactics.some((tn) => tn.toLowerCase() === tacticShortName.toLowerCase()))
      .filter((t) => isParentTechnique(t.id));
  };

  const getSubTechniques = (parentId: string) => {
    // หา Sub-techniques (ถ้า API รองรับ subTechnique stats ก็จะแสดงตรงนี้)
    // หมายเหตุ: โค้ดนี้รองรับไว้เผื่อ API ส่ง subTechniques มา ถ้าไม่มีจะ return ว่าง
    const parentStats = techniqueStats[parentId];
    // *ถ้า Data structure ของ techniqueStats เปลี่ยน อาจต้องแก้ตรงนี้* // แต่เบื้องต้น API ใหม่ส่งมาเป็น Flatten List ดังนั้นเราอาจต้อง Mapping เองถ้าต้องการ Sub-technique
    // สำหรับตอนนี้ให้ return ว่างไปก่อน หรือเขียน logic map จาก techniques array ได้
    return []; 
  };

  // แก้ไขการนับจำนวน: ให้นับเฉพาะ "Parent ID" ที่ไม่ซ้ำกัน
  const detectedCount = useMemo(() => {
    const activeParentIds = new Set<string>();

    // วนลูปตรวจสอบทุกเทคนิคที่มีข้อมูล Stats
    Object.entries(techniqueStats).forEach(([id, stat]) => {
      if (stat.count > 0) {
        const parentId = id.split('.')[0];
        const isValidParent = techniques.some(t => t.id === parentId);
        
        if (isValidParent) {
          activeParentIds.add(parentId);
        }
      }
    });

    return activeParentIds.size;
  }, [techniqueStats, techniques]);

  // --- 5. Date Handlers ---
  const handleDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
    setShowDatePicker(false);
  };

  // --- 6. Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-3"></div>
          <p className="text-white">Loading MITRE ATT&CK Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-[1600px] mx-auto space-y-4">
        
        {/* === HEADER SECTION === */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  MITRE ATT&CK Navigator
                </h1>
                <p className="text-gray-400 text-xs">
                  {techniques.filter((t) => isParentTechnique(t.id)).length} Parent Techniques
                </p>
              </div>
            </div>

            {/* Controls Right Side */}
            <div className="flex gap-2">
              {/* Date Picker Button */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  {getDaysInRange()}d
                </button>

                {showDatePicker && (
                  <div className="absolute right-0 mt-2 bg-gray-700 rounded-lg shadow-xl p-4 z-50 w-64 border border-gray-600">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[1, 7, 30, 90].map((d) => (
                        <button
                          key={d}
                          onClick={() => handleDatePreset(d)}
                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500"
                        >
                          Last {d}d
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600"
                      />
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-600"
                      />
                      <button
                        onClick={() => { refresh(); setShowDatePicker(false); }}
                        className="w-full bg-red-600 text-white text-xs py-1.5 rounded hover:bg-red-700"
                      >
                        Apply & Refresh
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={refresh}
                disabled={refreshing}
                className="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-700">
            {[
              { id: "matrix", icon: Grid3x3, label: "Matrix View" },
              { id: "summary", icon: BarChart3, label: "Analytics" },
              { id: "kill chain", icon: TrendingUp, label: "Kill Chain" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === tab.id
                    ? "text-white border-b-2 border-red-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Stats Cards */}
          {(viewMode === "matrix" || viewMode === "summary") && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <StatCard title={`Total Events (${getDaysInRange()} Days)`} value={calculatedStats.total.toLocaleString()} />
              <StatCard title="Data Source" value="PostgreSQL" />
              <StatCard title="Techniques Detected" value={`${detectedCount} / ${techniques.length}`} />
            </div>
            
          )}

          {/* Matrix Controls & Specific Stats */}
          {viewMode === "matrix" && (
            <>
              {/* Event Severity Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <StatCard title="Critical Severity (Event)" value={eventStats.critical.toLocaleString()} />
                <StatCard title="High Severity (Event)" value={eventStats.high.toLocaleString()} />
                <StatCard title="Medium Severity (Event)" value={eventStats.medium.toLocaleString()} />
                <StatCard title="Low Severity (Event)" value={eventStats.low.toLocaleString()} />
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <StatCard title="Critical Severity (Calculated)" value={calculatedStats.critical.toLocaleString()} />
                <StatCard title="High Severity (Calculated)" value={calculatedStats.high.toLocaleString()} />
                <StatCard title="Medium Severity (Calculated)" value={calculatedStats.medium.toLocaleString()} />
                <StatCard title="Low Severity (Calculated)" value={calculatedStats.low.toLocaleString()} />
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search techniques (e.g., T1592)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="all">All Severity</option>
                  <option value="detected">Detected Only</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs mb-2">
                <span className="text-gray-400">Legend:</span>
                {["critical", "high", "medium", "low", "none"].map((sev) => (
                  <div key={sev} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${getSeverityColor(sev)}`}></div>
                    <span className="text-gray-300 capitalize">{sev}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* === CONTENT VIEW === */}

        {/* 1. Matrix Grid View */}
        {viewMode === "matrix" && (
          <div className="bg-gray-800 rounded-lg shadow-xl p-3 overflow-x-auto">
            <div className="min-w-[1600px]">
              {/* Grid Header (Tactics) */}
              <div
                className="gap-1.5 mb-1.5"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${tactics.length}, minmax(0, 1fr))`,
                }}
              >
                {tactics.map((tactic) => {
                  const techList = getTechniquesForTactic(tactic.shortName);
                  // Count detected in this column
                  const detected = techList.filter(t => (techniqueStats[t.id]?.count || 0) > 0).length;

                  return (
                    <div
                      key={tactic.id}
                      className="bg-red-600 rounded-t p-2 text-center"
                      title={`${tactic.description}`}
                    >
                      <div className="text-white font-bold text-[10px] leading-tight mb-1">
                        {tactic.name}
                      </div>
                      <div className="text-white text-[9px] opacity-90">
                        {detected}/{techList.length}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid Body (Techniques) */}
              <div
                className="gap-1.5"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${tactics.length}, minmax(0, 1fr))`,
                }}
              >
                {tactics.map((tactic) => (
                  <div key={tactic.id} className="space-y-1.5">
                    {getTechniquesForTactic(tactic.shortName).map((tech) => (
                      <TechniqueCard
                        key={tech.id}
                        technique={tech}
                        stats={
                          techniqueStats[tech.id] || {
                            count: 0,
                            severity: "none",
                            lastSeen: null,
                          }
                        }
                        isSelected={selectedTechnique?.id === tech.id}
                        onClick={() => setSelectedTechnique(tech)}
                        subTechniques={getSubTechniques(tech.id)} // รอ Implement ถ้ามี sub-tech
                        onSubTechniqueClick={(sub) => setSelectedTechnique(sub)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. Summary View */}
        {viewMode === "summary" && summaryStats && (
          <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            {/* Note: SummaryView อาจจะต้องปรับ Prop ให้รับ calculatedStats แทน 
                ถ้า SummaryView เดิมรับ structure ที่ต่างจากนี้อาจต้องแก้ Component นั้นด้วย
                ตอนนี้ส่งไปแบบ any หรือ structure ที่ใกล้เคียง
            */}
             <SummaryView
                stats={summaryStats} // Cast เพื่อให้ใช้งานได้ชั่วคราว
                loading={refreshing}
                dayRange={getDaysInRange()}
              />
          </div>
        )}

        {/* 3. Kill Chain View */}
        {viewMode === "kill chain" && (
          <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <CoveragedashboardStat
              selectedIndices="rtarf-events-beat-*"
              dayRange={getDaysInRange()}
            />
          </div>
        )}
      </div>

      {/* Modal Details */}
      {selectedTechnique && (
        <TechniqueModal
          technique={selectedTechnique}
          stats={
            techniqueStats[selectedTechnique.id] || {
              count: 0,
              severity: "none",
              lastSeen: null,
            }
          }
          tactics={tactics}
          onClose={() => setSelectedTechnique(null)}
        />
      )}
    </div>
  );
};

export default MitreAttackNavigator;