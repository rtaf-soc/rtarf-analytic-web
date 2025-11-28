import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../index.css"

// ===============================
// ICONS
// ===============================

const routerIcon = new L.Icon({
  iconUrl: "/img/blue-router.png",
  iconSize: [24, 24],
});

const serverIcon = new L.Icon({
  iconUrl: "/img/warning.png",
  iconSize: [24, 24],
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
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  return null;
};

interface MapViewProps {
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  selectedLayer: string | null; // layer ที่เลือกจาก OverlayList
}

interface NodeData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  layer: string;
  links: string[];
  status: Record<string, any>;
}

type LatLngTuple = [number, number];

// ===============================
// BEZIER CURVE (ทำเส้นโค้งสมูท)
// ===============================

function createBezierCurve(
  start: LatLngTuple,
  end: LatLngTuple,
  segments: number = 40
): LatLngTuple[] {
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  // เวกเตอร์จาก start → end
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;

  // midpoint
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  // ความยาวคร่าว ๆ
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // ค่าความโค้ง (0.1–0.4 ยิ่งเยอะยิ่งโค้ง)
  const offset = 0.18 * len;

  // normal vector ตั้งฉากกับเส้น
  const nx = -dy / len;
  const ny = dx / len;

  // control point ทำให้เส้นโค้งขึ้นเล็กน้อย (สมูท ไม่เว่อร์)
  const ctrlLat = midLat + nx * offset;
  const ctrlLng = midLng + ny * offset;

  const curve: LatLngTuple[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const oneMinusT = 1 - t;

    const lat =
      oneMinusT * oneMinusT * lat1 +
      2 * oneMinusT * t * ctrlLat +
      t * t * lat2;

    const lng =
      oneMinusT * oneMinusT * lng1 +
      2 * oneMinusT * t * ctrlLng +
      t * t * lng2;

    curve.push([lat, lng]);
  }

  return curve;
}

// ===============================
// MOVING GLOW DOT (เม็ดแสงวิ่งตามโค้ง)
// ===============================

// const MovingGlowDot = ({ curve }: { curve: LatLngTuple[] }) => {
//   const [pos, setPos] = useState<LatLngTuple>(curve[0] || [0, 0]);
//   const progress = useRef(0);

//   useEffect(() => {
//     if (!curve || curve.length === 0) return;

//     let frame: number;

//     const animate = () => {
//       // ปรับความเร็วที่นี่ (0.004 ช้ากว่า / 0.01 เร็วกว่า)
//       progress.current += 0.007;
//       if (progress.current > 1) progress.current = 0;

//       const idx = Math.floor(progress.current * (curve.length - 1));
//       setPos(curve[idx]);

//       frame = requestAnimationFrame(animate);
//     };

//     frame = requestAnimationFrame(animate);
//     return () => cancelAnimationFrame(frame);
//   }, [curve]);

//   if (!curve || curve.length === 0) return null;

//   return (
//     <CircleMarker
//       center={pos}
//       radius={3.5}
//       pathOptions={{
//         color: "#00FFFF",
//         fillColor: "#00FFFF",
//         fillOpacity: 1,
//         weight: 1,
//       }}
//       className="circle-marker-glow"
//     />
//   );
// };

// ===============================
// MAIN MAP VIEW
// ===============================

const MapView: React.FC<MapViewProps> = ({ onBoundsChange, selectedLayer }) => {
  const [nodeData, setNodeData] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLayer) return;

    const loadNodes = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/nodeplot?layer=${encodeURIComponent(selectedLayer)}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log("Loaded NodePlot:", data);

        const formattedData: NodeData[] = data.map((node: any) => ({
          id: node.id,
          name: node.name,
          latitude: node.latitude,
          longitude: node.longitude,
          type: node.type || "Router",
          layer: selectedLayer,
          links: node.links || [],
          status: node.status || {},
        }));

        setNodeData(formattedData);
        setError(null);
      } catch (err) {
        console.error("Failed to load nodeplot:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load nodeplot"
        );
      } finally {
        setLoading(false);
      }
    };

    loadNodes();
  }, [selectedLayer]);

  const getNodeIcon = (node: NodeData) => {
    switch (node.type.toLowerCase()) {
      case "router":
        return routerIcon;
      case "server":
        return serverIcon;
      default:
        return routerIcon;
    }
  };

  const getLayerColor = (layer: string) => {
    const colors: { [key: string]: string } = {
      Internal: "#3b82f6",
      "RTARF-Internal": "#10b981",
      External: "#ef4444",
      default: "#6b7280",
    };
    return colors[layer] || colors["default"];
  };

  // กันลิงก์ซ้ำ
  const linkPairs = new Set<string>();
  const getLinkKey = (a: string, b: string) =>
    a < b ? `${a}-${b}` : `${b}-${a}`;

  return (
    <MapContainer
      center={[15.0, 100.0]}
      zoom={5}
      minZoom={2}
      maxZoom={18}
      className="w-full h-full rounded-lg"
      style={{ backgroundColor: "black" }}
    >
      {/* base dark map */}
      <TileLayer
        attribution="&copy; OpenStreetMap & CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* ocean layer – ใส่ class ocean-tile ตอน tile load */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
        opacity={0.2}
        maxZoom={10}
        eventHandlers={{
          tileload: (e: any) => {
            const tile = e.tile as HTMLImageElement | null;
            if (tile) {
              tile.classList.add("ocean-tile");
            }
          },
        }}
      />

      {/* labels / boundaries */}
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />

      {onBoundsChange && <MapBoundsTracker onBoundsChange={onBoundsChange} />}

      {loading && (
        <div className="absolute top-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg z-[1000] shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Loading nodes...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg z-[1000] shadow-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="absolute top-4 left-4 bg-slate-800 text-white px-3 py-1.5 rounded-lg z-[1000] shadow-lg text-sm">
          <strong>{nodeData.length}</strong> nodes loaded
        </div>
      )}

      {/* =========================
          RENDER LINKS – โค้งสมูท + glow + dot
         ========================= */}
      {nodeData.map((node) =>
        node.links.map((linkedNodeId) => {
          const targetNode = nodeData.find((n) => n.id === linkedNodeId);
          if (!targetNode) return null;

          const key = getLinkKey(node.id, linkedNodeId);
          if (linkPairs.has(key)) return null;
          linkPairs.add(key);

          const start: LatLngTuple = [node.latitude, node.longitude];
          const end: LatLngTuple = [targetNode.latitude, targetNode.longitude];

          const curve = createBezierCurve(start, end);

          return (
            <React.Fragment key={key}>
              {/* outer glow (โค้งตาม curve) */}
              <Polyline
                positions={curve}
                pathOptions={{
                  color: "#00FFFF",
                  weight: 5,
                  opacity: 0.18,
                  lineCap: "round",
                  lineJoin: "round",
                }}
                className="link-line-outer"
              />

              {/* inner neon (โค้งสมูท) */}
              <Polyline
                positions={curve}
                pathOptions={{
                  color: "#AAFFFF",
                  weight: 2,
                  opacity: 0.95,
                  lineCap: "round",
                  lineJoin: "round",
                }}
                className="link-line-inner"
              />

              {/* เม็ดแสงวิ่งตามโค้ง */}
              {/* <MovingGlowDot curve={curve} /> */}
            </React.Fragment>
          );
        })
      )}

      {/* =========================
          RENDER NODES
         ========================= */}
      {nodeData.map((node) => (
        <Marker
          key={node.id}
          position={[node.latitude, node.longitude]}
          icon={getNodeIcon(node)}
        >
          <Popup>
            <div className="text-sm space-y-1">
              <div className="font-bold text-base border-b pb-1 mb-1">
                {node.name}
              </div>
              <div>
                <strong>Type:</strong> {node.type}
              </div>
              <div>
                <strong>Layer:</strong>{" "}
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: getLayerColor(node.layer),
                    color: "white",
                  }}
                >
                  {node.layer}
                </span>
              </div>
              <div>
                <strong>Location:</strong> {node.latitude.toFixed(4)},{" "}
                {node.longitude.toFixed(4)}
              </div>
              <div className="text-xs text-gray-500 pt-1 border-t mt-1">
                ID: {node.id.substring(0, 8)}...
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
