import React, { useState, useEffect } from "react";
import { GetAllNode, GetAllConnectionsWithNodes, type NetworkConnection } from "../services/defensiveService";
import type { NodeGet } from "../types/defensive";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../index.css";

// ไอคอน threat สีแดง/เหลือง
const redIcon = new L.Icon({
  iconUrl: "/img/warning.png",
  iconSize: [24, 24],
});

const yellowIcon = new L.Icon({
  iconUrl: "/img/wifi-router.png",
  iconSize: [24, 24],
});

// Component สำหรับติดตาม bounds ของแผนที่
const MapBoundsTracker = ({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) => {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds());
    },
  });
  
  useEffect(() => {
    // ส่ง bounds ครั้งแรกตอน load
    onBoundsChange(map.getBounds());
  }, []);
  
  return null;
};

interface MapViewProps {
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
}

const MapView: React.FC<MapViewProps> = ({ onBoundsChange }) => {
  const [nodeData, setNodeData] = useState<NodeGet[]>([]);
  const [connectionsData, setConnectionsData] = useState<NetworkConnection[]>([]);

  useEffect(() => {
    const loadNodeData = async () => {
      const nodes = await GetAllNode();
      const connecteds = await GetAllConnectionsWithNodes();
      console.log("Show Nodes:", nodes);
      console.log("Show Connections:", connecteds);
      setNodeData(nodes);
      setConnectionsData(connecteds);
    };
    loadNodeData();
  }, []);

  // Create polylines from connection data
  const connectionLines = connectionsData
    .filter(conn => conn.source_node && conn.destination_node)
    .map(conn => ({
      id: conn.id,
      positions: [
        [conn.source_node!.latitude, conn.source_node!.longitude] as [number, number],
        [conn.destination_node!.latitude, conn.destination_node!.longitude] as [number, number],
      ],
      status: conn.connection_status || "unknown",
    }));

  // Determine icon color
  const getNodeIcon = (node: NodeGet) => {
    return node.id === 1 ? redIcon : yellowIcon;
  };

  // Determine line color based on connection status
  const getLineColor = (status: string) => {
    switch (status) {
      case "running":
        return "#32CD32"; // Green
      case "warning":
        return "#FFA500"; // Orange
      case "error":
        return "#FF0000"; // Red
      default:
        return "#32CD32";
    }
  };

  return (
    <MapContainer
      center={[15.87, 100.9925]} // Thailand center
      zoom={6}
      className="w-full h-full rounded-lg"
      style={{ backgroundColor: "black" }}
    >
      {/* พื้นหลังกรมท่าเข้ม */}
      <TileLayer
        attribution="&copy; OpenStreetMap & CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
        opacity={0.1}
      />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />

      {/* ติดตาม bounds และส่งออกไป */}
      {onBoundsChange && <MapBoundsTracker onBoundsChange={onBoundsChange} />}

      {/* Render nodes as markers */}
      {nodeData.map((node) => (
        <Marker
          key={node.id}
          position={[node.latitude, node.longitude]}
          icon={getNodeIcon(node)}
        >
          <Popup>
            <div className="text-sm">
              <strong>{node.name}</strong>
              <br />
              IP: {node.ip_address || "N/A"}
              <br />
              Type: {node.node_type}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* วาดเส้นเชื่อมโยง */}
      {connectionLines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.positions}
          pathOptions={{
            color: getLineColor(line.status),
            weight: 2,
            opacity: 0.7,
          }}
        />
      ))}
    </MapContainer>
  );
};

export default MapView;