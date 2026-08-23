import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./styles.css";
import Admin from "./pages/Admin";
import AdminNew from "./pages/AdminNew";
import AdminQuote from "./pages/AdminQuote";
import Sign from "./pages/Sign";
import AuthGate from "./components/AuthGate";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/admin" replace /> },
  { path: "/admin", element: <AuthGate><Admin /></AuthGate> },
  { path: "/admin/new", element: <AuthGate><AdminNew /></AuthGate> },
  { path: "/admin/q/:id", element: <AuthGate><AdminQuote /></AuthGate> },
  { path: "/s/:token", element: <Sign /> },
  { path: "*", element: <Navigate to="/admin" replace /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
