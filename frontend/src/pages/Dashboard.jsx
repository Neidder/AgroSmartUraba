import { useEffect, useState } from "react";
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
import { getApiErrorMessage } from "../services/api";
import {
  listarActividades,
  listarCosechas,
  listarFincas,
  listarLotes,
  listarProductores,
  obtenerReporteIngresos,
} from "../services/dashboardService";
import { useUsuario } from "../hooks/useUsuario";
import "../styles/DashboardHome.css";

const CLIMA = { ciudad: "Apartadó, Antioquia", temp: "28°C" };

const accesosRapidos = [
  { texto: "Registrar productor", ruta: "/productores", Icono: UserPlus },
  { texto: "Registrar finca", ruta: "/fincas", Icono: Home },
  { texto: "Registrar cultivo", ruta: "/cultivos", Icono: Sprout },
  { texto: "Registrar actividad", ruta: "/actividades", Icono: ClipboardCheck },
  { texto: "Registrar cosecha", ruta: "/cosechas", Icono: Wheat },
  { texto: "Ver reportes", ruta: "/economia", Icono: BarChart3 },
];

const formatoMoneda = (monto) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(monto || 0));

function formatearFecha() {
  const fecha = new Date().toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Hoy, ${fecha}`;
}

function fechaParaApi(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function Dashboard() {
  const { nombre } = useUsuario();
  const [datos, setDatos] = useState({
    productores: null,
    fincas: null,
    lotes: null,
    cosechas: null,
    actividades: null,
    ventas: null,
  });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [periodoVentas, setPeriodoVentas] = useState(null);

  useEffect(() => {
    let vigente = true;

    async function cargarDashboard() {
      const hoy = new Date();
      const periodo = {
        desde: fechaParaApi(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        hasta: fechaParaApi(hoy),
      };
      setPeriodoVentas(periodo);

      const resultados = await Promise.allSettled([
        listarProductores(),
        listarFincas(),
        listarLotes(),
        listarCosechas(),
        listarActividades({ activo: true }),
        obtenerReporteIngresos(periodo),
      ]);

      if (!vigente) {
        return;
      }

      const nombresRecursos = [
        "productores",
        "fincas",
        "lotes",
        "cosechas",
        "actividades",
        "reporte de ventas",
      ];
      const errores = [];
      const valores = resultados.map((resultado, indice) => {
        if (resultado.status === "fulfilled") {
          return resultado.value;
        }

        errores.push(
          `${nombresRecursos[indice]}: ${getApiErrorMessage(
            resultado.reason,
            "no se pudieron cargar los datos.",
          )}`,
        );
        return null;
      });

      const [productores, fincas, lotes, cosechas, actividades, ventas] =
        valores;
      setDatos({ productores, fincas, lotes, cosechas, actividades, ventas });
      setErrorCarga(errores.join(" "));
      setCargando(false);
    }

    cargarDashboard();

    return () => {
      vigente = false;
    };
  }, []);

  const totalProductores = datos.productores
    ? datos.productores.filter((productor) => productor.activo).length
    : null;
  const totalFincas = datos.fincas
    ? datos.fincas.filter((finca) => finca.activa).length
    : null;
  const totalLotes = datos.lotes
    ? datos.lotes.filter((lote) => lote.activo).length
    : null;
  const totalCosechas = datos.cosechas?.length ?? null;
  const municipios = datos.productores
    ? new Set(
        datos.productores
          .map((productor) => (productor.municipio || "").trim())
          .filter(Boolean),
      ).size
    : null;
  const areaCultivada = datos.lotes
    ? datos.lotes
        .filter((lote) => lote.activo)
        .reduce((total, lote) => total + Number(lote.hectareas || 0), 0)
    : null;
  const valorIndicador = (valor) =>
    cargando ? "…" : valor === null ? "—" : valor;

  const indicadores = [
    {
      etiqueta: "Productores activos",
      valor: valorIndicador(totalProductores),
      Icono: Users,
      color: "green",
    },
    {
      etiqueta: "Fincas activas",
      valor: valorIndicador(totalFincas),
      Icono: Warehouse,
      color: "blue",
    },
    {
      etiqueta: "Lotes activos",
      valor: valorIndicador(totalLotes),
      Icono: Leaf,
      color: "lime",
    },
    {
      etiqueta: "Cosechas registradas",
      valor: valorIndicador(totalCosechas),
      Icono: Wheat,
      color: "purple",
    },
  ];

  const region = [
    { etiqueta: "Municipios", valor: municipios, Icono: MapPin },
    { etiqueta: "Productores activos", valor: totalProductores, Icono: Users },
    { etiqueta: "Fincas registradas", valor: totalFincas, Icono: Warehouse },
    {
      etiqueta: "Área cultivada",
      valor:
        areaCultivada === null
          ? null
          : `${new Intl.NumberFormat("es-CO", {
              maximumFractionDigits: 2,
            }).format(areaCultivada)} ha`,
      Icono: Sprout,
    },
  ];

  const actividadesRecientes = datos.actividades
    ? [...datos.actividades]
        .sort((a, b) => b.fecha_actividad.localeCompare(a.fecha_actividad))
        .slice(0, 5)
    : [];

  return (
    <div className="db">
      <header className="db-header">
        <div>
          <h1>¡Bienvenido a AgroSmart Urabá, {nombre}!</h1>
          <p>Tu aliado en la gestión y seguimiento de la información agrícola.</p>
        </div>

        <div className="db-meta">
          <span>
            <CalendarDays size={14} /> {formatearFecha()}
          </span>
          <span>
            <Sun size={14} /> {CLIMA.temp} · {CLIMA.ciudad}
          </span>
        </div>
      </header>

      {errorCarga && (
        <div className="db-alerta" role="alert">
          Algunos indicadores no están disponibles. {errorCarga}
        </div>
      )}

      <div className="db-grid">
        <div className="db-main">
          <section className="db-kpis">
            {indicadores.map(({ etiqueta, valor, Icono, color }) => (
              <article key={etiqueta} className="db-card db-kpi">
                <div className={`db-kpi-icon db-${color}`}>
                  <Icono size={24} />
                </div>
                <div>
                  <span className="db-kpi-label">{etiqueta}</span>
                  <strong className="db-kpi-value">{valor}</strong>
                </div>
              </article>
            ))}
          </section>

          <section className="db-live-grid">
            <article className="db-card">
              <div className="db-section-heading">
                <div>
                  <h2>Ventas del mes</h2>
                  <p>
                    {periodoVentas
                      ? `${periodoVentas.desde} — ${periodoVentas.hasta}`
                      : "Calculando período…"}
                  </p>
                </div>
                <Link to="/ventas" className="db-section-link">
                  Ver ventas
                </Link>
              </div>
              <div className="db-sales-values">
                <div>
                  <span>Ingresos registrados</span>
                  <strong>
                    {cargando
                      ? "Cargando…"
                      : datos.ventas
                        ? formatoMoneda(datos.ventas.total_ingresos)
                        : "—"}
                  </strong>
                </div>
                <div>
                  <span>Ventas registradas</span>
                  <strong>
                    {valorIndicador(datos.ventas?.cantidad_ventas ?? null)}
                  </strong>
                </div>
              </div>
            </article>

            <article className="db-card">
              <div className="db-section-heading">
                <div>
                  <h2>Actividades recientes</h2>
                  <p>Últimas labores registradas</p>
                </div>
                <Link to="/actividades" className="db-section-link">
                  Ver todas
                </Link>
              </div>
              {cargando ? (
                <p className="db-empty">Cargando actividades…</p>
              ) : datos.actividades === null ? (
                <p className="db-empty">No fue posible cargar las actividades.</p>
              ) : actividadesRecientes.length === 0 ? (
                <p className="db-empty">No hay actividades recientes.</p>
              ) : (
                <ul className="db-activity-list">
                  {actividadesRecientes.map((actividad) => (
                    <li key={actividad.id}>
                      <ClipboardCheck size={18} aria-hidden="true" />
                      <div>
                        <strong>{actividad.tipo_display}</strong>
                        <small>
                          {actividad.nombre_lote} · {actividad.descripcion}
                        </small>
                      </div>
                      <time dateTime={actividad.fecha_actividad}>
                        {actividad.fecha_actividad}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        </div>

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
                  <strong>{valorIndicador(valor)}</strong>
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
