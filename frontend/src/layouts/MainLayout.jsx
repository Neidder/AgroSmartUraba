
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/Dashboard.css";
import "../styles/MainLayout.css";

function MainLayout() {
  return (
    <div className="agro-dashboard">
      <Sidebar />
      <main className="agro-main">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
