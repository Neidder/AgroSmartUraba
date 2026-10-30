import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Warehouse,
  Sprout,
  ClipboardCheck,
  Wheat,
  ShoppingCart,
  Wallet,
  UserCog,
  Settings,
  LogOut,
  Leaf,
} from "lucide-react";
import { useUsuario } from "../hooks/useUsuario";
import fondoSidebar from "../assets/sidebar-bg.webp";
import "../styles/Sidebar.css";

const modulos = [
  { nombre: "Inicio", ruta: "/dashboard", Icono: Home },
  { nombre: "Productores", ruta: "/productores", Icono: Users },
  { nombre: "Fincas", ruta: "/fincas", Icono: Warehouse },
  { nombre: "Cultivos", ruta: "/cultivos", Icono: Sprout },
  { nombre: "Actividades", ruta: "/actividades", Icono: ClipboardCheck },
  { nombre: "Cosechas", ruta: "/cosechas", Icono: Wheat },
  { nombre: "Ventas", ruta: "/ventas", Icono: ShoppingCart },
  { nombre: "Economía", ruta: "/economia", Icono: Wallet },
];

function Sidebar() {
  const navigate = useNavigate();
  const { esAdministrador } = useUsuario();

  function cerrarSesion() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  }

  const claseLink = ({ isActive }) =>
    `sb-link ${isActive ? "sb-link--active" : ""}`;

  return (
    <aside className="sb" style={{ "--sb-bg": `url(${fondoSidebar})` }}>
      <div className="sb-brand">
        <div className="sb-brand-icon">
          <Leaf size={26} />
        </div>
        <div>
          <h2>AgroSmart Urabá</h2>
          <span>Tecnología que impulsa el campo</span>
        </div>
      </div>

      <nav className="sb-nav">
        {modulos.map(({ nombre, ruta, Icono }) => (
          <NavLink key={ruta} to={ruta} end className={claseLink}>
            <Icono size={19} />
            <span>{nombre}</span>
          </NavLink>
        ))}

        {esAdministrador && (
          <NavLink to="/usuarios" className={claseLink}>
            <UserCog size={19} />
            <span>Usuarios</span>
          </NavLink>
        )}
      </nav>

      <div className="sb-footer">
        <NavLink to="/configuracion" className={claseLink}>
          <Settings size={19} />
          <span>Configuración</span>
        </NavLink>

        <button type="button" className="sb-link sb-logout" onClick={cerrarSesion}>
          <LogOut size={19} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;