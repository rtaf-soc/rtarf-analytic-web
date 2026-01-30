import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import CreateNode from "./components/CreateNode.tsx";
import MainLayout from "./MainLayout.tsx";
import BangkokLayout from "./BangkokLayout.tsx";
import MitreAttackNavigator from "./pages/mitre-framework/index.tsx";
import OrgSummary from "./components/bangkoks/OrgSummary.tsx";
import ThreatDetail from "./components/threatdetail/ThreatDetailLayout.tsx";
import App from "./App.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <MainLayout /> },
      { path: "/defcon1", element: <MainLayout /> },
    ],
  },
  {
    path: "/mitre1",
    element: <App />,
    children: [{ index: true, element: <MitreAttackNavigator /> }],
  },
  
  {
    path: "/bangkok",
    element: <BangkokLayout />,
  },

  {
    path: "/threatdetail",
    element: <ThreatDetail />,
  },
  {
    path: "/orgsum",
    element: <OrgSummary />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);