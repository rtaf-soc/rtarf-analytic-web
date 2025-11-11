import { useState } from "react";
import { Outlet, Navigate} from "react-router-dom";
import Defcon from "./components/Defcon";
import OverlayList from "./components/OverlayList";
import CreateNode from "./components/CreateNode";
import { CirclePlus, X } from 'lucide-react';

import "./index.css";

const MainLayout = () => {
  const [isNodeOpen, setIsNodeOpen] = useState(false);

  return (
    <div className="bg-black h-screen relative">
      {/*ซ้าย*/}
      <OverlayList />

      {/*เนื้อหากลาง*/}
      <div className="ml-59 mr-58 h-full">
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
    </div>
  );
};

export default MainLayout;