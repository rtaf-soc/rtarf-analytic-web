import { Outlet } from "react-router-dom";
import DefconBangkok from "./components/bangkoks/DefconBangkok"
import BangkokThreat from "./components/bangkoks/BangkokThreat";
import MapViewBangkok from "./components/bangkoks/MapViewBangkok";

import "./index.css";
import OverlayListBangkok from "./components/bangkoks/OverLaylistBangkok";
import { useState } from "react";

const BangkokLayout = () => {
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  return (
    <div className="bg-black h-screen relative overflow-hidden">
      {/*ซ้าย*/}
      <div className="fixed left-0 top-0 h-auto z-40 w-60">
        <OverlayListBangkok mainMapBounds={mapBounds} />
      </div>

      {/*เนื้อหากลาง*/}
      <div className="ml-60 mr-60 h-full pb-[260px] overflow-auto">
        <MapViewBangkok onBoundsChange={setMapBounds} />
      </div>

      {/* ขวา */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-60">
        <DefconBangkok />
      </div>

      {/* ล่าง - Bangkok Threat แนวนอน */}
      <div className="fixed bottom-0 right-60 z-30 bg-black border-t border-gray-900 p-1 h-[260px]">
        <div className="flex items-center gap-1 h-full">
          <div className="flex-shrink-0">
            <BangkokThreat
              title="บก.ทท."
              filterSeverity="high"
              logoPath="../public/img/บก.ทท.png"
              backgroundColor="bg-yellow-700"
              borderColor="border-gray-700"
            />
          </div>
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพบก"
              filterSeverity="high"
              logoPath="../public/img/ทบ.png"
              backgroundColor="bg-green-700"
              borderColor="border-gray-700"
            />
          </div>
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพอากาศ"
              filterSeverity="high"
              logoPath="../public/img/ทอ.png"
              backgroundColor="bg-blue-600"
              borderColor="border-gray-700"
            />
          </div>
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพเรือ"
              filterSeverity="high"
              logoPath="../public/img/ทร.png"
              backgroundColor="bg-blue-900"
              borderColor="border-gray-700"
            />
          </div>
          <div className="flex-shrink-0">
            <BangkokThreat
              title="สำนักงานตำรวจแห่งชาติ"
              filterSeverity="high"
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
