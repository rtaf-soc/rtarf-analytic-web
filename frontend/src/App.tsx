import React from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Defcon from "./Components/Defcon";
import MapView from "./Components/MapView";
import OverlayList from "./Components/OverlayList";
import "./index.css";

// Layout หลัก (Sidebar ซ้าย + Defcon ขวา)
const MainLayout = () => {
  return (
    <div className="bg-black h-screen relative">
      {/* ซ้าย */}
      <OverlayList />

      {/* เนื้อหากลาง */}
      <div className="ml-59 mr-58 h-full">
        <Outlet />
      </div>

      {/* ขวา */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <Defcon />
      </div>
    </div>
  );
};

// กำหนด route
const App = () => {
  return (
    <Routes>
      {/* 🔸 redirect หน้า "/" ให้ไป "/cycop1" */}
      <Route path="/" element={<Navigate to="/cycop1" replace />} />

      {/* 🔹 main layout อยู่ใน path /cycop1 */}
      <Route path="/cycop1" element={<MainLayout />}>
        <Route index element={<MapView />} />  {/* /cycop1 */}
      </Route>

      <Route path="/mitre1" element={<MainLayout />}>
        <Route index element={<MapView />} />  {/* /mitre1 */}
      </Route>
    </Routes>
  );
};

export default App;
