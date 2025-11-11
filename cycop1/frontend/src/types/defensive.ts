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