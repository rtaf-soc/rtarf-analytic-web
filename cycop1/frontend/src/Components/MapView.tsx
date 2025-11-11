import React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../index.css";

// ไอคอน threat สีแดง/เหลือง
const redIcon = new L.Icon({
  iconUrl: "/img/warning.png",
  iconSize: [24, 24],
  
});

const yellowIcon = new L.Icon({
  iconUrl: "/img/warning.png",
  iconSize: [24, 24],
});

const MapView = () => {
  // พิกัดตัวอย่าง threat (กรุงเทพ, เชียงใหม่, สงขลา, โคราช, ขอนแก่น)
  const threats: { name: string; coords: [number, number]; color: string }[] = [
    { name: "THREAT 1", coords: [13.7563, 100.5018], color: "red" }, // กรุงเทพ
    { name: "THREAT 2", coords: [18.7883, 98.9853], color: "yellow" }, // เชียงใหม่
    { name: "THREAT 3", coords: [7.0096, 100.4762], color: "yellow" }, // สงขลา
    { name: "THREAT 4", coords: [14.9799, 102.0977], color: "yellow" }, // โคราช
    { name: "THREAT 5", coords: [16.4419, 102.835], color: "yellow" }, // ขอนแก่น
  ];

  // เส้นเชื่อม (polyline)
  const connections = [
    [threats[0].coords, threats[1].coords],
    [threats[0].coords, threats[3].coords],
    [threats[3].coords, threats[4].coords],
    [threats[0].coords, threats[2].coords],
  ];

  return (
    <MapContainer
      center={[15.87, 100.9925]} // Thailand center
      zoom={6}
      className="w-full h-full rounded-lg"
      style={{ backgroundColor: "black" }}
    >
      {/* 🌊 พื้นหลังกรมท่าเข้ม */}
      <TileLayer
        attribution="&copy; OpenStreetMap & CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
        opacity={0.1}
      />
      
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />

      {/* 🔴 วาง Threat จุดต่าง ๆ */}
      {threats.map((t, idx) => (
        <Marker
          key={idx}
          position={t.coords}
          icon={t.color === "red" ? redIcon : yellowIcon}
        >
          <Popup>{t.name}</Popup>
        </Marker>
      ))}

      {/* วาดเส้นเชื่อมโยง */}
      {connections.map((line, idx) => (
        <Polyline
          key={idx}
          positions={line}
          pathOptions={{ color: "#32CD32", weight: 2 }}
        />
      ))}
    </MapContainer>
  );
};

export default MapView;
