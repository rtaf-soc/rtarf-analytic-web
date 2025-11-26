import { useState, useEffect, useCallback } from "react";
import { loadMitreData } from "../../src/components/mitreCard/mitreData"; // ตรวจสอบ path ว่าถูกต้อง
import type { 
  MitreTacticFramework, 
  MitreTechniqueFramework,
  TechniqueStatsFramework,
  MitreStatsResponse,
  SummaryStats
} from "../../src//types/mitre";

// Type สำหรับเก็บ state ของกราฟ Matrix (Key = Technique ID)
export type FlattenedTechniqueStats = Record<string, TechniqueStatsFramework>;

interface UseMitreDataProps {
  dateRange: { start: string; end: string };
}

export const useMitreData = ({ dateRange }: UseMitreDataProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data Definitions (Static)
  const [tactics, setTactics] = useState<MitreTacticFramework[]>([]);
  const [techniques, setTechniques] = useState<MitreTechniqueFramework[]>([]);
  
  // Dynamic Stats (จาก API)
  const [techniqueStats, setTechniqueStats] = useState<FlattenedTechniqueStats>({});
  
  const [calculatedStats, setCalculatedStats] = useState({
    total: 0, critical: 0, high: 0, medium: 0, low: 0, tactics: 0,
  });
  
  const [eventStats, setEventStats] = useState({
    total: 0, critical: 0, high: 0, medium: 0, low: 0, tactics: 0,
  });

  // *** State สำคัญสำหรับหน้า Analytics ***
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);

  const getDaysInRange = useCallback(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [dateRange]);

  // 1. โหลดข้อมูล Static ของ MITRE (Tactic/Technique Definitions)
  useEffect(() => {
    const loadDefinitions = async () => {
      try {
        const { tactics: t, techniques: tech } = await loadMitreData();
        setTactics(t);
        setTechniques(tech);
      } catch (error) {
        console.error("Error loading MITRE definitions:", error);
      }
    };
    loadDefinitions();
  }, []);

  // 2. ฟังก์ชันยิง API (POST /api/mitrestats)
  const fetchData = useCallback(async (isRefresh = false) => {
    // ต้องรอให้ loadDefinitions เสร็จก่อนถึงจะยิง API ได้ (กันพลาด)
    if (techniques.length === 0) return;
    
    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const requestBody = {
        FromDate: `${dateRange.start}T00:00:00Z`,
        ToDate: `${dateRange.end}T23:59:59Z`
      };

      const response = await fetch('/api/mitrestats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('API Error');

      const data: MitreStatsResponse = await response.json();

      // --- Mapping Data ---

      // A. Map เข้า Matrix (TechniqueStats)
      const newTechniqueStats: FlattenedTechniqueStats = {};
      data.tacticTechniqueSummary.forEach((item) => {
        if (!item.techniqueId) return;
        newTechniqueStats[item.techniqueId] = {
          count: item.quantity,
          severity: (item.severityName?.toLowerCase() as any) || "none",
          lastSeen: item.lastSeen,
        };
      });
      setTechniqueStats(newTechniqueStats);

      // Helper Map for Severity
      const sevMap = data.severitySummary.reduce((acc: any, item) => {
        acc[item.severityName.toLowerCase()] = item.quantity;
        return acc;
      }, {});

      // B. Map Event Stats (Severity Summary)
      setEventStats({
        total: data.totalEvent,
        critical: sevMap["critical"] || 0,
        high: sevMap["high"] || 0,
        medium: sevMap["medium"] || 0,
        low: sevMap["low"] || 0,
        tactics: data.tacticSummary.length,
      });

      // C. Map Calculated Stats
      const calcMap = data.calculatedSeveritySummary.reduce((acc: any, item) => {
        acc[item.severityName.toLowerCase()] = item.quantity;
        return acc;
      }, {});
      setCalculatedStats({
        total: data.totalEvent,
        critical: calcMap["critical"] || 0,
        high: calcMap["high"] || 0,
        medium: calcMap["medium"] || 0,
        low: calcMap["low"] || 0,
        tactics: data.totalTechnique,
      });

      // --- D. Map Summary Stats (ส่วนที่เพิ่มใหม่เพื่อให้หน้า Analytics ทำงาน) ---
      
      // 1. แปลง Tactic Summary ให้เป็น Format ที่กราฟต้องการ
      const tacticsData = data.tacticSummary.map(t => {
        // หาข้อมูล Tactic ตัวเต็มจาก Static Data เพื่อเอาชื่อสวยๆ
        const tacticDef = tactics.find(
          staticT => staticT.name.toLowerCase() === t.tacticName?.toLowerCase() 
                  || staticT.id === t.tacticId
        );
        
        return {
          id: t.tacticId || tacticDef?.id || "Unknown",
          name: t.tacticName || tacticDef?.name || "Unknown Tactic",
          count: t.quantity,
          sources: {} // API ยังไม่มี breakdown source ราย tactic ให้ใส่ว่างไว้
        };
      }).sort((a, b) => b.count - a.count); // เรียงจากมากไปน้อย

      // 2. สร้าง Object SummaryStats
      const newSummaryStats: SummaryStats = {
        total: data.totalEvent,
        critical: sevMap["critical"] || 0,
        high: sevMap["high"] || 0,
        medium: sevMap["medium"] || 0,
        low: sevMap["low"] || 0,
        tactics: tacticsData,
        // Mock Source รวม (เนื่องจาก API ชุดนี้ยังไม่ส่ง Sources มา)
        sources: { "Elasticsearch / API": data.totalEvent } 
      };

      setSummaryStats(newSummaryStats);

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [techniques, tactics, dateRange]); // เพิ่ม tactics ใน dependency

  // ยิง API เมื่อ dateRange หรือ techniques เปลี่ยน
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    refreshing,
    tactics,
    techniques,
    techniqueStats,
    calculatedStats,
    eventStats,
    summaryStats, // ส่งค่าออกไปให้หน้า UI
    refresh: () => fetchData(true),
    getDaysInRange
  };
};