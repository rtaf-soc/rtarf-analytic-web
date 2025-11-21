import { useState } from "react";
import Defcon from "./components/Defcon";
import OverlayList from "./components/OverlayList";
import MapView from "./components/MapView";
import L from "leaflet";
import "./index.css";
import type { NodeGet } from "./types/defensive";

const MainLayout = () => {
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeGet | null>(null);

  return (
    <div className="bg-black h-screen relative overflow-hidden">
      {/* ซ้าย - Sidebar */}
      <OverlayList
        mainMapBounds={mapBounds}
        onSelectNode={setSelectedNode}
      />

      {/* เนื้อหากลาง - Main Map */}
      <div
        className="fixed left-60 top-0 bottom-0 h-full"
        style={{ right: "240px" }}
      >
        <MapView
          onBoundsChange={setMapBounds}
          selectedNode={selectedNode}
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
