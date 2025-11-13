import { Outlet } from "react-router-dom";
import OverlayList from "./Components/OverlayList";
import DefconBangkok from "./Components/bangkoks/DefconBangkok"
import BangkokThreat from "./Components/bangkoks/BangkokThreat";

import "./index.css";
import OverlayListBangkok from "./Components/bangkoks/OverLaylistBangkok";

const BangkokLayout = () => {
  return (
    <div className="bg-black h-screen relative overflow-hidden">
      {/*ซ้าย*/}
      <div className="fixed left-0 top-0 h-full z-40 w-60">
        <OverlayListBangkok />
      </div>

      {/*เนื้อหากลาง*/}
      <div className="ml-60 mr-60 h-full pb-[260px] overflow-auto">
        <Outlet />
      </div>

      {/* ขวา */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-60">
        <DefconBangkok />
      </div>

      {/* ล่าง - Bangkok Threat แนวนอน */}
      <div className="fixed bottom-0 left-60 right-60 z-30 bg-black border-t border-gray-800 p-1 h-[260px]">
        <div className="flex items-center justify-center gap-1 overflow-x-auto h-full">
          
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
