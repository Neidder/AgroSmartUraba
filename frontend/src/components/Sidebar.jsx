
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

const modulos = [
  { nombre: "Panel principal", ruta: "/dashboard", icono: "▦" },
  { nombre: "Productores", ruta: "/productores", icono: "persona" },
  { nombre: "Fincas", ruta: "/fincas", icono: "⌂" },
  { nombre: "Cultivos", ruta: "/cultivos", icono: "platano" },
  { nombre: "Actividades", ruta: "/actividades", icono: "▤" },
  { nombre: "Cosechas", ruta: "/cosechas", icono: "platano" },
  { nombre: "Ventas", ruta: "/ventas", icono: "$" },
  { nombre: "Economía", ruta: "/economia", icono: "$" },
];

function IconoAgro({ tipo }) {
  if (tipo === "persona") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="7" r="4" fill="currentColor" />
        <path
          d="M4 21v-2a8 8 0 0 1 16 0v2z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (tipo === "platano") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 22V9M12 15C5 15 3 10 4 5c4 1 7 4 8 8M12 12c0-5 3-8 8-9 0 5-2 9-8 11M12 8C9 5 9 2 10 1c3 2 4 4 4 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 22C8 20 7 17 8 14M12 22c4-3 5-6 4-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (tipo === "usuarios") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M19.4 13a7.7 7.7 0 0 0 0-2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.8a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.8a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          transform="translate(-1 -1) scale(1.04)"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  return <span>{tipo}</span>;
}

function Sidebar() {
  const navigate = useNavigate();

  let usuario = {};

  try {
    usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  } catch {
    usuario = {};
  }

  const esAdministrador = usuario.rol === "ADMINISTRADOR";
  const nombreUsuario =
    usuario.nombre || usuario.first_name || usuario.username || "Usuario";

  function cerrarSesion() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  }

  return (
    <aside className="agro-sidebar">
      <div className="agro-brand">
        <div className="agro-brand-icon">🌿</div>
        <div>
          <h2>AgroSmart</h2>
          <span>URABÁ</span>
        </div>
      </div>

      <p className="agro-menu-label">MENÚ PRINCIPAL</p>

      <nav className="agro-navigation">
        {modulos.map((modulo) => (
          <NavLink
            key={modulo.ruta}
            to={modulo.ruta}
            end
            className={({ isActive }) =>
              `agro-nav-link ${isActive ? "agro-nav-active" : ""}`
            }
          >
            <span className="agro-nav-icon">
              <IconoAgro tipo={modulo.icono} />
            </span>
            <span>{modulo.nombre}</span>
          </NavLink>
        ))}

        {esAdministrador && (
          <NavLink
            to="/usuarios"
            className={({ isActive }) =>
              `agro-nav-link ${isActive ? "agro-nav-active" : ""}`
            }
          >
            <span className="agro-nav-icon">
              <IconoAgro tipo="usuarios" />
            </span>
            <span>Usuarios</span>
          </NavLink>
        )}
      </nav>

      <div className="agro-sidebar-footer">
        <div className="agro-avatar">
          {nombreUsuario.charAt(0).toUpperCase()}
        </div>

        <div className="agro-user-info">
          <strong>{nombreUsuario}</strong>
          <span>{esAdministrador ? "Administrador" : "Trabajador"}</span>
        </div>

        <button
          className="agro-logout"
          onClick={cerrarSesion}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          ↪
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
