import { useState } from "react";
import { Outlet } from "react-router-dom";
import Defcon from "./components/Defcon";
import OverlayList from "./components/OverlayList";

import "./index.css";

const MainLayout = () => {
  return (
    <div className="bg-black h-screen relative">
      {/*ซ้าย*/}
      <OverlayList />

      {/*เนื้อหากลาง*/}
      <div className="ml-59 mr-58 h-full">
        <Outlet />
      </div>
      
      {/* ขวา */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <Defcon />
      </div>
    </div>
  );
};

export default MainLayout;