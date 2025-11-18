import React, { useState, useEffect } from "react";
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
const MapBoundsTracker = ({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) => {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, []);

  return null;
};

// Types
interface NodeGet {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  layer: string;
  type: string;
  ip_address?: string;
  node_type?: string;
}

interface MapViewProps {
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
}

const MapView: React.FC<MapViewProps> = ({ onBoundsChange }) => {
  const [nodeData, setNodeData] = useState<NodeGet[]>([]);

  useEffect(() => {
    const loadNodeData = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/nodes");// fetch จาก Flask backend
        if (!res.ok) throw new Error("Failed to fetch nodes");
        const nodes: NodeGet[] = await res.json();

        // แปลง latitude / longitude เป็น number
        const parsedNodes = nodes.map((n) => ({
          ...n,
          latitude: Number(n.latitude),
          longitude: Number(n.longitude),
        }));

        console.log("Parsed Nodes:", parsedNodes);
        setNodeData(parsedNodes);
      } catch (err) {
        console.error(err);
      }
    };
    loadNodeData();
  }, []);

  const getNodeIcon = (node: NodeGet) => (node.layer === "Internal" ? redIcon : yellowIcon);

  // กำหนด center map จากค่าเฉลี่ย lat/lng
  const centerLat = nodeData.length
    ? nodeData.reduce((sum, n) => sum + n.latitude, 0) / nodeData.length
    : 15.87;
  const centerLng = nodeData.length
    ? nodeData.reduce((sum, n) => sum + n.longitude, 0) / nodeData.length
    : 100.9925;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={6}
      minZoom={4}
      maxZoom={18}
      className="w-full h-full rounded-lg"
      style={{ backgroundColor: "black" }}
    >
      {/* Base maps */}
      <TileLayer
        attribution="&copy; OpenStreetMap & CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

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
              Type: {node.node_type || node.type}
              <br />
              Layer: {node.layer}
              <br />
              Lat: {node.latitude}, Lng: {node.longitude}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
