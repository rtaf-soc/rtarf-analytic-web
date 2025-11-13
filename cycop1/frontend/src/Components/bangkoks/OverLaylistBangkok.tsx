import L from "leaflet";
import { useState, useEffect } from "react";
import { MapContainer, Marker, Rectangle, TileLayer, useMap } from "react-leaflet";


// Component สำหรับแสดง viewport rectangle บน minimap
const MinimapBounds = ({ parentBounds }: { parentBounds: L.LatLngBounds | null | undefined }) => {
  const map = useMap();

  useEffect(() => {
    if (parentBounds) {
      // ปรับ minimap ให้เห็นทั้ง bounds ของ main map
      map.fitBounds(parentBounds, { padding: [10, 10] });
    }
  }, [parentBounds, map]);

  return parentBounds ? (
    <Rectangle
      bounds={parentBounds}
      pathOptions={{
        color: '#10b981',
        weight: 2,
        fillOpacity: 0.15,
        fillColor: '#10b981',
      }}
    />
  ) : null;
};

interface OverlayListProps {
  mainMapBounds?: L.LatLngBounds | null;
}

const OverlayListBangkok: React.FC<OverlayListProps> = ({ mainMapBounds }) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]
      } ${date.getFullYear()}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", { hour12: false });
  };

  // Thailand marker สำหรับ minimap
  const thailandIcon = new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="width: 10px; height: 10px; background: #10b981; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 10px #10b981;"></div>`,
    iconSize: [10, 10],
  });


  return (
    <div className="fixed left-0 top-0 h-auto w-60 bg-black text-white p-1 border-r-2 border-black flex flex-col">
      {/* Logo and DateTime */}
      <div className="bg-black rounded-lg p-2 mb-2 border border-black">
        <div className="flex justify-center mb-1">
          <div className="w-30 h-12 flex items-center justify-center">
            <div className="text-center mt-6">
              <img src="img/rtarf.png" alt="RTARF Logo" />
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

      {/* Minimap แสดง bounds ของ main map */}
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

          {/* Thailand marker */}
          <Marker position={[13.7563, 100.5018]} icon={thailandIcon} />

          {/* แสดงกรอบ viewport ของ main map */}
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
    </div>

  );
};

export default OverlayListBangkok;
