import React, { useState, useEffect } from "react";
import { GetAllConnectionsWithNodes, type NetworkConnection, GetNodeWithMapScope } from "../../services/defensiveService";
import type { NodeGet } from "../../types/defensive";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  GeoJSON,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../index.css";
import { Router } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";


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


const MapViewBangkok:React.FC<MapViewProps> = ({ onBoundsChange }) => {
  const [nodeData, setNodeData] = useState<NodeGet[]>([]);
  const [connectionsData, setConnectionsData] = useState<NetworkConnection[]>([]);
  const mapSelect = "bangkok";

  const [bangkokGeoJSON, setBangkokGeoJSON] = useState<any>(null);

  useEffect(() => {
    fetch("/data/bangkok-districts.geojson")
      .then(res => res.json())
      .then(data => setBangkokGeoJSON(data));
  }, []);

  useEffect(() => {
    const loadNodeData = async () => {
      const nodes = await GetNodeWithMapScope(mapSelect);
      const connecteds = await GetAllConnectionsWithNodes();
      console.log("Show Nodes:", nodes)
      console.log("Show Connections:", connecteds)
      setNodeData(nodes);
      setConnectionsData(connecteds);
    };
    loadNodeData();
  }, []);

  // พิกัดตัวอย่าง threat (กรุงเทพ, เชียงใหม่, สงขลา, โคราช, ขอนแก่น)
  // const threats: { name: string; coords: [number, number]; color: string }[] = [
  //   { name: "THREAT 1", coords: [13.7563, 100.5018], color: "red" }, // กรุงเทพ
  //   { name: "THREAT 2", coords: [18.7883, 98.9853], color: "yellow" }, // เชียงใหม่
  //   { name: "THREAT 3", coords: [7.0096, 100.4762], color: "yellow" }, // สงขลา
  //   { name: "THREAT 4", coords: [14.9799, 102.0977], color: "yellow" }, // โคราช
  //   { name: "THREAT 5", coords: [16.4419, 102.835], color: "yellow" }, // ขอนแก่น
  // ];

  
  // สร้างเซ็ตของ node IDs ที่อยู่ใน map_scope ปัจจุบัน
  const nodeIdsInMap = new Set(nodeData.map(node => node.id));

  // Create polylines from connection data
  const connectionLines = connectionsData
    .filter(conn =>
      conn.source_node &&
      conn.destination_node &&
      nodeIdsInMap.has(conn.source_node.id) &&
      nodeIdsInMap.has(conn.destination_node.id)
    )
    .map(conn => ({
      id: conn.id,
      positions: [
        [conn.source_node!.latitude, conn.source_node!.longitude] as [number, number],
        [conn.destination_node!.latitude, conn.destination_node!.longitude] as [number, number],
      ],
      status: conn.connection_status || "unknown",
    }));

  const getNodeIcon = (node: NodeGet) => {
  let color = "white";
  switch (node.name) {
    case "บก.ทท.":
      color = "yellow";
      break;
    case "ทบ.":
      color = "green";
      break;
    case "ทอ.":
      color = "skyblue";
      break;
    case "ทร.":
      color = "blue";
      break;
    case "ตร.":
      color = "#800000";
      break;
  }

  // แปลง React component เป็น HTML string
  const iconHtml = renderToStaticMarkup(<Router size={24} color={color} />);
  return L.divIcon({
    html: iconHtml,
    className: "", // ปิด className default ของ Leaflet
    iconSize: [30, 30], // ขนาดของ icon
  });
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
      center={[13.7563, 100.5018]} // กรุงเทพมหานคร
      zoom={11} // ซูมเข้าไปที่กรุงเทพ (11-13 สำหรับเมือง)
      minZoom={10} // จำกัดการซูมออกไม่ให้เห็นทั้งโลก
      maxZoom={18}
      className="w-full h-full rounded-lg"
      style={{ backgroundColor: "black" }}
    >
      {bangkokGeoJSON && (
        <GeoJSON
          data={bangkokGeoJSON}
          style={{
            color: "orange",
            weight: 1,
            fillColor: "orange",
            fillOpacity: 0.03,
          }}
        />
      )}
      {/* 🌊 พื้นหลังกรมท่าเข้ม */}
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

export default MapViewBangkok;