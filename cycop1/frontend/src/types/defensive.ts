// types/defensive.ts

// ==============================
// Alert Base
// ==============================

export interface AlertBase {
  id?: number;
  event_id: string;
  alert_name?: string;
  description?: string;
  severity?: string;
  source?: string;
  incident_id?: string;
  status?: string;
  source_ip?: string;
  destination_ip?: string;
  affected_node_id?: string;
  timestamp: string;
}

// ==============================
// Node (node_positions / nodes API)
// ==============================

export interface NodeGet {
  id: number;
  name: string;
  description?: string | null;
  node_type: string;
  latitude: number;
  longitude: number;
  ip_address?: string | null;
  additional_ips?: string[] | null;
  network_metadata?: Record<string, any> | null;
  map_scope: string;   // global / bangkok
  created_at: string;
  updated_at: string;
}

// ==============================
// Node Bangkok (node_positionsBK)
// ใช้โครงสร้างเดียวกับ NodeGet
// ==============================

export type NodeGetBangkok = NodeGet;
