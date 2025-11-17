import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import React from "react";
import ReactDOM from "react-dom/client";
import CreateNode from "./components/CreateNode.tsx";
import MainLayout from "./MainLayout.tsx";
import BangkokLayout from "./BangkokLayout.tsx";
import MitreAttackNavigator from "./pages/mitre-framework/index.tsx";
import App from "./App.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <MainLayout /> },
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

  {
    path: "/bangkok",
    element: <BangkokLayout />,
    children: [{ index: true, element: <BangkokLayout /> }],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
