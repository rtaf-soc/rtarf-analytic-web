// services/postgresService.ts
import axios from "axios";
import { type  AlertBase } from "../types/defensive";

const POSTGRES_API_URL =
  import.meta.env.VITE_POSTGRES_API_URL || "http://localhost:8000";

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
  network_metadata?: string,
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