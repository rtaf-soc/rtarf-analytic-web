import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../../frontend/src/index.css";

// ไอคอนสำหรับแต่ละประเภท node
const routerIcon = new L.Icon({
  iconUrl: "/img/blue-router.png",
  iconSize: [24, 24],
});

const serverIcon = new L.Icon({
  iconUrl: "/img/warning.png",
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

const MapView: React.FC<MapViewProps> = ({ onBoundsChange, selectedLayer }) => {
  const [nodeData, setNodeData] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLayer) return; // ถ้าไม่มี layer เลือก → ไม่ fetch
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

  // สร้างคู่ nodeId เพื่อกรอง duplicate links
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
      <TileLayer
        attribution="&copy; OpenStreetMap & CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <TileLayer
        url="https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
        opacity={0.1}
      />
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

      {/* Render links */}
      {nodeData.map((node) =>
        node.links.map((linkedNodeId) => {
          const targetNode = nodeData.find((n) => n.id === linkedNodeId);
          if (!targetNode) return null;

          const key = getLinkKey(node.id, linkedNodeId);
          if (linkPairs.has(key)) return null; // skip duplicate
          linkPairs.add(key);

          return (
            <Polyline
              key={key}
              positions={[
                [node.latitude, node.longitude],
                [targetNode.latitude, targetNode.longitude],
              ]}
              pathOptions={{
                color: "#AFFFFF",
                weight: 3, // ลดจาก 2 → 1.4
                opacity: 2,
              }}
              className="link-line-inner"
            />
          );
        })
      )}

      {/* Render nodes */}
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
