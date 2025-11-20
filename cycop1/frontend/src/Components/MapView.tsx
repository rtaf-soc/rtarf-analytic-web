import React, { useState, useEffect, useRef } from "react";
import {
  GetAllNode,
  GetAllConnectionsWithNodes,
  type NetworkConnection,
} from "../services/defensiveService";
import type { NodeGet } from "../types/defensive";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMapEvents,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../index.css";

// ===============================
// ICONS
// ===============================

// icon ปกติ (เหลือง)
const yellowIcon = new L.Icon({
  iconUrl: "/img/wifi-router.png",
  iconSize: [24, 24],
});

// เวอร์ชัน ALERT: กระพริบ + Glow + ขยาย/ย่อ
const redAlertIcon = L.divIcon({
  className: "", // ปล่อยว่าง แล้วใช้ class จาก html แทน
  html: `
    <div class="alert-pulse-glow">
      <img src="/img/warning.png" alt="alert" />
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// ===============================
// MAP BOUNDS TRACKER
// ===============================
const MapBoundsTracker = ({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) => {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    // ส่ง bounds ครั้งแรกตอนโหลด
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  return null;
};

interface MapViewProps {
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
}

// ===============================
// MOVING DOT (จุดเรืองแสงวิ่งตามเส้น)
// ===============================
interface MovingDotProps {
  positions: [[number, number], [number, number]]; // [start, end]
  durationMs?: number;
}

const MovingDot: React.FC<MovingDotProps> = ({
  positions,
  durationMs = 4000,
}) => {
  const [t, setT] = useState(0); // 0 → 1
  const startTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startTsRef.current === null) {
        startTsRef.current = timestamp;
      }
      const elapsed = timestamp - startTsRef.current;
      const cycle = elapsed % durationMs;
      const nextT = cycle / durationMs;
      setT(nextT);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        // ✅ แก้ตรงนี้จาก rafRefRef.current → rafRef.current
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [durationMs]);

  const [start, end] = positions;
  const lat = start[0] + (end[0] - start[0]) * t;
  const lng = start[1] + (end[1] - start[1]) * t;

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={3}
      pathOptions={{
        color: "#00FFFF",
        fillColor: "#00FFFF",
        fillOpacity: 1,
        weight: 1,
      }}
      className="circle-marker-glow"
    />
  );
};

// ===============================
// MAIN MAP VIEW
// ===============================
const MapView: React.FC<MapViewProps> = ({ onBoundsChange }) => {
  const [nodeData, setNodeData] = useState<NodeGet[]>([]);
  const [connectionsData, setConnectionsData] = useState<NetworkConnection[]>(
    []
  );

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

  // ====== หาตำแหน่ง HQ ======
  const hqNode =
    nodeData.find(
      (n) =>
        n.name &&
        n.name.toUpperCase().includes("RTARF INTERNAL NODE - HQ01")
    ) ||
    nodeData.find(
      (n) =>
        n.node_type &&
        n.node_type.toUpperCase() === "RTARF_INTERNAL_NODE"
    ) ||
    null;

  const hqPosition: [number, number] = hqNode
    ? [hqNode.latitude, hqNode.longitude]
    : [13.7563, 100.5018]; // fallback: Bangkok center

  // ====== เส้น connection เดิมจากฐานข้อมูล (ถ้ายังอยากใช้) ======
  const connectionLines = connectionsData
    .filter((conn) => conn.source_node && conn.destination_node)
    .map((conn) => ({
      id: conn.id,
      positions: [
        [
          conn.source_node!.latitude,
          conn.source_node!.longitude,
        ] as [number, number],
        [
          conn.destination_node!.latitude,
          conn.destination_node!.longitude,
        ] as [number, number],
      ],
      status: conn.connection_status || "unknown",
    }));

  // ====== เส้นเครือข่ายวิ่งเข้าหา HQ จากทุกโหนด ======
  const inboundLines = nodeData
    .filter((node) => {
      if (!node) return false;
      if (!hqNode) return true;
      return node.id !== hqNode.id;
    })
    .map((node) => ({
      id: `to-hq-${node.id}`,
      positions: [
        [node.latitude, node.longitude] as [number, number],
        hqPosition,
      ],
    }));

  // ICON ของแต่ละ node
  const getNodeIcon = (node: NodeGet) => {
    // HQ → ไอคอนแดงกระพริบ Glow แรงๆ
    if (
      node.name &&
      node.name.toUpperCase().includes("RTARF INTERNAL NODE - HQ01")
    ) {
      return redAlertIcon;
    }

    // INTERNAL NODE อื่น ๆ อยากให้เต้นด้วยก็ใช้ตัวเดียวกัน
    if (
      node.node_type &&
      node.node_type.toUpperCase() === "RTARF_INTERNAL_NODE"
    ) {
      return redAlertIcon;
    }

    // node ทั่วไป → icon เหลืองปกติ
    return yellowIcon;
  };

  // สีเส้น connection เดิม
  const getLineColor = (status: string) => {
    switch (status) {
      case "running":
        return "#32CD32";
      case "warning":
        return "#FFA500";
      case "error":
        return "#FF0000";
      default:
        return "#32CD32";
    }
  };

  return (
    <MapContainer
      center={[15.87, 100.9925]} // Thailand center
      zoom={6}
      minZoom={4}
      maxZoom={18}
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

      {/* Marker ของทุก node */}
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

      {/* เส้นจากฐานข้อมูลเดิม */}
      {connectionLines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.positions}
          pathOptions={{
            color: getLineColor(line.status),
            weight: 2,
            opacity: 0.5,
          }}
        />
      ))}

      {/* เส้นเข้าหา HQ + มิติ + glow + dot */}
      {inboundLines.map((line) => (
        <React.Fragment key={line.id}>
          {/* ฮาโลด้านนอก (หนา / จาง) */}
          <Polyline
            positions={line.positions}
            pathOptions={{
              color: "#00FFFF",
              weight: 5,
              opacity: 0.25,
            }}
            className="link-line-outer"
          />

          {/* เส้นด้านใน (คม / มี dash / animation ได้ถ้าอยากเพิ่มทีหลัง) */}
          <Polyline
            positions={line.positions}
            pathOptions={{
              color: "#AFFFFF",
              weight: 2,
              opacity: 0.95,
            }}
            className="link-line-inner"
          />

          {/* จุดเรืองแสงวิ่งตามเส้น */}
          <MovingDot positions={line.positions} durationMs={3500} />
        </React.Fragment>
      ))}
    </MapContainer>
  );
};

export default MapView;
