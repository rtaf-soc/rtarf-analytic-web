// src/hooks/useMitreData.ts
import { useState, useEffect, useCallback } from "react";
// ปรับ Path ให้ถูกต้อง (ถอย 1 step จาก hooks ไปหา components และ types)
import { loadMitreData } from "../components/mitreCard/mitreData";
import type { 
  MitreTacticFramework, 
  MitreTechniqueFramework,
  TechniqueStatsFramework,
  MitreStatsResponse,
  SummaryStats
} from "../types/mitre";

// Type สำหรับเก็บ state ของกราฟ Matrix (Key = Technique ID)
export type FlattenedTechniqueStats = Record<string, TechniqueStatsFramework>;

interface UseMitreDataProps {
  dateRange: { start: string; end: string };
}

export const useMitreData = ({ dateRange }: UseMitreDataProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 1. Data Definitions (Static - โหลดครั้งเดียว)
  const [tactics, setTactics] = useState<MitreTacticFramework[]>([]);
  const [techniques, setTechniques] = useState<MitreTechniqueFramework[]>([]);
  
  // 2. Dynamic Stats (จาก API)
  const [techniqueStats, setTechniqueStats] = useState<FlattenedTechniqueStats>({});
  
  const [calculatedStats, setCalculatedStats] = useState({
    total: 0, critical: 0, high: 0, medium: 0, low: 0, tactics: 0,
  });
  
  const [eventStats, setEventStats] = useState({
    total: 0, critical: 0, high: 0, medium: 0, low: 0, tactics: 0,
  });

  // *** State สำคัญสำหรับหน้า Analytics ***
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);

  // Helper: คำนวณจำนวนวันสำหรับแสดงผล UI
  const getDaysInRange = useCallback(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  }, [dateRange]);

  // Load Static Data (Tactics/Techniques)
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

  // Main Function: ยิง API (POST /api/mitrestats)
  const fetchData = useCallback(async (isRefresh = false) => {
    // ต้องรอให้ techniques โหลดเสร็จก่อนถึงจะ map ข้อมูลได้ถูกต้อง
    if (techniques.length === 0) return;
    
    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      // ✅ Smart Date Logic:
      // ถ้า dateRange มีเวลาติดมา (T...) ให้ใช้เวลานั้นเลย (Rolling Window)
      // ถ้าไม่มี (เลือกจากปฏิทิน) ให้เติม 00:00 - 23:59
      const formatTimestamp = (dateStr: string, isEndOfDay: boolean) => {
        if (dateStr.includes('T')) return dateStr;
        return isEndOfDay ? `${dateStr}T23:59:59Z` : `${dateStr}T00:00:00Z`;
      };

      const requestBody = {
        FromDate: formatTimestamp(dateRange.start, false),
        ToDate: formatTimestamp(dateRange.end, true)
      };

      const response = await fetch('/api/mitrestats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('API Error');

      const data: MitreStatsResponse = await response.json();

      // --- MAPPING DATA ---

      // A. Map Matrix Stats (Technique Cards)
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

      // Helper for Severity Counts
      const sevMap = data.severitySummary.reduce((acc: any, item) => {
        acc[item.severityName.toLowerCase()] = item.quantity;
        return acc;
      }, {});

      // B. Map Event Stats (Overview Cards)
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

      // D. Map Summary Stats (สำหรับหน้า Analytics)
      const tacticsData = data.tacticSummary.map(t => {
        // พยายามหาชื่อ Tactic ที่ถูกต้องจาก Static Data
        const tacticDef = tactics.find(
          staticT => staticT.name.toLowerCase() === t.tacticName?.toLowerCase() 
                  || staticT.id === t.tacticId
        );
        
        return {
          id: t.tacticId || tacticDef?.id || "Unknown",
          name: t.tacticName || tacticDef?.name || "Unknown Tactic",
          count: t.quantity,
          sources: {} // API ปัจจุบันยังไม่มี breakdown source ราย tactic
        };
      }).sort((a, b) => b.count - a.count); // เรียงจากมากไปน้อย

      setSummaryStats({
        total: data.totalEvent,
        critical: sevMap["critical"] || 0,
        high: sevMap["high"] || 0,
        medium: sevMap["medium"] || 0,
        low: sevMap["low"] || 0,
        tactics: tacticsData,
        sources: { "Elasticsearch / API": data.totalEvent } 
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [techniques, tactics, dateRange]);

  // Trigger fetch when dependencies change
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