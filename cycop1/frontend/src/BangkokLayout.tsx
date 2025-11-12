import { useState } from "react";
import { Outlet } from "react-router-dom";
import Defcon from "./Components/Defcon";
import OverlayList from "./Components/OverlayList";
import CreateNode from "./Components/CreateNode";
import BangkokThreat from "./Components/BangkokThreat";
import { CirclePlus, X } from "lucide-react";

import "./index.css";

const MainLayout = () => {
  const [isNodeOpen, setIsNodeOpen] = useState(false);

  return (
    <div className="bg-black h-screen relative">
      {/*ซ้าย*/}
      <div className="fixed left-0 top-0 h-full z-40">
        <OverlayList />
      </div>

      {/*เนื้อหากลาง*/}
      <div className="ml-59 mr-58 h-full pb-[240px]">
        {" "}
        {/* เพิ่ม pb-64 เพื่อเว้นพื้นที่ให้ bottom bar */}
        <Outlet />
      </div>

      {/* ปุ่มสำหรับเพิ่ม Node */}
      <div className="fixed right-6 top-6 z-50">
        <button
          onClick={() => setIsNodeOpen(true)}
          className="flex items-center justify-center h-6 w-6 bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all duration-300 group"
          title="Create Node"
        >
          <CirclePlus className="text-white w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Modal สำหรับ Create Node */}
      {isNodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsNodeOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsNodeOpen(false)}
              className="fixed top-4 right-4 z-20 flex items-center justify-center h-10 w-10 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-all group"
              title="Close"
            >
              <X className="text-red-400 w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* CreateNode Component */}
            <CreateNode />
          </div>
        </div>
      )}

      {/* ขวา */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <Defcon />
      </div>

      {/* ล่าง - Bangkok Threat แนวนอน */}
      <div className="fixed bottom-0 left-35 right-35 z-30 bg-black border-t border-gray-800">
        <div className="flex items-center justify-center gap-1 p-2 overflow-x-auto">
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
