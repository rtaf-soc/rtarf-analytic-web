// src/MainLayout.tsx (หรือ path ตามโปรเจกต์คุณ)
import { useState } from "react";
import Defcon from "./components/Defcon";
import OverlayList from "./components/OverlayList";
import MapView from "./components/MapView";
import L from "leaflet";
import "./index.css";
import type { NodeGet } from "./types/defensive";  // 👈 เพิ่ม import type

const MainLayout = () => {
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  // 👇 state ตรงกลาง เก็บ node ที่ถูกเลือกจาก OVERLAY LIST
  const [selectedNode, setSelectedNode] = useState<NodeGet | null>(null);

  return (
    <div className="bg-black h-screen relative overflow-hidden">
      {/* ซ้าย - Sidebar */}
      <OverlayList
        mainMapBounds={mapBounds}     // ถ้าอยากใช้ bounds ใน OverlayList ภายหลัง
        onSelectNode={setSelectedNode} // ✅ สำคัญ: ส่ง callback ให้ OverlayList
      />

      {/* เนื้อหากลาง - Main Map */}
      <div
        className="fixed left-60 top-0 bottom-0 h-full"
        style={{ right: "240px" }}
      >
        {/* left-60 = 240px (Sidebar), right = กว้าง panel ขวา */}
        <MapView
          onBoundsChange={setMapBounds}
          selectedNode={selectedNode}   // ✅ สำคัญ: ส่ง node ที่เลือกเข้า MapView
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
