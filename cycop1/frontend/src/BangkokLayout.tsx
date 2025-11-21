// src/BangkokLayout.tsx
import { useState } from "react";
import type L from "leaflet";

import DefconBangkok from "./components/bangkoks/DefconBangkok";
import BangkokThreat from "./components/bangkoks/BangkokThreat";
import MapViewBangkok from "./components/bangkoks/MapViewBangkok";
import OverlayListBangkok from "./components/bangkoks/OverLaylistBangkok";

import type { NodeGet } from "./types/defensive";
import "./index.css";

const BangkokLayout = () => {
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  // state กลาง เอาไว้เก็บ node ที่ถูกเลือก สำหรับส่งไปให้ SITREP / DEFCON
  const [selectedNode, setSelectedNode] = useState<NodeGet | null>(null);

  return (
    <div className="bg-black h-screen relative overflow-hidden">
      {/* ซ้าย – Overlay + minimap */}
      <div className="fixed left-0 top-0 h-auto z-40 w-60">
        <OverlayListBangkok
          mainMapBounds={mapBounds}
          // เมื่อคลิก node จาก overlay → อัปเดต selectedNode
          onNodeClick={(node) => setSelectedNode(node)}
          selectedNode={selectedNode}
        />
      </div>

      {/* กลาง – แผนที่ */}
      <div className="ml-60 mr-60 h-full pb-[260px] overflow-auto">
        <MapViewBangkok
          onBoundsChange={setMapBounds}
          // ถ้าคลิก marker บนแผนที่ ให้ SITREP/DEFCON เปลี่ยนด้วย
          onNodeClick={(node) => setSelectedNode(node)}
        />
      </div>

      {/* ขวา – DEFCON + THREAT DISTRIBUTION + SITREP (อยู่ใน DefconBangkok) */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-60">
        <DefconBangkok selectedNode={selectedNode} />
      </div>

      {/* ล่าง – Bangkok Threat แนวนอน (เหมือนเดิม) */}
      <div className="fixed bottom-0 right-59 z-30 bg-black border-t border-gray-900 p-1 h-[260px]">
        <div className="flex items-center gap-2 h-full">
          <div className="flex-shrink-0 custom-scroll">
            <BangkokThreat
              title="กองบัญชาการกองทัพไทย"
              filterSeverity="all"
              logoPath="../public/img/บก.ทท.png"
              backgroundColor="bg-yellow-700"
              borderColor="border-gray-700"
            />
          </div>
          <div className="flex-shrink-0 custom-scroll">
            <BangkokThreat
              title="กองทัพบก"
              filterSeverity="medium"
              logoPath="../public/img/ทบ.png"
              backgroundColor="bg-green-700"
              borderColor="border-gray-700"
            />
          </div>
          <div className="flex-shrink-0 custom-scroll">
            <BangkokThreat
              title="กองทัพอากาศ"
              filterSeverity="high"
              logoPath="../public/img/ทอ.png"
              backgroundColor="bg-blue-600"
              borderColor="border-gray-700"
            />
          </div>
          <div className="flex-shrink-0 custom-scroll">
            <BangkokThreat
              title="กองทัพเรือ"
              filterSeverity="low"
              logoPath="../public/img/ทร.png"
              backgroundColor="bg-blue-900"
              borderColor="border-gray-700"
            />
          </div>
          <div className="flex-shrink-0 custom-scroll">
            <BangkokThreat
              title="สำนักงานตำรวจแห่งชาติ"
              filterSeverity="all"
              logoPath="../public/img/ตอ.png"
              backgroundColor="bg-red-800"
              borderColor="border-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BangkokLayout;
