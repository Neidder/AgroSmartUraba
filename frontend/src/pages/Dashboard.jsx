import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Warehouse,
  Leaf,
  Scale,
  UserPlus,
  Home,
  Sprout,
  ClipboardCheck,
  Wheat,
  BarChart3,
  MapPin,
  Sun,
  CalendarDays,
  Receipt,
  TrendingDown,
  BellRing,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useUsuario } from "../hooks/useUsuario";
import fondoBanner from "../assets/sidebar-bg.webp";
import "../styles/DashboardHome.css";

const API_BASE = "http://127.0.0.1:8000";
const FUENTES = {
  productores: { url: `${API_BASE}/api_productores/productores/`, nombre: "productores" },
  fincas: { url: `${API_BASE}/api_fincas/fincas/`, nombre: "fincas" },
  lotes: { url: `${API_BASE}/api_cultivos/lotes/`, nombre: "lotes" },
  cosechas: { url: `${API_BASE}/api_cosechas/cosechas/`, nombre: "cosechas" },
  actividades: { url: `${API_BASE}/api_actividades/actividades/`, nombre: "actividades" },
  costos: { url: `${API_BASE}/api_economia/costos-produccion/`, nombre: "costos" },
  perdidas: { url: `${API_BASE}/api_economia/perdidas-agricolas/`, nombre: "pérdidas" },
};

// Coordenadas de Apartadó (Urabá) para el clima en vivo.
const URL_CLIMA =
  "https://api.open-meteo.com/v1/forecast?latitude=7.88&longitude=-76.63&current=temperature_2m";

const COLORES = ["#0f7a45", "#f5b50f", "#2b8bd9", "#7a5bc0", "#e07a3a", "#8d9b92"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const NOMBRE_CATEGORIA = {
  SEMILLAS: "Semillas",
  FERTILIZANTES: "Fertilizantes",
  PLAGUICIDAS: "Plaguicidas",
  MANO_OBRA: "Mano de obra",
  TRANSPORTE: "Transporte",
  RIEGO: "Riego",
  HERRAMIENTAS: "Herramientas",
  OTRO: "Otro",
};

const accesosRapidos = [
  { texto: "Registrar productor", ruta: "/productores", Icono: UserPlus },
  { texto: "Registrar finca", ruta: "/fincas", Icono: Home },
  { texto: "Registrar cultivo", ruta: "/cultivos", Icono: Sprout },
  { texto: "Registrar actividad", ruta: "/actividades", Icono: ClipboardCheck },
  { texto: "Registrar cosecha", ruta: "/cosechas", Icono: Wheat },
  { texto: "Ver economía", ruta: "/economia", Icono: BarChart3 },
];

const datosVacios = Object.fromEntries(Object.keys(FUENTES).map((k) => [k, []]));

async function cargarLista(url) {
  const token = localStorage.getItem("token");
  const respuesta = await fetch(url, { headers: token ? { Authorization: `Token ${token}` } : {} });
  if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
  const datos = await respuesta.json();
  return Array.isArray(datos) ? datos : datos.results || [];
}

function formatearFechaLarga() {
  const f = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  return `Hoy, ${f}`;
}

function formatearFecha(texto) {
  if (!texto) return "—";
  const [anio, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${anio}`;
}

function formatearNumero(valor, decimales = 1) {
  return Number(valor || 0).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: decimales });
}

function formatearCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

const compacto = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

// Solo se pueden sumar cosechas en kilogramos o toneladas.
function aToneladas(cosecha) {
  const cantidad = Number(cosecha.cantidad || 0);
  if (cosecha.unidad_medida === "KG") return cantidad / 1000;
  if (cosecha.unidad_medida === "TON") return cantidad;
  return null;
}

function mesDe(fecha) {
  const [anio, mes] = fecha.split("-").map(Number);
  return anio * 12 + (mes - 1);
}

function diasHasta(fechaISO) {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const destino = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((destino - hoy) / 86400000);
}

function cuando(dias) {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

function sumarPor(lista, clave, valor) {
  const resultado = {};
  lista.forEach((item) => {
    const k = clave(item);
    resultado[k] = (resultado[k] || 0) + valor(item);
  });
  return resultado;
}

function Vacio({ texto }) {
  return <p className="db-vacio-texto">{texto}</p>;
}

function Dashboard() {
  const { nombre } = useUsuario();
  const [datos, setDatos] = useState(datosVacios);
  const [fallidas, setFallidas] = useState([]);
  const [temperatura, setTemperatura] = useState(null);

  useEffect(() => {
    let vigente = true;
    const claves = Object.keys(FUENTES);

    Promise.allSettled(claves.map((k) => cargarLista(FUENTES[k].url))).then((resultados) => {
      if (!vigente) return;
      const nuevos = {};
      const errores = [];
      resultados.forEach((r, i) => {
        if (r.status === "fulfilled") nuevos[claves[i]] = r.value;
        else errores.push(FUENTES[claves[i]].nombre);
      });
      setDatos((actual) => ({ ...actual, ...nuevos }));
      setFallidas(errores);
    });

    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    fetch(URL_CLIMA, { signal: controlador.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setTemperatura(Math.round(d.current.temperature_2m)))
      .catch(() => {}); // sin internet simplemente no se muestra el clima
    return () => controlador.abort();
  }, []);

  const { productores, fincas, lotes, cosechas, actividades, costos, perdidas } = datos;

  // ---------- Base común ----------
  const lotesPorId = Object.fromEntries(lotes.map((l) => [l.id, l]));
  const lotesActivos = lotes.filter((l) => l.activo);
  const pesadas = cosechas.map((c) => ({ ...c, toneladas: aToneladas(c) })).filter((c) => c.toneladas !== null);
  const produccionTotal = pesadas.reduce((suma, c) => suma + c.toneladas, 0);

  const hoy = new Date();
  const mesActual = hoy.getFullYear() * 12 + hoy.getMonth();
  const ultimosMeses = Array.from({ length: 6 }, (_, i) => mesActual - 5 + i);

  const nuevosEsteMes = (lista) =>
    lista.filter((x) => x.fecha_creacion && new Date(x.fecha_creacion).getFullYear() * 12 + new Date(x.fecha_creacion).getMonth() === mesActual).length;

  const toneladasDelMes = (mes) =>
    pesadas.filter((c) => mesDe(c.fecha_cosecha) === mes).reduce((suma, c) => suma + c.toneladas, 0);
  const toneladasMesAnterior = toneladasDelMes(mesActual - 1);
  const variacionProduccion =
    toneladasMesAnterior > 0
      ? Math.round(((toneladasDelMes(mesActual) - toneladasMesAnterior) * 100) / toneladasMesAnterior)
      : null;

  // ---------- Tarjetas ----------
  const nuevasFincas = nuevosEsteMes(fincas);
  const nuevosLotes = nuevosEsteMes(lotes);
  const nuevosProductores = nuevosEsteMes(productores);

  const indicadores = [
    { etiqueta: "Productores registrados", valor: productores.length, Icono: Users, color: "green", nota: nuevosProductores > 0 ? `↑ +${nuevosProductores} este mes` : "" },
    { etiqueta: "Fincas registradas", valor: fincas.length, Icono: Warehouse, color: "blue", nota: nuevasFincas > 0 ? `↑ +${nuevasFincas} este mes` : "" },
    { etiqueta: "Lotes activos", valor: lotesActivos.length, Icono: Leaf, color: "lime", nota: nuevosLotes > 0 ? `↑ +${nuevosLotes} este mes` : "" },
    {
      etiqueta: "Producción total",
      valor: `${formatearNumero(produccionTotal)} t`,
      Icono: Scale,
      color: "purple",
      nota:
        variacionProduccion !== null
          ? `${variacionProduccion >= 0 ? "↑" : "↓"} ${Math.abs(variacionProduccion)}% vs. mes anterior`
          : "en kilogramos y toneladas",
      baja: variacionProduccion !== null && variacionProduccion < 0,
    },
  ];

  // ---------- Producción por cultivo (últimos 6 meses) ----------
  const enVentana = pesadas.filter((c) => ultimosMeses.includes(mesDe(c.fecha_cosecha)));
  const totalPorCultivo = sumarPor(enVentana, (c) => c.nombre_tipo_cultivo || "Sin cultivo", (c) => c.toneladas);
  const cultivosOrdenados = Object.entries(totalPorCultivo).sort((a, b) => b[1] - a[1]).map(([n]) => n);
  const seriesPrincipales = cultivosOrdenados.slice(0, 4);
  const hayOtros = cultivosOrdenados.length > 4;
  const series = hayOtros ? [...seriesPrincipales, "Otros"] : seriesPrincipales;

  const datosLinea = ultimosMeses.map((mes) => {
    const fila = { mes: MESES[mes % 12] };
    series.forEach((s) => {
      fila[s] = 0;
    });
    enVentana
      .filter((c) => mesDe(c.fecha_cosecha) === mes)
      .forEach((c) => {
        const clave = seriesPrincipales.includes(c.nombre_tipo_cultivo) ? c.nombre_tipo_cultivo : "Otros";
        fila[clave] += c.toneladas;
      });
    series.forEach((s) => {
      fila[s] = Math.round(fila[s] * 100) / 100;
    });
    return fila;
  });

  // ---------- Distribución de cultivos (hectáreas de lotes activos) ----------
  const hectareasPorCultivo = sumarPor(lotesActivos, (l) => l.nombre_tipo_cultivo || "Sin cultivo", (l) => Number(l.hectareas || 0));
  const areaCultivada = Object.values(hectareasPorCultivo).reduce((suma, v) => suma + v, 0);
  const datosDona = Object.entries(hectareasPorCultivo)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  // ---------- Últimas actividades ----------
  const ultimasActividades = actividades
    .filter((a) => a.activo)
    .slice()
    .sort((a, b) => b.fecha_actividad.localeCompare(a.fecha_actividad))
    .slice(0, 5)
    .map((a) => {
      const lote = lotesPorId[a.lote];
      return { ...a, finca: lote?.nombre_finca || "—", cultivo: lote?.nombre_tipo_cultivo || "—" };
    });

  // ---------- Alertas y recordatorios (con datos reales) ----------
  const alertas = [];
  actividades
    .filter((a) => a.activo)
    .forEach((a) => {
      const dias = diasHasta(a.fecha_actividad);
      if (dias >= 0 && dias <= 14) {
        const finca = lotesPorId[a.lote]?.nombre_finca || a.nombre_lote;
        alertas.push({ clave: `a${a.id}`, texto: `${a.tipo_display} en ${finca}`, dias, urgente: dias <= 2 });
      }
    });
  lotesActivos.forEach((l) => {
    if (!l.fecha_fin_estimada) return;
    const dias = diasHasta(l.fecha_fin_estimada);
    if (dias >= 0 && dias <= 30) {
      alertas.push({ clave: `l${l.id}`, texto: `Cosecha estimada en ${l.nombre_finca} · ${l.nombre}`, dias, urgente: dias <= 7 });
    }
  });
  alertas.sort((a, b) => a.dias - b.dias);
  const alertasVisibles = alertas.slice(0, 6);

  // ---------- Costos por categoría ----------
  const costosPorCategoria = sumarPor(costos, (c) => NOMBRE_CATEGORIA[c.categoria] || c.categoria, (c) => Number(c.monto || 0));
  const datosCostos = Object.entries(costosPorCategoria)
    .map(([nombreCat, valor]) => ({ nombre: nombreCat, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // ---------- Pérdidas por mes (cantidad de registros) ----------
  const datosPerdidas = ultimosMeses.map((mes) => ({
    mes: MESES[mes % 12],
    perdidas: perdidas.filter((p) => mesDe(p.fecha_perdida) === mes).length,
  }));
  const hayPerdidas = datosPerdidas.some((d) => d.perdidas > 0);

  // ---------- Producción por finca (Top 5) ----------
  const produccionPorFinca = sumarPor(pesadas, (c) => c.nombre_finca || "Sin finca", (c) => c.toneladas);
  const topFincas = Object.entries(produccionPorFinca).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maximoFinca = Math.max(0, ...topFincas.map(([, v]) => v));

  // ---------- Resumen de la región ----------
  const municipios = new Set(fincas.map((f) => (f.municipio || "").trim()).filter(Boolean));
  const region = [
    { etiqueta: "Municipios", valor: municipios.size, Icono: MapPin },
    { etiqueta: "Productores activos", valor: productores.filter((p) => p.activo).length, Icono: Users },
    { etiqueta: "Fincas registradas", valor: fincas.length, Icono: Warehouse },
    { etiqueta: "Área cultivada (ha)", valor: formatearNumero(areaCultivada, 2), Icono: Sprout },
  ];

  return (
    <div className="db">
      <header className="db-header">
        <div>
          <h1>¡Bienvenido a AgroSmart Urabá, {nombre}!</h1>
          <p>Tu aliado en la gestión y seguimiento de la información agrícola.</p>
        </div>

        <div className="db-meta">
          <span><CalendarDays size={14} /> {formatearFechaLarga()}</span>
          {temperatura !== null && (
            <span><Sun size={14} /> {temperatura}°C · Apartadó, Antioquia</span>
          )}
        </div>
      </header>

      {fallidas.length > 0 && (
        <div className="db-aviso" role="alert">
          No se pudo cargar: {fallidas.join(", ")}. Verifica que Django esté funcionando y vuelve a intentarlo.
        </div>
      )}

      <div className="db-grid">
        <div className="db-main">
          <section className="db-kpis">
            {indicadores.map(({ etiqueta, valor, Icono, color, nota, baja }) => (
              <article key={etiqueta} className="db-card db-kpi">
                <div className={`db-kpi-icon db-${color}`}>
                  <Icono size={24} />
                </div>
                <div>
                  <span className="db-kpi-label">{etiqueta}</span>
                  <strong className="db-kpi-value">{valor}</strong>
                  {nota && <small className={baja ? "db-down" : nota.startsWith("↑") ? "db-up" : ""}>{nota}</small>}
                </div>
              </article>
            ))}
          </section>

          <div className="db-fila db-fila--2-1">
            <section className="db-card">
              <h2 className="db-card-titulo">
                Producción por cultivo <small>(últimos 6 meses, toneladas)</small>
              </h2>
              {series.length === 0 ? (
                <Vacio texto="Aún no hay cosechas en kilogramos o toneladas en los últimos 6 meses." />
              ) : (
                <div className="db-grafica">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={datosLinea} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="#e8eee9" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(valor, serie) => [`${formatearNumero(valor, 2)} t`, serie]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {series.map((s, i) => (
                        <Line key={s} type="monotone" dataKey={s} stroke={COLORES[i % COLORES.length]} strokeWidth={2.5} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="db-card">
              <h2 className="db-card-titulo">
                Distribución de cultivos <small>(por área)</small>
              </h2>
              {datosDona.length === 0 ? (
                <Vacio texto="Aún no hay lotes activos registrados." />
              ) : (
                <div className="db-dona">
                  <div className="db-dona-grafica">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={datosDona} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
                          {datosDona.map((d, i) => (
                            <Cell key={d.name} fill={COLORES[i % COLORES.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(valor, n) => [`${formatearNumero(valor, 2)} ha`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="db-dona-centro">
                      <small>Total</small>
                      <strong>{lotesActivos.length}</strong>
                      <small>{lotesActivos.length === 1 ? "lote" : "lotes"}</small>
                    </div>
                  </div>

                  <ul className="db-leyenda">
                    {datosDona.slice(0, 5).map((d, i) => (
                      <li key={d.name}>
                        <span className="db-punto" style={{ background: COLORES[i % COLORES.length] }} />
                        <span>{d.name}</span>
                        <strong>{Math.round((d.value * 100) / areaCultivada)}%</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <div className="db-fila db-fila--tabla">
            <section className="db-card">
              <div className="db-card-cabecera">
                <h2 className="db-card-titulo">Últimas actividades agrícolas</h2>
                <Link to="/actividades" className="db-enlace">Ver todas →</Link>
              </div>

              {ultimasActividades.length === 0 ? (
                <Vacio texto="Aún no hay actividades registradas." />
              ) : (
                <div className="db-tabla-contenedor">
                  <table className="db-tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Finca</th>
                        <th>Cultivo</th>
                        <th>Actividad</th>
                        <th>Responsable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimasActividades.map((a) => (
                        <tr key={a.id}>
                          <td>{formatearFecha(a.fecha_actividad)}</td>
                          <td>{a.finca}</td>
                          <td>{a.cultivo}</td>
                          <td>{a.tipo_display}</td>
                          <td>{a.nombre_responsable}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="db-card">
              <h2 className="db-card-titulo"><BellRing size={18} /> Alertas y recordatorios</h2>
              {alertasVisibles.length === 0 ? (
                <Vacio texto="No hay actividades programadas ni cosechas próximas." />
              ) : (
                <ul className="db-alertas">
                  {alertasVisibles.map((a) => (
                    <li key={a.clave}>
                      <span className={`db-punto ${a.urgente ? "db-punto--urgente" : "db-punto--normal"}`} />
                      <span className="db-alerta-texto">{a.texto}</span>
                      <span className="db-alerta-cuando">{cuando(a.dias)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="db-fila db-fila--3">
            <section className="db-card">
              <h2 className="db-card-titulo"><Receipt size={18} /> Costos de producción</h2>
              {datosCostos.length === 0 ? (
                <Vacio texto="Aún no hay costos registrados." />
              ) : (
                <div className="db-grafica db-grafica--chica">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosCostos} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="nombre" width={96} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(valor) => [formatearCOP(valor), "Costo"]} cursor={{ fill: "#f0f7f1" }} />
                      <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                        {datosCostos.map((d, i) => (
                          <Cell key={d.nombre} fill={COLORES[i % COLORES.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {datosCostos.length > 0 && (
                <small className="db-pie">Total: {compacto.format(datosCostos.reduce((s, d) => s + d.valor, 0))} COP en las 5 mayores categorías</small>
              )}
            </section>

            <section className="db-card">
              <h2 className="db-card-titulo"><TrendingDown size={18} /> Pérdidas registradas <small>(por mes)</small></h2>
              {!hayPerdidas ? (
                <Vacio texto="No hay pérdidas registradas en los últimos 6 meses." />
              ) : (
                <div className="db-grafica db-grafica--chica">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={datosPerdidas} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#e8eee9" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(valor) => [valor, "Pérdidas"]} />
                      <Line type="monotone" dataKey="perdidas" stroke="#e5484d" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="db-card">
              <h2 className="db-card-titulo"><Warehouse size={18} /> Producción por finca <small>(Top 5)</small></h2>
              {topFincas.length === 0 ? (
                <Vacio texto="Aún no hay cosechas en kilogramos o toneladas." />
              ) : (
                <ul className="db-barras">
                  {topFincas.map(([finca, valor]) => (
                    <li key={finca}>
                      <div className="db-barra-texto">
                        <span>{finca}</span>
                        <strong>{formatearNumero(valor, 2)} t · {Math.round((valor * 100) / produccionTotal)}%</strong>
                      </div>
                      <div className="db-barra">
                        <div style={{ width: `${maximoFinca ? (valor / maximoFinca) * 100 : 0}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        <aside className="db-side">
          <div className="db-banner" style={{ "--db-banner": `url(${fondoBanner})` }}>
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