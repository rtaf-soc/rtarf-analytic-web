// hooks/useMitreData.ts
import { useState, useEffect, useCallback } from "react";
import { loadMitreData } from "../../../frontend/src/components/mitreCard/mitreData";
import type { 
  MitreTacticFramework, 
  MitreTechniqueFramework,
  TechniqueStatsFramework,
  MitreStatsResponse // Import Type ที่เพิ่งแก้ไป
} from "../../../frontend/src/types/mitre";

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
  // --- เพิ่ม State นี้สำหรับหน้า Analytics โดยเฉพาะ ---
  const [summaryStats, setSummaryStats] = useState<any>(null);

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

      // B. Map Event Stats (Severity Summary)
      const sevMap = data.severitySummary.reduce((acc: any, item) => {
        acc[item.severityName.toLowerCase()] = item.quantity;
        return acc;
      }, {});
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

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [techniques, dateRange]);

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
    summaryStats,
    refresh: () => fetchData(true),
    getDaysInRange
  };
};