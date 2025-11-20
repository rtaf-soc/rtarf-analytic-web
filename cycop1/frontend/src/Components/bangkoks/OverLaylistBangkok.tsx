// src/components/bangkoks/OverLaylistBangkok.tsx
import L from "leaflet";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";
import {
  MapContainer,
  Marker,
  Rectangle,
  TileLayer,
  useMap,
} from "react-leaflet";
import { GetAllBangkokNode } from "../../services/defensiveService";
import type { NodeGet } from "../../types/defensive";

// Component สำหรับแสดง viewport rectangle บน minimap
const MinimapBounds = ({
  parentBounds,
}: {
  parentBounds: L.LatLngBounds | null | undefined;
}) => {
  const map = useMap();

  useEffect(() => {
    if (parentBounds) {
      map.fitBounds(parentBounds, { padding: [10, 10] });
    }
  }, [parentBounds, map]);

  return parentBounds ? (
    <Rectangle
      bounds={parentBounds}
      pathOptions={{
        color: "#10b981",
        weight: 2,
        fillOpacity: 0.15,
        fillColor: "#10b981",
      }}
    />
  ) : null;
};

interface OverlayListProps {
  mainMapBounds?: L.LatLngBounds | null;
  // ✅ เพิ่ม callback + state สำหรับ SITREP
  onNodeClick?: (node: NodeGet) => void;
  selectedNode?: NodeGet | null;
}

const OverlayListBangkok: React.FC<OverlayListProps> = ({
  mainMapBounds,
  onNodeClick,
  selectedNode,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [nodes, setNodes] = useState<NodeGet[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [nodeError, setNodeError] = useState<string | null>(null);

  // อัปเดตเวลา
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ดึงข้อมูล node จาก /nodes-bangkok/
  useEffect(() => {
    const fetchBangkokNodes = async () => {
      try {
        setLoadingNodes(true);
        setNodeError(null);
        const data = await GetAllBangkokNode();
        setNodes(data);
      } catch (err: any) {
        console.error("Failed to fetch Bangkok nodes:", err);
        setNodeError("ไม่สามารถดึงข้อมูลโหนดในกรุงเทพฯได้");
      } finally {
        setLoadingNodes(false);
      }
    };

    fetchBangkokNodes();
  }, []);

  const formatDate = (date: Date): string => {
    const days: string[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months: string[] = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    return `${days[date.getDay()]} ${date.getDate()} ${
      months[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", { hour12: false });
  };

  // Thailand marker สำหรับ minimap
  const thailandIcon = new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width: 10px; height: 10px; background: #10b981; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 10px #10b981;"></div>`,
    iconSize: [10, 10],
  });

  const topNodes = nodes.slice(0, 5);

  return (
    <div className="fixed left-0 top-0 h-auto w-60 bg-black text-white p-1 border-r-2 border-black flex flex-col overflow-y-auto">
      {/* Logo + datetime */}
      <div className="bg-black rounded-lg p-2 mb-2 border border-black">
        <div className="flex justify-center mb-1">
          <div className="w-30 h-12 flex items-center justify-center">
            <div className="text-center mt-6">
              <img
                src="img/rtarf.png"
                alt="RTARF Logo"
                className="w-32 h-auto mx-auto object-contain animate-flip-rotate"
              />
            </div>
          </div>
        </div>
        <div className="text-center mt-8">
          <div className="text-[15px] text-gray-300 font-bold">
            {formatDate(currentTime)}
          </div>
          <div className="text-sm font-mono font-bold text-white">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* Minimap */}
      <div className="bg-slate-700 rounded p-1 relative overflow-hidden border-8 border-gray-500 mb-1">
        <MapContainer
          center={[15.87, 100.99]}
          zoom={5}
          className="w-full h-24 rounded"
          style={{ backgroundColor: "#1e293b" }}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            opacity={0.5}
          />

          <Marker position={[13.7563, 100.5018]} icon={thailandIcon} />

          <MinimapBounds parentBounds={mainMapBounds} />
        </MapContainer>
      </div>

      {/* Glow Effect */}
      <div
        className="absolute rounded-full bg-green-400 opacity-50 blur-sm"
        style={{
          left: "calc(73% - 3px)",
          top: "calc(48% - 3px)",
          width: "12px",
          height: "12px",
        }}
      />

      {/* OVERLAY LIST + Bangkok nodes */}
      <div className="bg-black rounded-lg p-2 mb-2 border-8 border-gray-500 flex-shrink-0 w-57">
        <div className="text-[15px] font-bold mb-1.5 text-white border-b border-gray-600 pb-1 flex justify-center">
          OVERLAY LIST
        </div>

        {/* Header Bangkok nodes */}
        <div className="text-[13px] font-semibold text-white mb-1 flex justify-between items-center">
          {loadingNodes && (
            <span className="text-[10px] text-gray-400">Loading...</span>
          )}
        </div>

        {nodeError && (
          <div className="text-[11px] text-red-400 mb-1">{nodeError}</div>
        )}

        {!loadingNodes && !nodeError && topNodes.length === 0 && (
          <div className="text-[12px] text-gray-400 mb-1">
            No nodes in Bangkok yet.
          </div>
        )}

        {/* ✅ รายการ node + checkbox ด้านหน้า
            เมื่อคลิกที่ทั้งแถว → onNodeClick(node) */}
        <div className="space-y-1 max-h-29.5 overflow-y-auto mt-1 custom-scroll">
          {topNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onNodeClick && onNodeClick(node)}
                className={`w-full flex items-center gap-2 px-1.5 py-1 text-left text-[11px] rounded border ${
                  isSelected
                    ? "border-green-400 bg-slate-800"
                    : "border-gray-700 bg-slate-900/60 hover:bg-slate-800"
                } transition-colors`}
              >
                {/* checkbox + สี (ใช้สีฟ้าเป็น default) */}
                <div className="flex items-center justify-center w-3 h-3 border border-gray-400 rounded-[2px] bg-black">
                  {isSelected && <Check className="w-2 h-2 text-green-400" />}
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="font-semibold text-green-300 truncate">
                    {node.name}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-300">
                    <span>{node.node_type}</span>
                    {node.ip_address && (
                      <span className="text-blue-300">
                        {String(node.ip_address)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ปุ่ม control ด้านล่างเหมือนเดิม */}
        <div className="flex gap-1 mt-2 pt-2 border-t border-gray-600">
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>🔍</span>
          </button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>📁</span>
          </button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>💾</span>
          </button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px]">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverlayListBangkok;
