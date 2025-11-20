// src/components/bangkoks/MapViewBangkok.tsx
import React, { useState, useEffect } from "react";
import {
  GetAllConnectionsWithNodes,
  type NetworkConnection,
  GetNodeWithMapScope,
} from "../../services/defensiveService";
import type { NodeGet } from "../../types/defensive";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  GeoJSON,
  useMapEvents,
  useMap,              // ⭐ เพิ่ม useMap สำหรับ AnimatedBeam
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../index.css";
import { Router } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

const MapBoundsTracker = ({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) => {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend:   () => onBoundsChange(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  return null;
};

// ---------- ICON โลโก้แต่ละเหล่าทัพ (ไฟล์ต้องอยู่ใน public/img) ----------
const iconRTARF = L.icon({
  iconUrl: "/img/บก.ทท.png",
  iconSize: [50, 45],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

const iconARMY = L.icon({
  iconUrl: "/img/ทบ.png",
  iconSize: [60, 65],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

const iconAIRFORCE = L.icon({
  iconUrl: "/img/ทอ.png",
  iconSize: [50, 45],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

const iconNAVY = L.icon({
  iconUrl: "/img/ทร.png",
  iconSize: [35, 50],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

const iconPOLICE = L.icon({
  iconUrl: "/img/ตอ.png",
  iconSize: [40, 40],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

// ---------- FIX MARKER ตำแหน่ง HQ แต่ละเหล่าทัพ ----------
const FIXED_HQ = [
  {
    name: "บก.ทท.",
    icon: iconRTARF,
    position: [13.886433965395847, 100.56613525394891] as [number, number],
    description: "ศูนย์ไซเบอร์ทหาร กองบัญชาการกองทัพไทย",
  },
  {
    name: "ทบ.",
    icon: iconARMY,
    position: [13.762575459990577, 100.50709066527318] as [number, number],
    description: "ศูนย์ไซเบอร์กองทัพบก",
  },
  {
    name: "ทอ.",
    icon: iconAIRFORCE,
    position: [13.922478935512451, 100.61856910575769] as [number, number],
    description: "ศูนย์ไซเบอร์กองทัพอากาศ",
  },
  {
    name: "ทร.",
    icon: iconNAVY,
    position: [13.741766933008465, 100.48936628134868] as [number, number],
    description: "กรมการสื่อสารและเทคโนโลยีสารสนเทศทหารเรือ",
  },
  {
    name: "ตร.",
    icon: iconPOLICE,
    position: [13.748377057528485, 100.53740589888896] as [number, number],
    description: "สำนักงานตำรวจแห่งชาติ",
  },
];

// จุดศูนย์กลางที่ให้ “เส้นวิ่งเข้าหา” = HQ บก.ทท.
const HQ_CENTER = FIXED_HQ[0].position;

// ชื่อที่ถือว่าเป็น HQ (จะไม่วาด marker จาก DB ซ้ำ)
const HQ_NAMES = new Set(["บก.ทท.", "บก.ทท", "ทบ.", "ทอ.", "ทร.", "ตร."]);

interface MapViewProps {
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  onNodeClick?: (node: NodeGet) => void;
  selectedNode?: NodeGet | null;
}

// ---------- ลำแสงวิ่งเข้า HQ ----------
interface AnimatedBeamProps {
  from: [number, number];
  to: [number, number];
  color?: string;
}

const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  from,
  to,
  color = "#22d3ee",
}) => {
  const map = useMap();

  useEffect(() => {
    // เส้นหลัก (เรืองแสง + เส้นประ)
    const line = L.polyline([from, to], {
      color,
      weight: 3,
      opacity: 0.9,
      dashArray: "10 15",
    }).addTo(map);

    // จุดวิ่งตามเส้น
    const dot = L.circleMarker(from, {
      radius: 4,
      color,
      fillColor: color,
      fillOpacity: 1,
    }).addTo(map);

    let frameId: number;
    const duration = 2000; // ms ต่อรอบ
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const t = (elapsed % duration) / duration; // 0 → 1

      const lat = from[0] + (to[0] - from[0]) * t;
      const lng = from[1] + (to[1] - from[1]) * t;
      dot.setLatLng([lat, lng]);

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      map.removeLayer(line);
      map.removeLayer(dot);
    };
  }, [map, from, to, color]);

  return null;
};

const MapViewBangkok: React.FC<MapViewProps> = ({
  onBoundsChange,
  onNodeClick,
  selectedNode,
}) => {
  const [nodeData, setNodeData] = useState<NodeGet[]>([]);
  const [connectionsData, setConnectionsData] = useState<NetworkConnection[]>(
    []
  );
  const mapSelect = "bangkok";

  const [bangkokGeoJSON, setBangkokGeoJSON] = useState<any>(null);

  // โหลดขอบเขตกรุงเทพ
  useEffect(() => {
    fetch("/data/bangkok-districts.geojson")
      .then((res) => res.json())
      .then((data) => setBangkokGeoJSON(data));
  }, []);

  // โหลด Node + Connections จาก backend
  useEffect(() => {
    const loadNodeData = async () => {
      const nodes = await GetNodeWithMapScope(mapSelect);
      const connecteds = await GetAllConnectionsWithNodes();
      console.log("Show Nodes:", nodes);
      console.log("Show Connections:", connecteds);
      setNodeData(nodes);
      setConnectionsData(connecteds);
    };
    loadNodeData();
  }, []);

  // connection ปกติจาก DB
  const nodeIdsInMap = new Set(nodeData.map((node) => node.id));

  const connectionLines = connectionsData
    .filter(
      (conn) =>
        conn.source_node &&
        conn.destination_node &&
        nodeIdsInMap.has(conn.source_node.id) &&
        nodeIdsInMap.has(conn.destination_node.id)
    )
    .map((conn) => ({
      id: conn.id,
      positions: [
        [conn.source_node!.latitude, conn.source_node!.longitude] as [
          number,
          number
        ],
        [conn.destination_node!.latitude, conn.destination_node!.longitude] as [
          number,
          number
        ],
      ],
      status: conn.connection_status || "unknown",
    }));

  // ⭐ เส้น “เครือข่ายวิ่งเข้า บก.ทท.” จาก node ทุกตัว (ยกเว้น HQ เอง)
  const flowLinesToHQ = nodeData
    .filter((node) => !HQ_NAMES.has(node.name))
    .map((node) => ({
      id: `flow-${node.id}`,
      from: [node.latitude, node.longitude] as [number, number],
      to: HQ_CENTER,
    }));

  // เลือก icon ตาม node
  const getNodeIcon = (node: NodeGet, active: boolean) => {
    if (node.name === "บก.ทท." || node.name === "บก.ทท") return iconRTARF;
    if (node.name === "ทบ.") return iconARMY;
    if (node.name === "ทอ.") return iconAIRFORCE;
    if (node.name === "ทร.") return iconNAVY;
    if (node.name === "ตร.") return iconPOLICE;

    let color = "white";
    switch (node.name) {
      case "กองทัพบก":
        color = "green";
        break;
      case "กองทัพอากาศ":
        color = "skyblue";
        break;
      case "กองทัพเรือ":
        color = "blue";
        break;
      case "สำนักงานตำรวจแห่งชาติ":
        color = "#800000";
        break;
    }

    const iconHtml = renderToStaticMarkup(
      <div
        style={{
          filter: active
            ? "drop-shadow(0 0 6px rgba(34,197,94,0.9))"
            : "none",
        }}
      >
        <Router size={24} color={color} />
      </div>
    );

    return L.divIcon({
      html: iconHtml,
      className: "",
      iconSize: [32, 32],
    });
  };

  // สีเส้น connection ปกติ
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
      center={[13.7563, 100.5018]}
      zoom={11}
      minZoom={10}
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

      <TileLayer
        attribution="&copy; OpenStreetMap & CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
        opacity={0.1}
      />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />

      {onBoundsChange && (
        <MapBoundsTracker onBoundsChange={onBoundsChange} />
      )}

      {/* Marker จากฐานข้อมูล (ยกเว้น HQ ที่ fix ไว้แล้ว) */}
      {nodeData
        .filter((node) => !HQ_NAMES.has(node.name))
        .map((node) => {
          const active = selectedNode?.id === node.id;
          return (
            <Marker
              key={node.id}
              position={[node.latitude, node.longitude]}
              icon={getNodeIcon(node, active)}
              eventHandlers={{
                click: () => onNodeClick && onNodeClick(node),
              }}
            >
              <Popup>
                <strong>{node.name}</strong>
                <br />
                IP: {node.ip_address || "N/A"}
                <br />
                Type: {node.node_type}
              </Popup>
            </Marker>
          );
        })}

      {/* FIXED MARKERS สำหรับ HQ แต่ละเหล่าทัพ */}
      {FIXED_HQ.map((hq, idx) => (
        <Marker key={`hq-${idx}`} position={hq.position} icon={hq.icon}>
          <Popup>
            <strong>{hq.name}</strong>
            <br />
            {hq.description}
          </Popup>
        </Marker>
      ))}

      {/* เส้นเชื่อมโยงปกติจาก DB (จาง ๆ พอ) */}
      {connectionLines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.positions}
          pathOptions={{
            color: getLineColor(line.status),
            weight: 2,
            opacity: 0.3,
          }}
        />
      ))}

      {/* ⭐ ลำแสงวิ่งเข้า บก.ทท. */}
      {flowLinesToHQ.map((line) => (
        <AnimatedBeam
          key={line.id}
          from={line.from}
          to={line.to}
          color="#22d3ee"
        />
      ))}
    </MapContainer>
  );
};

export default MapViewBangkok;
