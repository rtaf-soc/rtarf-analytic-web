import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Rectangle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Sitrep from "./SitrepCard";

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
  selectedLayerValue: string | null;
  onLayerChange: (layerValue: string | null) => void;
}

interface LayerItem {
  name: string;
  value: string;
}

const OverlayList: React.FC<OverlayListProps> = ({
  mainMapBounds = null,
  selectedLayerValue,
  onLayerChange,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [overlayItems, setOverlayItems] = useState<LayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // กำหนดสีสำหรับแต่ละ layer
  const layerColors = [
    "bg-blue-700",
    "bg-blue-700",
    "bg-blue-700",
    "bg-blue-700",
    "bg-blue-700",
  ];

  // Timer อัปเดตเวลา
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format วัน/เวลา
  const formatDate = (date: Date): string => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const months = [
      "JAN","FEB","MAR","APR","MAY","JUN",
      "JUL","AUG","SEP","OCT","NOV","DEC",
    ];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", { hour12: false });
  };

  // Fetch layers จาก API
  useEffect(() => {
    const fetchLayers = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/layers");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setOverlayItems(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch layers:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch layers");
      } finally {
        setLoading(false);
      }
    };
    fetchLayers();
  }, []);

  const handleLayerClick = (layerValue: string) => {
    const newValue = selectedLayerValue === layerValue ? null : layerValue;
    onLayerChange(newValue);
  };

  const getLayerColor = (index: number) => layerColors[index % layerColors.length];

  // Thailand marker สำหรับ minimap
  const thailandIcon = new L.DivIcon({
    className: "custom-marker",
    html: `<div style="width: 10px; height: 10px; background: #10b981; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 10px #10b981;"></div>`,
    iconSize: [10, 10],
  });

  return (
    <div className="fixed left-0 top-0 h-screen w-60 bg-slate-800 text-white p-1 border-r-2 border-gray-700 flex flex-col">
      {/* Logo and DateTime */}
      <div className="bg-black rounded-lg p-2 mb-2 border border-gray-700">
        <div className="flex justify-center mb-1">
          <div className="w-30 h-12 flex items-center justify-center">
            <div className="text-center mt-6">
              <img src="img/rtarf.png" alt="" />
            </div>
          </div>
        </div>
        <div className="text-center mt-8">
          <div className="text-[15px] text-gray-300 font-bold">{formatDate(currentTime)}</div>
          <div className="text-sm font-mono font-bold text-white">{formatTime(currentTime)}</div>
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

      {/* Overlay List */}
      <div className="bg-black rounded-lg p-2 mb-1 border-8 border-gray-500 flex-shrink-0 w-57">
        <div className="text-[15px] font-bold mb-1.5 text-white border-b border-gray-600 pb-1 flex justify-center">
          OVERLAY LIST
        </div>
        {loading ? (
          <div className="text-center text-gray-400 text-xs py-2">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-400 text-xs py-2">Error loading layers</div>
        ) : (
          <div className="space-y-1">
            {overlayItems.map((item, index) => {
              const isSelected = selectedLayerValue === item.value;
              const layerColor = getLayerColor(index);

              return (
                <div
                  key={item.value}
                  className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-700 rounded px-1 py-0.5 transition-colors"
                  onClick={() => handleLayerClick(item.value)}
                >
                  <div
                    className={`w-3 h-3 border-2 ${
                      isSelected ? `${layerColor} border-white` : "bg-slate-600 border-gray-400"
                    } rounded-sm flex items-center justify-center flex-shrink-0`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                  <span className={`text-[12px] flex-1 font-bold ${isSelected ? "text-white" : "text-gray-400"}`}>
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Control buttons */}
        <div className="flex gap-1 mt-2 pt-2 border-t border-gray-600">
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px] transition-colors"><span>🔍</span></button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px] transition-colors"><span>📁</span></button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px] transition-colors"><span>💾</span></button>
          <button className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center hover:bg-slate-600 text-[8px] transition-colors"><span>🗑️</span></button>
        </div>
      </div>

      {/* SITREP */}
      <Sitrep />
    </div>
  );
};

export default OverlayList;
