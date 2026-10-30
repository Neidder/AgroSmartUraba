import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Warehouse,
  Leaf,
  Wheat,
  UserPlus,
  Home,
  Sprout,
  ClipboardCheck,
  BarChart3,
  MapPin,
  Sun,
  CalendarDays,
} from "lucide-react";
import { useUsuario } from "../hooks/useUsuario";
import "../styles/DashboardHome.css";

// TODO Fase 4: reemplazar por datos reales de la API.
const CLIMA = { ciudad: "Apartadó, Antioquia", temp: "28°C" };

const accesosRapidos = [
  { texto: "Registrar productor", ruta: "/productores", Icono: UserPlus },
  { texto: "Registrar finca", ruta: "/fincas", Icono: Home },
  { texto: "Registrar cultivo", ruta: "/cultivos", Icono: Sprout },
  { texto: "Registrar actividad", ruta: "/actividades", Icono: ClipboardCheck },
  { texto: "Registrar cosecha", ruta: "/cosechas", Icono: Wheat },
  { texto: "Ver reportes", ruta: "/economia", Icono: BarChart3 },
];

function formatearFecha() {
  const f = new Date().toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Hoy, ${f}`;
}

function Dashboard() {
  const { nombre } = useUsuario();

  // `variacion` es opcional: cuando el backend la entregue, se muestra sola.
  const [indicadores] = useState([
    { etiqueta: "Productores registrados", valor: 0, Icono: Users, color: "green", variacion: null },
    { etiqueta: "Fincas registradas", valor: 0, Icono: Warehouse, color: "blue", variacion: null },
    { etiqueta: "Cultivos activos", valor: 0, Icono: Leaf, color: "lime", variacion: null },
    { etiqueta: "Cosechas registradas", valor: 0, Icono: Wheat, color: "purple", variacion: null },
  ]);

  const [region] = useState([
    { etiqueta: "Municipios", valor: 0, Icono: MapPin },
    { etiqueta: "Productores activos", valor: 0, Icono: Users },
    { etiqueta: "Fincas registradas", valor: 0, Icono: Warehouse },
    { etiqueta: "Área cultivada (ha)", valor: 0, Icono: Sprout },
  ]);

  return (
    <div className="db">
      <header className="db-header">
        <div>
          <h1>¡Bienvenido a AgroSmart Urabá, {nombre}!</h1>
          <p>Tu aliado en la gestión y seguimiento de la información agrícola.</p>
        </div>

        <div className="db-meta">
          <span><CalendarDays size={14} /> {formatearFecha()}</span>
          <span><Sun size={14} /> {CLIMA.temp} · {CLIMA.ciudad}</span>
        </div>
      </header>

      <div className="db-grid">
        {/* Columna principal */}
        <div className="db-main">
          <section className="db-kpis">
            {indicadores.map(({ etiqueta, valor, Icono, color, variacion }) => (
              <article key={etiqueta} className="db-card db-kpi">
                <div className={`db-kpi-icon db-${color}`}>
                  <Icono size={24} />
                </div>
                <div>
                  <span className="db-kpi-label">{etiqueta}</span>
                  <strong className="db-kpi-value">{valor}</strong>
                  {variacion !== null && (
                    <small className={variacion >= 0 ? "db-up" : "db-down"}>
                      {variacion >= 0 ? "↑" : "↓"} {Math.abs(variacion)}% vs. mes anterior
                    </small>
                  )}
                </div>
              </article>
            ))}
          </section>

          {/* Fase 2: aquí van las gráficas (Recharts).
              Fase 3: tabla de actividades y alertas. */}
          <section className="db-card db-placeholder">
            <h2>Producción por cultivo</h2>
            <p>Aún no hay datos registrados. Cuando registres cosechas, la gráfica aparecerá aquí.</p>
          </section>
        </div>

        {/* Columna lateral */}
        <aside className="db-side">
          <div className="db-banner">
            <p>“La información también es una semilla que da frutos.”</p>
          </div>

          <section className="db-card">
            <h3>Accesos rápidos</h3>
            <div className="db-quick">
              {accesosRapidos.map(({ texto, ruta, Icono }) => (
                <Link key={texto} to={ruta} className="db-quick-link">
                  <Icono size={18} />
                  <span>{texto}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="db-card">
            <h3>Resumen de la región</h3>
            <ul className="db-region">
              {region.map(({ etiqueta, valor, Icono }) => (
                <li key={etiqueta}>
                  <Icono size={18} />
                  <span>{etiqueta}</span>
                  <strong>{valor}</strong>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Dashboard;