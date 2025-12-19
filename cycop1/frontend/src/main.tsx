import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import CreateNode from "./components/CreateNode.tsx";
import MainLayout from "./MainLayout.tsx";
import BangkokLayout from "./BangkokLayout.tsx";
import MitreAttackNavigator from "./pages/mitre-framework/index.tsx";
import ThreatDetail from "./components/threatdetail/ThreatDetailLayout.tsx";
import App from "./App.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <MainLayout /> }, // ควรเปลี่ยนเป็น Dashboard Component จริงๆ ในอนาคต
      { path: "/node-create", element: <CreateNode /> },
      { path: "/defcon1", element: <MainLayout /> },
    ],
  },
  {
    path: "/node-create",
    element: <App />,
    children: [{ index: true, element: <CreateNode /> }],
  },
  {
    path: "/mitre1",
    element: <App />,
    children: [{ index: true, element: <MitreAttackNavigator /> }],
  },
  
  // ✅ แก้ไข: ลบ children ที่ซ้ำซ้อนออก
  {
    path: "/bangkok",
    element: <BangkokLayout />,
  },

  // ✅ แก้ไข: ลบ children ที่ซ้ำซ้อนออก
  {
    path: "/threatdetail",
    element: <ThreatDetail />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);