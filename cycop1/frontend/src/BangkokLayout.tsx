import { Outlet } from "react-router-dom";
import OverlayList from "./components/OverlayList";
import DefconBangkok from "./components/bangkoks/DefconBangkok"
import BangkokThreat from "./components/bangkoks/BangkokThreat";

import "./index.css";

const MainLayout = () => {

  return (
    <div className="bg-black h-screen relative">
      {/*ซ้าย*/}
      <div className="fixed left-0 top-0 h-full z-40">
        <OverlayList />
      </div>

      {/*เนื้อหากลาง*/}
      <div className="ml-59 mr-58 h-full pb-[240px]">
        {" "}
        {/*เพิ่ม pb-64 เพื่อเว้นพื้นที่ให้ bottom bar */}
        <Outlet />
      </div>

      {/* ขวา */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <DefconBangkok />
      </div>

      {/* ล่าง - Bangkok Threat แนวนอน */}
      <div className="fixed bottom-0 p-1 left-38 right-35 z-30 bg-black border-t border-gray-800">
        <div className="flex items-center justify-center gap-1 overflow-x-auto">
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพบก"
              filterSeverity="high"
              logoPath="../public/img/ทบ.png"
            />
          </div>
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพอากาศ"
              filterSeverity="high"
              logoPath="../public/img/ทอ.png"
            />
          </div>
          <div className="flex-shrink-0">
            <BangkokThreat
              title="กองทัพเรือ"
              filterSeverity="high"
              logoPath="../public/img/ทร.png"
            />
          </div>
          <div className="flex-shrink-0">
            <BangkokThreat
              title="บช.สอท"
              filterSeverity="high"
              logoPath="../public/img/บช.สอท.png"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
