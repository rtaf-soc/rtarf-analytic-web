// =========================================
// 1. Common Types
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown' | 'none';

// 2. Mitre Framework Definitions (Static Data)
export interface MitreTacticFramework {
  id: string;
  name: string;
  description: string;
  shortName: string;
}

export interface MitreTechniqueFramework {
  id: string;
  name: string;
  description: string;
  tactics: string[];
  platforms: string[];
  dataSources: string[];
  detection: string;
  eventIds: number[];
}

// 3. Stats & Analysis Types (Dynamic Data)

// สำหรับแสดงใน Matrix Grid (Technique Card)
export interface TechniqueStatsFramework {
  count: number;
  severity: SeverityLevel;
  lastSeen: string | null;
}

// *** เพิ่ม: สำหรับหน้า Analytics (Summary View) ***
export interface SummaryStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  tactics: Array<{
    id: string;           // Tactic ID e.g., TA0001
    name: string;         // Tactic Name e.g., Initial Access
    count: number;        // Sum of detections
    sources: Record<string, number>; // Breakdown by source (optional)
  }>;
  sources: Record<string, number>; // Total breakdown by source
}

// 4. API Responses (Backend Data Structure)

// Response ใหม่จาก API (/api/mitrestats)
export interface MitreStatsResponse {
  totalEvent: number;
  totalTechnique: number;
  // ข้อมูลดิบสำหรับทำตาราง หรือกราฟแยกย่อย
  tacticSummary: Array<{
    tacticName: string;
    tacticId: string;
    techniqueName: string;
    techniqueId: string;
    severityName: string;
    quantity: number;
    lastSeen: string | null;
  }>;
  // สรุปยอดตาม Severity (Event Based)
  severitySummary: Array<{
    severityName: string;
    quantity: number;
  }>;
  // สรุปยอดตาม Severity (Calculated / Risk Based)
  calculatedSeveritySummary: Array<{
    severityName: string;
    quantity: number;
  }>;
  // ข้อมูลสำหรับลงใน Matrix (Technique ID -> Count)
  tacticTechniqueSummary: Array<{
    tacticName: string;
    tacticId: string;
    techniqueName: string;
    techniqueId: string;
    severityName: string;
    quantity: number;
    lastSeen: string | null;
  }>;
}

// ==========================================
// 5. Legacy / Elasticsearch Specific Types
// (เก็บไว้เพื่อ compatibility กับส่วนอื่นของโปรเจกต์)
// ==========================================

export interface MitreTechnique {
  id: string;
  technique_id: string;
  technique_name: string;
  tactic: string;
  description: string;
  severity: SeverityLevel;
  timestamp: string;
  source?: string;
  platform?: string[];
  
  // Windows Event Log specific fields
  event?: {
    event_code?: string,
  };
  host?: {
    host_name?: string,
  }

  host_name?: string;
  user_name?: string;
  process_name?: string;
  log_level?: string;
  channel?: string;
  
  // Allow additional fields from Elasticsearch
  [key: string]: any;
}

export interface FilterState {
  search: string;
  tactic: string;
  severity: string;
}

export interface ElasticsearchResponse {
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Array<{
      sort: any[] | undefined;
      _id: string;
      _source: any;
      _score?: number;
    }>;
  };
}

export interface StatsCardProps {
  title: string;
  value: number;
  icon: any;
  color: string;
}

export interface MitreStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  tactics: number;
}

export interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { esUrl: string; esIndex: string }) => void;
  currentConfig: {
    esUrl: string;
    esIndex: string;
  };
}

export interface MitreApiResponse {
  total: number;
  events: MitreTechnique[];
  page: number;
  size: number;
}

export interface FilterStateFramework {
  search: string;
  severity: string;
}