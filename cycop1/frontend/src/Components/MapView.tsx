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
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../index.css";

// ===============================
// ICONS
// ===============================

const yellowIcon = new L.Icon({
  iconUrl: "/img/wifi-router.png",
  iconSize: [24, 24],
});

const redAlertIcon = L.divIcon({
  className: "",
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
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  return null;
};

type LatLngTuple = [number, number];

interface MapViewProps {
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  selectedNode?: NodeGet | null;
}

// ===============================
// BEZIER UTIL
// ===============================
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

  const offsetFactor = 0.35;
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

// ===============================
// MOVING DOT
// ===============================
interface MovingDotProps {
  start: LatLngTuple;
  end: LatLngTuple;
  control?: LatLngTuple;
  durationMs?: number;
}

const MovingDot: React.FC<MovingDotProps> = ({
  start,
  end,
  control,
  durationMs = 4000,
}) => {
  const [t, setT] = useState(0);
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
    lat = start[0] + (end[0] - start[0]) * t;
    lng = start[1] + (end[1] - start[1]) * t;
  }

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={2.5}
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
// FocusOnSelected
// ===============================
const FocusOnSelected: React.FC<{ node?: NodeGet | null }> = ({ node }) => {
  const map = useMap();

  useEffect(() => {
    if (!node) return;
    if (node.latitude == null || node.longitude == null) return;

    map.flyTo([node.latitude, node.longitude], 7, {
      duration: 1.5,
    });
  }, [node, map]);

  return null;
};

// ===============================
// MAIN MAP VIEW
// ===============================
const MapView: React.FC<MapViewProps> = ({ onBoundsChange, selectedNode }) => {
  const [nodeData, setNodeData] = useState<NodeGet[]>([]);
  const [connectionsData, setConnectionsData] =
    useState<NetworkConnection[]>([]);

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

  // ====== HQ NODE ======
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
    : [13.7563, 100.5018];

  // ====== Straight Lines ======
  const connectionLines = connectionsData
    .filter((conn) => conn.source_node && conn.destination_node)
    .map((conn) => ({
      id: conn.id,
      positions: [
        [
          conn.source_node!.latitude,
          conn.source_node!.longitude,
        ] as LatLngTuple,
        [
          conn.destination_node!.latitude,
          conn.destination_node!.longitude,
        ] as LatLngTuple,
      ],
      status: conn.connection_status || "unknown",
    }));

  // ====== Curved Lines into HQ ======
  const inboundCurves: (BezierCurve & { id: string; nodeId?: number })[] =
    nodeData
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
          nodeId: node.id,
          ...curve,
        };
      });

  // ICON
  const getNodeIcon = (node: NodeGet) => {
    if (
      node.name &&
      node.name.toUpperCase().includes("RTARF INTERNAL NODE - HQ01")
    ) {
      return redAlertIcon;
    }

    if (
      node.node_type &&
      node.node_type.toUpperCase() === "RTARF_INTERNAL_NODE"
    ) {
      return redAlertIcon;
    }

    return yellowIcon;
  };

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
      center={[15.87, 100.9925]}
      zoom={6}
      minZoom={4}
      maxZoom={18}
      className="w-full h-full rounded-lg"
      style={{ backgroundColor: "black" }}
    >
      {/* Layers */}
      <TileLayer
        attribution="&copy; OpenStreetMap & CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
        opacity={0.1}
      />

      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />

      {onBoundsChange && <MapBoundsTracker onBoundsChange={onBoundsChange} />}

      <FocusOnSelected node={selectedNode ?? null} />

      {/* Node Markers */}
      {nodeData.map((node) => {
        const isSelected =
          selectedNode && node.id != null && node.id === selectedNode.id;

        return (
          <React.Fragment key={node.id}>
            <Marker
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

            {isSelected && (
              <CircleMarker
                center={[node.latitude, node.longitude]}
                radius={12}
                pathOptions={{
                  color: "#00FFFF",
                  weight: 2,
                  opacity: 0.8,
                }}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Straight Lines */}
      {connectionLines.map((line) => (
        <Polyline
          key={line.id}
          positions={line.positions}
          pathOptions={{
            color: getLineColor(line.status),
            weight: 1.5,
            opacity: 0.5,
          }}
        />
      ))}

      {/* Curved Lines */}
      {inboundCurves.map((curve) => {
        const isForSelected =
          selectedNode && curve.nodeId != null && curve.nodeId === selectedNode.id;

        return (
          <React.Fragment key={curve.id}>
            <Polyline
              positions={curve.points}
              pathOptions={{
                color: "#00FFFF",
                weight: isForSelected ? 4 : 3,
                opacity: isForSelected ? 0.35 : 0.22,
              }}
            />

            <Polyline
              positions={curve.points}
              pathOptions={{
                color: "#AFFFFF",
                weight: isForSelected ? 2 : 1.4,
                opacity: 0.95,
              }}
            />

            <MovingDot
              start={curve.start}
              end={curve.end}
              control={curve.control}
              durationMs={isForSelected ? 2800 : 3500}
            />
          </React.Fragment>
        );
      })}

      {/* ✅ Popup แสดงรายละเอียด node ที่เลือกแบบในรูป */}
      {selectedNode && (
        <Popup
          position={[selectedNode.latitude, selectedNode.longitude]}
          autoPan={true}
          closeButton={true}
          autoClose={false}
          closeOnClick={false}
        >
          <div className="text-sm">
            <strong>{selectedNode.name}</strong>
            <br />
            IP: {selectedNode.ip_address || "N/A"}
            <br />
            Type: {selectedNode.node_type || "-"}
          </div>
        </Popup>
      )}
    </MapContainer>
  );
};

export default MapView;
