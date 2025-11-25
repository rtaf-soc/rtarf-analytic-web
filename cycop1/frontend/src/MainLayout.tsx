import { useState } from "react";
import Defcon from "./components/Defcon";
import OverlayList from "./components/OverlayList";
import MapView from "./components/MapView";
import React from "react";
import "leaflet/dist/leaflet.css"; // Import Leaflet CSS if available, or ignore
import L from "leaflet";
import "./index.css";

const MainLayout = () => {
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  return (
    <div className="bg-black h-screen relative overflow-hidden">
      {/* ซ้าย - Sidebar */}
      <OverlayList
        mainMapBounds={mapBounds}
        selectedLayerValue={selectedLayer}
        onLayerChange={setSelectedLayer}
      />

      {/* เนื้อหากลาง - Main Map */}
      <div
        className="fixed left-60 top-0 bottom-0 h-full"
        style={{ right: "240px" }}
      >
        {/* left-60 = 240px (Sidebar), right = ปรับตามขนาดจริงของ Defcon */}
        <MapView
          onBoundsChange={setMapBounds}
          selectedLayer={selectedLayer}
        />
      </div>

      {/* ขวา - Defcon panel */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <Defcon />
      </div>
    </div>
  );
};

export default MainLayout;
