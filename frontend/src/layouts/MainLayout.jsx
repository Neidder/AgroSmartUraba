import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "../styles/Tema.css";
import "../utils/preferencias"; // aplica las preferencias guardadas al abrir la aplicación
import "../styles/MainLayout.css";

function MainLayout() {
  return (
    <div className="ml-shell">
      <Sidebar />
      <div className="ml-body">
        <Topbar notificaciones={0} />
        <main className="ml-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;