import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import CreateNode from "./components/CreateNode.tsx";
import MainLayout from "./MainLayout.tsx";
import MapView from "./components/MapView.tsx";
import MitreAttackNavigator from "./pages/mitre-framework/index.tsx";
import App from "./App.tsx";


const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <MainLayout /> },
      { path: "/node-create", element: <CreateNode/>} ,
      { path: "/cycop1", element: <MapView/> },
    ],
  },

  {
    path: "/mitre1",
    element: <App />,
    children: [
      {index: true, element: <MitreAttackNavigator />},
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

