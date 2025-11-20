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
  className: "", // ใช้ .alert-pulse-glow จาก index.css
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
// BEZIER UTIL (ทำเส้นโค้ง)
// ===============================
type LatLngTuple = [number, number];

interface BezierCurve {
  start: LatLngTuple;
  control: LatLngTuple;
  end: LatLngTuple;
  points: LatLngTuple[]; // จุดที่ใช้วาด Polyline
}

// สร้าง control point + ชุดจุดตาม quadratic Bezier
const createBezierCurve = (
  start: LatLngTuple,
  end: LatLngTuple,
  segments: number = 40
): BezierCurve => {
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  // จุดกึ่งกลาง
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  // เวกเตอร์ตั้งฉาก (ประมาณ ๆ)
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const length = Math.sqrt(dLat * dLat + dLng * dLng) || 1;

  // ปรับ factor เพื่อกำหนดความโค้ง (ยิ่งมากยิ่งนูน)
  const offsetFactor = 0.35; // ลอง 0.2–0.35 ได้
  const offsetLat = (-dLng / length) * offsetFactor;
  const offsetLng = (dLat / length) * offsetFactor;

  const control: LatLngTuple = [midLat + offsetLat, midLng + offsetLng];

  const points: LatLngTuple[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const oneMinusT = 1 - t;

    // B(t) = (1-t)^2 * P0 + 2(1-t)t * C + t^2 * P1
    const lat =
      oneMinusT * oneMinusT * lat1 +
      2 * oneMinusT * t * control[0] +
      t * t * lat2;
    const lng =
      oneMinusT * oneMinusT * lng1 +
      2 * oneMinusT * t * control[1] +
      t * t * lng2;

    points.push([lat, lng]);
  }

  return { start, control, end, points };
};

// ===============================
// MOVING DOT (จุดเรืองแสงวิ่งตามเส้นโค้ง)
// ===============================
interface MovingDotProps {
  start: LatLngTuple;
  end: LatLngTuple;
  control?: LatLngTuple; // ถ้ามี → วิ่งตาม Bezier, ถ้าไม่มี → เส้นตรง
  durationMs?: number;
}

const MovingDot: React.FC<MovingDotProps> = ({
  start,
  end,
  control,
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
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [durationMs]);

  let lat: number;
  let lng: number;

  if (control) {
    // quadratic Bezier
    const oneMinusT = 1 - t;
    lat =
      oneMinusT * oneMinusT * start[0] +
      2 * oneMinusT * t * control[0] +
      t * t * end[0];
    lng =
      oneMinusT * oneMinusT * start[1] +
      2 * oneMinusT * t * control[1] +
      t * t * end[1];
  } else {
    // เส้นตรงปกติ
    lat = start[0] + (end[0] - start[0]) * t;
    lng = start[1] + (end[1] - start[1]) * t;
  }

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={2.5} // ลดขนาดจุด
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

  const hqPosition: LatLngTuple = hqNode
    ? [hqNode.latitude, hqNode.longitude]
    : [13.7563, 100.5018]; // fallback: Bangkok center

  // ====== เส้น connection เดิมจากฐานข้อมูล (เส้นตรง) ======
  const connectionLines = connectionsData
    .filter((conn) => conn.source_node && conn.destination_node)
    .map((conn) => ({
      id: conn.id,
      positions: [
        [conn.source_node!.latitude, conn.source_node!.longitude] as LatLngTuple,
        [
          conn.destination_node!.latitude,
          conn.destination_node!.longitude,
        ] as LatLngTuple,
      ],
      status: conn.connection_status || "unknown",
    }));

  // ====== เส้นเครือข่ายวิ่งเข้าหา HQ จากทุกโหนด (โค้ง) ======
  const inboundCurves: (BezierCurve & { id: string })[] = nodeData
    .filter((node) => {
      if (!node) return false;
      if (!hqNode) return true;
      return node.id !== hqNode.id;
    })
    .map((node) => {
      const start: LatLngTuple = [node.latitude, node.longitude];
      const end: LatLngTuple = hqPosition;
      const curve = createBezierCurve(start, end);
      return {
        id: `to-hq-${node.id}`,
        ...curve,
      };
    });

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

      {/* เส้นจากฐานข้อมูลเดิม (เส้นตรง – ลดความหนา) */}
      {connectionLines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.positions}
          pathOptions={{
            color: getLineColor(line.status),
            weight: 1.5,   // ลดจาก 2 → 1.5
            opacity: 0.5,
          }}
        />
      ))}

      {/* เส้นเข้าหา HQ แบบโค้ง + มิติ + glow + dot */}
      {inboundCurves.map((line) => (
        <React.Fragment key={line.id}>
          {/* ฮาโลด้านนอก (หนา / จาง) */}
          <Polyline
            positions={line.points}
            pathOptions={{
              color: "#00FFFF",
              weight: 3,     // ลดจาก 5 → 3
              opacity: 0.22,
            }}
            className="link-line-outer"
          />

          {/* เส้นด้านใน (คม / dash / animation จาก CSS) */}
          <Polyline
            positions={line.points}
            pathOptions={{
              color: "#AFFFFF",
              weight: 1.4,   // ลดจาก 2 → 1.4
              opacity: 0.95,
            }}
            className="link-line-inner"
          />

          {/* จุดเรืองแสงวิ่งตามเส้นโค้ง (Bezier) */}
          <MovingDot
            start={line.start}
            end={line.end}
            control={line.control}
            durationMs={3500}
          />
        </React.Fragment>
      ))}
    </MapContainer>
  );
};

export default MapView;
