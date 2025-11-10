// services/postgresService.ts
import axios from "axios";

export interface AlertItem {
  alert_name: string;
  count: number;
}

export interface AlertSummary {
  total_alerts: number;
  alert_summarys: AlertItem[];  // ✅ array of objects
}

const POSTGRES_API_URL =
  import.meta.env.VITE_POSTGRES_API_URL || "http://localhost:8000";

export async function fetchAlertSummary(): Promise<AlertSummary> {
  try {
    const response = await axios.get<AlertSummary>(
      `${POSTGRES_API_URL}/alert-lists/summary`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching alert summary from PostgreSQL:", error);
    return {
      total_alerts: 0,
      alert_summarys: [], // ✅ return valid empty array
    };
  }
}
