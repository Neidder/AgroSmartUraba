
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Dashboard.css";

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

function Dashboard() {
  const [usuario, setUsuario] = useState(null);

  const [indicadores] = useState({
    productores: 0,
    fincas: 0,
    cultivos: 0,
    cosechas: 0,
  });

  useEffect(() => {
    try {
      const usuarioGuardado = localStorage.getItem("usuario");

      if (usuarioGuardado) {
        setUsuario(JSON.parse(usuarioGuardado));
      }
    } catch {
      setUsuario(null);
    }
  }, []);

  const nombreUsuario =
    usuario?.nombre ||
    usuario?.first_name ||
    usuario?.username ||
    "Usuario";

  const rol = usuario?.rol || "TRABAJADOR";
  const esAdministrador = rol === "ADMINISTRADOR";

  return (
    <div className="agro-dashboard-content">
      <header className="agro-topbar">
        <div>
          <p className="agro-eyebrow">
            GESTIÓN AGRÍCOLA INTELIGENTE
          </p>
          <h1>Panel principal</h1>
        </div>

        <div className="agro-topbar-user">
          <span className="agro-status-dot" />
          <span>Sistema AgroSmart</span>
        </div>
      </header>

      <section className="agro-welcome">
        <div>
          <span className="agro-welcome-tag">
            BIENVENIDO A AGROSMART
          </span>

          <h2>¡Hola, {nombreUsuario}! 👋</h2>

          <p>
            Administra tus actividades agrícolas y consulta la información
            de tus fincas desde un solo lugar.
          </p>
        </div>

        <div
          className="agro-welcome-illustration"
          aria-hidden="true"
        >
          🌱
        </div>
      </section>

      <section className="agro-section">
        <div className="agro-section-heading">
          <div>
            <h2>Resumen general</h2>
            <p>Indicadores de tu gestión agrícola</p>
          </div>
        </div>

        <div className="agro-stats-grid">
          <article className="agro-stat-card">
            <div className="agro-stat-icon agro-icon-green">
              <IconoAgro tipo="persona" />
            </div>

            <div className="agro-stat-content">
              <span>Productores</span>
              <strong>{indicadores.productores}</strong>
              <small>Productores registrados</small>
            </div>
          </article>

          <article className="agro-stat-card">
            <div className="agro-stat-icon agro-icon-blue">⌂</div>

            <div className="agro-stat-content">
              <span>Fincas</span>
              <strong>{indicadores.fincas}</strong>
              <small>Fincas registradas</small>
            </div>
          </article>

          <article className="agro-stat-card">
            <div className="agro-stat-icon agro-icon-orange">
              <IconoAgro tipo="platano" />
            </div>

            <div className="agro-stat-content">
              <span>Cultivos</span>
              <strong>{indicadores.cultivos}</strong>
              <small>Cultivos registrados</small>
            </div>
          </article>

          <article className="agro-stat-card">
            <div className="agro-stat-icon agro-icon-purple">
              <IconoAgro tipo="platano" />
            </div>

            <div className="agro-stat-content">
              <span>Cosechas</span>
              <strong>{indicadores.cosechas}</strong>
              <small>Cosechas registradas</small>
            </div>
          </article>
        </div>
      </section>

      <section className="agro-content-grid">
        <article className="agro-panel agro-production-panel">
          <div className="agro-panel-heading">
            <div>
              <h2>Gestión de producción</h2>
              <p>Accede rápidamente a tus módulos agrícolas</p>
            </div>

            <span className="agro-panel-leaf">🌿</span>
          </div>

          <div className="agro-quick-links">
            <Link to="/cultivos" className="agro-quick-link">
              <span className="agro-quick-icon">
                <IconoAgro tipo="platano" />
              </span>

              <div>
                <strong>Consultar cultivos</strong>
                <small>Revisa los cultivos registrados</small>
              </div>

              <span className="agro-arrow">→</span>
            </Link>

            <Link to="/actividades" className="agro-quick-link">
              <span className="agro-quick-icon">📋</span>

              <div>
                <strong>Actividades agrícolas</strong>
                <small>Organiza las labores de campo</small>
              </div>

              <span className="agro-arrow">→</span>
            </Link>

            <Link to="/cosechas" className="agro-quick-link">
              <span className="agro-quick-icon">
                <IconoAgro tipo="platano" />
              </span>

              <div>
                <strong>Consultar cosechas</strong>
                <small>Revisa la producción registrada</small>
              </div>

              <span className="agro-arrow">→</span>
            </Link>
          </div>
        </article>

        <article className="agro-panel agro-shortcuts-panel">
          <div className="agro-panel-heading">
            <div>
              <h2>Accesos rápidos</h2>
              <p>Administra la información</p>
            </div>
          </div>

          <div className="agro-shortcuts">
            <Link to="/productores" className="agro-shortcut">
              <span className="agro-shortcut-icon">
                <IconoAgro tipo="persona" />
              </span>
              <strong>Productores</strong>
            </Link>

            <Link to="/fincas" className="agro-shortcut">
              <span className="agro-shortcut-icon">⌂</span>
              <strong>Fincas</strong>
            </Link>

            <Link to="/economia" className="agro-shortcut">
              <span className="agro-shortcut-icon">$</span>
              <strong>Economía</strong>
            </Link>

            {esAdministrador && (
              <Link to="/usuarios" className="agro-shortcut">
                <span className="agro-shortcut-icon">
                  <IconoAgro tipo="usuarios" />
                </span>
                <strong>Usuarios</strong>
              </Link>
            )}
          </div>
        </article>
      </section>

      <footer className="agro-footer">
        <span>AgroSmart Urabá</span>
        <span>Plataforma de gestión agrícola</span>
      </footer>
    </div>
  );
}

export default Dashboard;
