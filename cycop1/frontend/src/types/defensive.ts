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

export interface NodeGet {
    id: number,
    name: string,
    description?: string,
    node_type: string,
    latitude: number,
    longitude: number,
    ip_address?: string,
    additional_ips?: string[],
    network_metadata?: string[],
    created_at: string,
    updated_at: string,
}