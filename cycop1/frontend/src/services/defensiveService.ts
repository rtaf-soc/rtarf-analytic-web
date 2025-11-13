// services/postgresService.ts
import axios from "axios";
import type { AlertBase, NodeGet } from "../types/defensive";

const POSTGRES_API_URL =
  import.meta.env.VITE_POSTGRES_API_URL || "http://localhost:8000";

// ==============================
// Rtarf Services
// ==============================

export interface RtarfAverageSeverityPayload {
  average_severity_level: number,
  danger_level: string,
  total_events: number,
  events_with_severity: number,
  raw_average: number
}

export interface RtarfSeverityStatistics {
  total_events: number,
  severity_distribution: {
    critical: number,
    high: number,
    medium: number,
    low: number,
    unknown: number
  },
  percentages: {
    critical: number,
    high: number,
    medium: number,
    low: number,
    unknown: number
  }
}

export async function fetchRtarfAverageSummary(): Promise<RtarfAverageSeverityPayload> {
  try {
    const response = await axios.get<RtarfAverageSeverityPayload>(
      `${POSTGRES_API_URL}/rtarf-events/severity/average`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Rtarf average summary from PostgreSQL:", error);
    return {
      average_severity_level: 0,
      danger_level: "Unknown",
      total_events: 0,
      events_with_severity: 0,
      raw_average: 0
    };
  }
}

export async function fetchRtarfSeverityStatistics(): Promise<RtarfSeverityStatistics | null> {
  try {
    const response = await axios.get<RtarfSeverityStatistics>(
      `${POSTGRES_API_URL}/rtarf-events/severity/statistics`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Rtarf average summary from PostgreSQL:", error);
    return null;
    };
  }


// ==============================
// Alert Services
// ==============================

export interface AlertItem {
  alert_name: string;
  count: number;
}

export interface AlertSummary {
  total_alerts: number;
  alert_summarys: AlertItem[];
}

export async function fetchAlertSummary(): Promise<AlertSummary> {
  try {
    const response = await axios.get<AlertSummary>(
      `${POSTGRES_API_URL}/alerts/summary`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching alert summary from PostgreSQL:", error);
    return {
      total_alerts: 0,
      alert_summarys: [],
    };
  }
}

export async function fetchLatestAlert(): Promise<AlertBase[]> {
  try {
    const response = await axios.get<AlertBase[]>(
      `${POSTGRES_API_URL}/alerts/latest`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching latest alert:", error);
    return [];
  }
}


// ==============================
// Node Services
// ==============================

export interface NodePayload {
  name: string,
  description?: string,
  node_type: string,
  latitude: string,
  longitude: string,
  ip_address?: string,
  additional_ips?: string[],
  network_metadata?: Record<string, any>,
  map_scope:string
}

export interface NodeSummary {
  node_id: number,
  node_name: string,
  total_events: number,
  events_by_role: string[],
  events_by_severity: string[],
  latest_event_time: string,
}


export async function createNode(payload: NodePayload): Promise<NodePayload> {
  try{
    const response = await axios.post<NodePayload> (
      `${POSTGRES_API_URL}/nodes/`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error creating node:", error);
    throw error
  }
}

export async function GetAllNode(): Promise<NodeGet[]> {
  try {
    const response = await axios.get<NodeGet[]>(
      `${POSTGRES_API_URL}/nodes/`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching all nodes:", error);
    return [];
  }
}

export async function GetNodeWithMapScope(map_scope: string): Promise<NodeGet[]> {
  try {
    const response = await axios.get<NodeGet[]>(
      `${POSTGRES_API_URL}/nodes/map_scope/${map_scope}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching all nodes:", error);
    return [];
  }
}
// ==============================
// Network Connection Services
// ==============================

export interface ConnectionNode {
  id: number;
  name: string;
  node_type: string;
  latitude: number;
  longitude: number;
  ip_address?: string;
}

export interface NetworkConnection {
  id: number;
  source_node_id: number;
  destination_node_id: number;
  protocol?: string;
  connection_type?: string;
  connection_status?: string;
  bytes_sent?: number;
  bytes_received?: number;
  packets_sent?: number;
  packets_received?: number;
  source_node?: ConnectionNode | null;
  destination_node?: ConnectionNode | null;
  created_at?: string;
  first_seen?: string;
  last_seen?: string;
}

export async function GetAllConnectionsWithNodes(): Promise<NetworkConnection[]> {
  try {
    const response = await axios.get<NetworkConnection[]>(
      `${POSTGRES_API_URL}/connections/with-nodes`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching connections with nodes:", error);
    return [];
  }
}
