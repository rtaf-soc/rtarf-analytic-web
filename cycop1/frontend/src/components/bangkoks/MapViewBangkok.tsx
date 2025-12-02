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
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../index.css";
import { Router } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

/* =====================
   MapBoundsTracker
===================== */
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

/* =====================
   ZoomTracker
   (เอาไว้ดูว่า zoom ตอนนี้เท่าไหร่)
===================== */
const ZoomTracker = ({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) => {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
};

// ===================== MapFlyToController =====================
interface MapFlyToControllerProps {
  target: { lat: number; lng: number; zoom: number } | null;
}

const MapFlyToController: React.FC<MapFlyToControllerProps> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom, {
        animate: true,
        duration: 2,
        easeLinearity: 0.25,
      });
    }
  }, [target, map]);

  return null;
};

/* ======================
   BEZIER UTILITIES
====================== */

type LatLngTuple = [number, number];

interface BezierCurve {
  start: LatLngTuple;
  control: LatLngTuple;
  end: LatLngTuple;
  points: LatLngTuple[];
}

const createBezierCurve = (
  start: LatLngTuple,
  end: LatLngTuple,
  segments: number = 40
): BezierCurve => {
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const length = Math.sqrt(dLat * dLat + dLng * dLng) || 1;

  const offsetFactor = 0.01;
  const offsetLat = (-dLng / length) * offsetFactor;
  const offsetLng = (dLat / length) * offsetFactor;

  const control: LatLngTuple = [midLat + offsetLat, midLng + offsetLng];

  const points: LatLngTuple[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const oneMinusT = 1 - t;
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

// ===================== ICONS โลโก้แต่ละเหล่าทัพ =====================
const iconRTARFAlert = L.divIcon({
  className: "",
  html: `
    <div class="rtarf-alert-heartbeat">
      <img src="/img/บก.ทท.png" alt="บก.ทท." style="width:50px; height:45px;" />
    </div>
  `,
  iconSize: [50, 45],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

const iconARMY = L.divIcon({
  className: "",
  html: `
    <div class="hq-normal-glow">
      <img src="/img/ทบ.png" alt="ทบ." style="width:60px; height:65px;" />
    </div>
  `,
  iconSize: [60, 65],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

const iconAIRFORCE = L.divIcon({
  className: "",
  html: `
    <div class="hq-normal-glow">
      <img src="/img/ทอ.png" alt="ทอ." style="width:50px; height:45px;" />
    </div>
  `,
  iconSize: [50, 45],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

const iconNAVY = L.divIcon({
  className: "",
  html: `
    <div class="hq-normal-glow">
      <img src="/img/ทร.png" alt="ทร." style="width:35px; height:50px;" />
    </div>
  `,
  iconSize: [35, 50],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

const iconPOLICE = L.divIcon({
  className: "",
  html: `
    <div class="hq-normal-glow">
      <img src="/img/ตอ.png" alt="ตร." style="width:40px; height:40px;" />
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [24, 24],
  popupAnchor: [0, -30],
});

// ===================== FIX MARKER HQ =====================
const FIXED_HQ = [
  {
    name: "บก.ทท.",
    icon: iconRTARFAlert,
    position: [13.8863424, 100.56493182] as LatLngTuple,
    description: "ศูนย์ไซเบอร์ทหาร กองบัญชาการกองทัพไทย",
  },
  {
    name: "ทบ.",
    icon: iconARMY,
    position: [13.762575459990577, 100.50709066527318] as LatLngTuple,
    description: "ศูนย์ไซเบอร์กองทัพบก",
  },
  {
    name: "ทอ.",
    icon: iconAIRFORCE,
    position: [13.922478935512451, 100.61856910575769] as LatLngTuple,
    description: "ศูนย์ไซเบอร์กองทัพอากาศ",
  },
  {
    name: "ทร.",
    icon: iconNAVY,
    position: [13.741766933008465, 100.48936628134868] as LatLngTuple,
    description: "กรมการสื่อสารและเทคโนโลยีสารสนเทศทหารเรือ",
  },
  {
    name: "ตร.",
    icon: iconPOLICE,
    position: [13.748377057528485, 100.53740589888896] as LatLngTuple,
    description: "สำนักงานตำรวจแห่งชาติ",
  },
];

const HQ_CENTER = FIXED_HQ[0].position;
const HQ_NAMES = new Set(["บก.ทท.", "บก.ทท", "ทบ.", "ทอ.", "ทร.", "ตร."]);

const HQ_CONNECTIONS = FIXED_HQ.filter((hq) => hq.name !== "บก.ทท.").map(
  (hq, idx) => ({
    id: `hq-static-${idx}`,
    from: hq.position as LatLngTuple,
    to: HQ_CENTER as LatLngTuple,
  })
);

// ===================== Animated Beam =====================
interface AnimatedBeamProps {
  from: LatLngTuple;
  to: LatLngTuple;
  color?: string;
  durationMs?: number;
  dashSpeed?: number;
}

const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  from,
  to,
  color = "#22d3ee",
  durationMs = 3000,
  dashSpeed = -1.5,
}) => {
  const map = useMap();

  useEffect(() => {
    const [fromLat, fromLng] = from;
    const [toLat, toLng] = to;

    const curve = createBezierCurve(from, to);
    const { control, points } = curve;

    const glowLine = L.polyline(points, {
      color,
      weight: 3,
      opacity: 0.22,
    }).addTo(map);

    const dashLine = L.polyline(points, {
      color,
      weight: 1.4,
      opacity: 0.95,
      dashArray: "8 14",
      dashOffset: "0",
    }).addTo(map);

    const dot = L.circleMarker(from, {
      radius: 3,
      color,
      fillColor: color,
      fillOpacity: 1,
    }).addTo(map);

    let frameId: number;
    let start: number | null = null;
    let dashOffset = 0;

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const t = (elapsed % durationMs) / durationMs;

      const oneMinusT = 1 - t;
      const lat =
        oneMinusT * oneMinusT * fromLat +
        2 * oneMinusT * t * control[0] +
        t * t * toLat;
      const lng =
        oneMinusT * oneMinusT * fromLng +
        2 * oneMinusT * t * control[1] +
        t * t * toLng;

      dot.setLatLng([lat, lng]);

      dashOffset = (dashOffset + dashSpeed) % 100;
      dashLine.setStyle({ dashOffset: `${dashOffset}` });

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      map.removeLayer(glowLine);
      map.removeLayer(dashLine);
      map.removeLayer(dot);
    };
  }, [map, from, to, color, durationMs, dashSpeed]);

  return null;
};

// ===================== Props =====================
interface MapViewProps {
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  onNodeClick?: (node: NodeGet) => void;
  selectedNode?: NodeGet | null;
}

// ===================== Main Component =====================
const MapViewBangkok: React.FC<MapViewProps> = ({
  onBoundsChange,
  onNodeClick,
  selectedNode,
}) => {
  const [nodeData, setNodeData] = useState<NodeGet[]>([]);
  const [connectionsData, setConnectionsData] = useState<NetworkConnection[]>(
    []
  );
  const [bangkokGeoJSON, setBangkokGeoJSON] = useState<any>(null);

  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(11);

  const mapSelect = "bangkok";

  useEffect(() => {
    fetch("/data/bangkok-districts.geojson")
      .then((res) => res.json())
      .then((data) => setBangkokGeoJSON(data));
  }, []);

  useEffect(() => {
    const loadNodeData = async () => {
      const nodes = await GetNodeWithMapScope(mapSelect);
      const connecteds = await GetAllConnectionsWithNodes();
      setNodeData(nodes);
      setConnectionsData(connecteds);
    };
    loadNodeData();
  }, []);

  // ปรับความสว่างของ tile ตาม zoom level
  useEffect(() => {
    const tiles = document.querySelectorAll<HTMLElement>(".dynamic-dark-map");

    tiles.forEach((tile) => {
      let brightness = 0.4; // มุมมองไกล = มืด

      if (zoomLevel >= 17) brightness = 1.0; // ซูมใกล้มาก = สว่างเต็ม
      else if (zoomLevel >= 15) brightness = 0.7;
      else if (zoomLevel >= 14) brightness = 0.55;
      else brightness = 0.4;

      tile.style.transition = "filter 0.3s ease-out";
      tile.style.filter = `brightness(${brightness}) contrast(1.1) saturate(0.9)`;
    });
  }, [zoomLevel]);

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
        [
          Number(conn.source_node!.latitude),
          Number(conn.source_node!.longitude),
        ] as LatLngTuple,
        [
          Number(conn.destination_node!.latitude),
          Number(conn.destination_node!.longitude),
        ] as LatLngTuple,
      ],
      status: conn.connection_status || "unknown",
    }));

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

  const getNodeIcon = (node: NodeGet, active: boolean) => {
    if (node.name === "บก.ทท." || node.name === "บก.ทท") return iconRTARFAlert;
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

  return (
    <MapContainer
      center={[13.7563, 100.5018]}
      zoom={11}
      minZoom={10}
      maxZoom={18}
      className="w-full h-full rounded-lg"
      style={{ backgroundColor: "black" }}
    >
      {/* Google Maps Hybrid Tile */}
      <TileLayer
        className="dynamic-dark-map"
        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        attribution="&copy; Google Maps"
        maxZoom={20}
        subdomains={["mt0", "mt1", "mt2", "mt3"]}
      />
      {/* labels / boundaries */}
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />

      {/* ติดตาม zoom */}
      <ZoomTracker onZoomChange={setZoomLevel} />

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

      <MapFlyToController target={flyToTarget} />

      {onBoundsChange && <MapBoundsTracker onBoundsChange={onBoundsChange} />}

      {/* Marker จาก DB (ยกเว้น HQ) */}
      {nodeData
        .filter((node) => !HQ_NAMES.has(node.name))
        .map((node) => {
          const active = selectedNode?.id === node.id;
          return (
            <Marker
              key={node.id}
              position={[Number(node.latitude), Number(node.longitude)]}
              icon={getNodeIcon(node, active)}
              eventHandlers={{
                click: () => {
                  if (onNodeClick) onNodeClick(node);
                  setFlyToTarget({
                    lat: Number(node.latitude),
                    lng: Number(node.longitude),
                    zoom: 15,
                  });
                },
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

      {/* FIXED HQ MARKERS */}
      {FIXED_HQ.map((hq, idx) => (
        <Marker
          key={`hq-${idx}`}
          position={hq.position}
          icon={hq.icon}
          eventHandlers={{
            click: () => {
              setFlyToTarget({
                lat: hq.position[0],
                lng: hq.position[1],
                zoom: 19,
              });
            },
          }}
        >
          <Popup>
            <strong>{hq.name}</strong>
            <br />
            {hq.description}
          </Popup>
        </Marker>
      ))}

      {/* เส้นเชื่อมโยงปกติจาก DB */}
      {connectionLines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.positions}
          pathOptions={{
            color: getLineColor(line.status),
            weight: 1.4,
            opacity: 0.95,
          }}
        />
      ))}

      {/* เส้นเชื่อมโยง HQ */}
      {HQ_CONNECTIONS.map((line) => (
        <AnimatedBeam
          key={line.id}
          from={line.from}
          to={line.to}
<<<<<<< HEAD
          color="#d11515ff"
=======
          color="#D62400"
>>>>>>> 751b9f435c81006e6960431339736053618e5bac
          durationMs={3500}
          dashSpeed={-1}
        />
      ))}
    </MapContainer>
  );
};

export default MapViewBangkok;
