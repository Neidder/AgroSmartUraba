import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBasket,
  Leaf,
  Scale,
  Tractor,
  TrendingUp,
  CalendarDays,
  BarChart3,
  Plus,
  Search,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import fondoBanner from "../assets/sidebar-bg.webp";
import "../styles/Cosechas.css";

const API_BASE = "http://127.0.0.1:8000";
// Verifica estos prefijos en el urls.py principal del backend.
const API_COSECHAS = `${API_BASE}/api_cosechas/cosechas/`;
const API_LOTES = `${API_BASE}/api_cultivos/lotes/`;
const POR_PAGINA = 10;

const UNIDADES = [
  ["KG", "Kilogramos"],
  ["TON", "Toneladas"],
  ["UND", "Unidades"],
  ["CAJAS", "Cajas"],
];

const COLORES_GRAFICA = ["#0f7a45", "#f5b50f", "#0b4228", "#2b8bd9", "#7a5bc0", "#e07a3a"];

const ETIQUETAS = {
  lote: "Lote",
  fecha_cosecha: "Fecha de cosecha",
  cantidad: "Cantidad",
  unidad_medida: "Unidad de medida",
  observaciones: "Observaciones",
};

function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formularioInicial() {
  return {
    lote: "",
    fecha_cosecha: hoyISO(),
    cantidad: "",
    unidad_medida: "KG",
    observaciones: "",
  };
}

function listaDe(datos) {
  return Array.isArray(datos) ? datos : datos?.results || [];
}

function textoError(datos, porDefecto) {
  if (!datos || typeof datos !== "object") return porDefecto;
  if (typeof datos.detail === "string") return datos.detail;

  const partes = Object.entries(datos).map(([campo, errores]) => {
    const texto = Array.isArray(errores)
      ? errores.join(" ")
      : typeof errores === "string"
        ? errores
        : JSON.stringify(errores);
    const etiqueta = ETIQUETAS[campo];
    return etiqueta ? `${etiqueta}: ${texto}` : texto;
  });

  return partes.join(" | ") || porDefecto;
}

// Las fechas llegan como "AAAA-MM-DD": se arman a mano para evitar desfases de zona horaria.
function formatearFecha(texto) {
  if (!texto) return "—";
  const [anio, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${anio}`;
}

function formatearCantidad(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatearToneladas(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

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

function numerosDePagina(actual, total) {
  const max = 5;
  let fin = Math.min(total, Math.max(1, actual - 2) + max - 1);
  const inicio = Math.max(1, fin - max + 1);
  fin = Math.min(total, fin);
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

function Cosechas() {
  const [cosechas, setCosechas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [cosechaEditando, setCosechaEditando] = useState(null);
  const [cosechaViendo, setCosechaViendo] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtroFinca, setFiltroFinca] = useState("todas");
  const [filtroCultivo, setFiltroCultivo] = useState("todos");
  const [filtroUnidad, setFiltroUnidad] = useState("todas");
  const [pagina, setPagina] = useState(1);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [mensaje, setMensaje] = useState("");

  const token = localStorage.getItem("token");
  const authHeaders = token ? { Authorization: `Token ${token}` } : {};

  async function cargarCosechas() {
    try {
      const respuesta = await fetch(API_COSECHAS, { headers: authHeaders });
      if (!respuesta.ok) throw new Error("No fue posible cargar las cosechas.");
      setCosechas(listaDe(await respuesta.json()));
    } catch (err) {
      setError(
        `${err.message} Verifica que Django esté funcionando y que la URL de la API sea correcta.`
      );
    }
  }

  async function cargarLotes() {
    try {
      const respuesta = await fetch(API_LOTES, { headers: authHeaders });
      if (!respuesta.ok) throw new Error("No fue posible cargar los lotes.");
      setLotes(listaDe(await respuesta.json()));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    Promise.all([cargarCosechas(), cargarLotes()]).finally(() => setCargando(false));
  }, []);

  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  function nuevaCosecha() {
    setCosechaEditando(null);
    setFormulario(formularioInicial());
    setErrorForm("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function editarCosecha(cosecha) {
    setCosechaEditando(cosecha.id);
    setFormulario({
      lote: String(cosecha.lote ?? ""),
      fecha_cosecha: cosecha.fecha_cosecha || "",
      cantidad: cosecha.cantidad ?? "",
      unidad_medida: cosecha.unidad_medida || "KG",
      observaciones: cosecha.observaciones || "",
    });
    setErrorForm("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setCosechaEditando(null);
    setFormulario(formularioInicial());
    setErrorForm("");
  }

  async function guardarCosecha(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm("");
    setMensaje("");

    const editando = cosechaEditando !== null;
    const url = editando ? `${API_COSECHAS}${cosechaEditando}/` : API_COSECHAS;

    try {
      const respuesta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ ...formulario, lote: Number(formulario.lote) }),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(textoError(datos, "No fue posible guardar la cosecha."));
      }

      cerrarFormulario();
      setMensaje(
        editando
          ? "Cosecha actualizada correctamente."
          : "Cosecha registrada correctamente."
      );
      await cargarCosechas();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // ---------- Indicadores (datos reales) ----------
  const pesadas = cosechas.filter((c) => aToneladas(c) !== null);
  const sinPeso = cosechas.length - pesadas.length;
  const totalToneladas = pesadas.reduce((suma, c) => suma + aToneladas(c), 0);
  const promedio = pesadas.length ? totalToneladas / pesadas.length : 0;

  const hoy = new Date();
  const mesActual = hoy.getFullYear() * 12 + hoy.getMonth();
  const cosechasEsteMes = cosechas.filter((c) => mesDe(c.fecha_cosecha) === mesActual).length;
  const toneladasDelMes = (mes) =>
    pesadas
      .filter((c) => mesDe(c.fecha_cosecha) === mes)
      .reduce((suma, c) => suma + aToneladas(c), 0);
  const toneladasMesAnterior = toneladasDelMes(mesActual - 1);
  const variacionProduccion =
    toneladasMesAnterior > 0
      ? Math.round(((toneladasDelMes(mesActual) - toneladasMesAnterior) * 100) / toneladasMesAnterior)
      : null;

  const fincasConCosecha = new Set(cosechas.map((c) => c.nombre_finca)).size;

  // ---------- Filtros y paginación ----------
  const fincasOpciones = [...new Set(cosechas.map((c) => c.nombre_finca))].sort((a, b) =>
    a.localeCompare(b, "es")
  );
  const cultivosOpciones = [...new Set(cosechas.map((c) => c.nombre_tipo_cultivo))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  const filtradas = cosechas.filter((c) => {
    const texto = [c.nombre_finca, c.nombre_lote, c.nombre_tipo_cultivo, c.observaciones]
      .join(" ")
      .toLowerCase();

    return (
      texto.includes(busqueda.toLowerCase()) &&
      (!desde || c.fecha_cosecha >= desde) &&
      (!hasta || c.fecha_cosecha <= hasta) &&
      (filtroFinca === "todas" || c.nombre_finca === filtroFinca) &&
      (filtroCultivo === "todos" || c.nombre_tipo_cultivo === filtroCultivo) &&
      (filtroUnidad === "todas" || c.unidad_medida === filtroUnidad)
    );
  });

  const hayFiltros =
    busqueda || desde || hasta || filtroFinca !== "todas" || filtroCultivo !== "todos" || filtroUnidad !== "todas";

  function limpiarFiltros() {
    setBusqueda("");
    setDesde("");
    setHasta("");
    setFiltroFinca("todas");
    setFiltroCultivo("todos");
    setFiltroUnidad("todas");
    setPagina(1);
  }

  function conFiltro(setter) {
    return (valor) => {
      setter(valor);
      setPagina(1);
    };
  }

  const total = filtradas.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA);

  // ---------- Gráfica: producción por cultivo (sobre los resultados filtrados) ----------
  const produccionPorCultivo = {};
  filtradas.forEach((c) => {
    const toneladas = aToneladas(c);
    if (toneladas === null) return;
    const nombre = c.nombre_tipo_cultivo || "Sin cultivo";
    produccionPorCultivo[nombre] = (produccionPorCultivo[nombre] || 0) + toneladas;
  });
  const datosGrafica = Object.entries(produccionPorCultivo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maximoGrafica = Math.max(0, ...datosGrafica.map(([, valor]) => valor));
  const filtradasSinPeso = filtradas.filter((c) => aToneladas(c) === null).length;

  const lotesDisponibles = lotes.filter(
    (l) => l.activo || String(l.id) === String(formulario.lote)
  );

  return (
    <div className="ch-page">
      <header className="ch-header">
        <div className="ch-titulo">
          <ShoppingBasket size={38} strokeWidth={1.6} />
          <div>
            <h1>Cosechas y producción</h1>
            <p>Registra y consulta las cosechas de la región.</p>
          </div>
        </div>

        <button className="ch-btn-primary" onClick={nuevaCosecha}>
          <Plus size={18} /> Registrar cosecha
        </button>
      </header>

      <section className="ch-kpis">
        <article className="ch-card ch-kpi">
          <div className="ch-kpi-icon"><Leaf size={24} /></div>
          <div>
            <span>Total cosechas</span>
            <strong>{cosechas.length}</strong>
            {cosechasEsteMes > 0 && <small className="ch-up">↑ +{cosechasEsteMes} este mes</small>}
          </div>
        </article>

        <article className="ch-card ch-kpi">
          <div className="ch-kpi-icon"><Scale size={24} /></div>
          <div>
            <span>Producción total</span>
            <strong>{formatearToneladas(totalToneladas)} Ton</strong>
            {variacionProduccion !== null ? (
              <small className={variacionProduccion >= 0 ? "ch-up" : "ch-down"}>
                {variacionProduccion >= 0 ? "↑" : "↓"} {Math.abs(variacionProduccion)}% vs. mes anterior
              </small>
            ) : (
              <small>en kilogramos y toneladas</small>
            )}
          </div>
        </article>

        <article className="ch-card ch-kpi">
          <div className="ch-kpi-icon"><Tractor size={24} /></div>
          <div>
            <span>Fincas con cosecha</span>
            <strong>{fincasConCosecha}</strong>
            <small>con al menos un registro</small>
          </div>
        </article>

        <article className="ch-card ch-kpi">
          <div className="ch-kpi-icon"><TrendingUp size={24} /></div>
          <div>
            <span>Promedio por cosecha</span>
            <strong>{formatearToneladas(promedio)} Ton</strong>
            <small>{sinPeso > 0 ? `sin contar ${sinPeso} en cajas/unidades` : "por registro"}</small>
          </div>
        </article>
      </section>

      {mensaje && (
        <div className="ch-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="ch-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error"><X size={16} /></button>
        </div>
      )}

      <section className="ch-card ch-panel">
        <div className="ch-filtros">
          <label className="ch-busqueda">
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar por finca, lote, cultivo u observación..."
              value={busqueda}
              onChange={(e) => conFiltro(setBusqueda)(e.target.value)}
            />
          </label>

          <div className="ch-rango">
            <CalendarDays size={18} />
            <label>
              <span>Desde</span>
              <input type="date" value={desde} max={hasta || undefined} onChange={(e) => conFiltro(setDesde)(e.target.value)} />
            </label>
            <label>
              <span>Hasta</span>
              <input type="date" value={hasta} min={desde || undefined} onChange={(e) => conFiltro(setHasta)(e.target.value)} />
            </label>
          </div>

          <select value={filtroFinca} onChange={(e) => conFiltro(setFiltroFinca)(e.target.value)} aria-label="Filtrar por finca">
            <option value="todas">Todas las fincas</option>
            {fincasOpciones.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select value={filtroCultivo} onChange={(e) => conFiltro(setFiltroCultivo)(e.target.value)} aria-label="Filtrar por cultivo">
            <option value="todos">Todos los cultivos</option>
            {cultivosOpciones.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select value={filtroUnidad} onChange={(e) => conFiltro(setFiltroUnidad)(e.target.value)} aria-label="Filtrar por unidad">
            <option value="todas">Todas las unidades</option>
            {UNIDADES.map(([valor, nombre]) => (
              <option key={valor} value={valor}>{nombre}</option>
            ))}
          </select>

          {hayFiltros && (
            <button type="button" className="ch-btn-secundario" onClick={limpiarFiltros}>
              Limpiar
            </button>
          )}
        </div>

        {cargando ? (
          <div className="ch-vacio">Cargando cosechas...</div>
        ) : total === 0 ? (
          <div className="ch-vacio">
            <ShoppingBasket size={38} strokeWidth={1.4} />
            <h3>No hay cosechas para mostrar</h3>
            <p>Registra una cosecha o cambia los filtros de búsqueda.</p>
            <button className="ch-btn-primary" onClick={nuevaCosecha}>Registrar cosecha</button>
          </div>
        ) : (
          <div className="ch-tabla-contenedor">
            <table className="ch-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Finca</th>
                  <th>Lote</th>
                  <th>Cultivo</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((cosecha) => (
                  <tr key={cosecha.id}>
                    <td>{formatearFecha(cosecha.fecha_cosecha)}</td>
                    <td><strong className="ch-nombre">{cosecha.nombre_finca}</strong></td>
                    <td>{cosecha.nombre_lote}</td>
                    <td>{cosecha.nombre_tipo_cultivo}</td>
                    <td>{formatearCantidad(cosecha.cantidad)}</td>
                    <td>{cosecha.unidad_medida_display}</td>
                    <td className="ch-obs" title={cosecha.observaciones}>{cosecha.observaciones || "—"}</td>
                    <td>
                      <div className="ch-acciones">
                        <button className="ch-accion ver" onClick={() => setCosechaViendo(cosecha)} title="Ver detalle" aria-label="Ver detalle">
                          <Eye size={17} />
                        </button>
                        <button className="ch-accion editar" onClick={() => editarCosecha(cosecha)} title="Editar cosecha" aria-label="Editar cosecha">
                          <Pencil size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!cargando && total > 0 && (
          <footer className="ch-paginacion">
            <span>
              Mostrando {inicio + 1} - {inicio + visibles.length} de {total} cosechas
            </span>
            <div className="ch-paginas">
              <button onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual === 1} aria-label="Página anterior">
                <ChevronLeft size={16} />
              </button>
              {numerosDePagina(paginaActual, totalPaginas).map((n) => (
                <button key={n} className={n === paginaActual ? "activa" : ""} onClick={() => setPagina(n)}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} aria-label="Página siguiente">
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      <div className="ch-abajo">
        <section className="ch-card">
          <h3 className="ch-card-titulo"><BarChart3 size={20} /> Producción por cultivo</h3>

          {datosGrafica.length === 0 ? (
            <p className="ch-grafica-vacio">Aún no hay producción en kilogramos o toneladas para graficar.</p>
          ) : (
            <>
              <div className="ch-grafica" role="img" aria-label="Producción por cultivo en toneladas">
                {datosGrafica.map(([nombre, valor], i) => (
                  <div key={nombre} className="ch-col">
                    <div className="ch-col-area">
                      <span className="ch-col-valor">{formatearToneladas(valor)} Tn</span>
                      <div
                        className="ch-col-barra"
                        style={{
                          height: `${Math.max((valor / maximoGrafica) * 150, 4)}px`,
                          background: COLORES_GRAFICA[i % COLORES_GRAFICA.length],
                        }}
                      />
                    </div>
                    <span className="ch-col-nombre">{nombre}</span>
                  </div>
                ))}
              </div>
              {filtradasSinPeso > 0 && (
                <small className="ch-nota">
                  No incluye {filtradasSinPeso} {filtradasSinPeso === 1 ? "cosecha" : "cosechas"} en cajas o unidades.
                </small>
              )}
            </>
          )}
        </section>

        <aside className="ch-banner" style={{ "--ch-banner": `url(${fondoBanner})` }}>
          <Leaf size={34} />
          <h3>Sistema AgroSmart Urabá</h3>
          <p>Tecnología que impulsa el campo</p>
        </aside>
      </div>

      {/* Modal: detalle */}
      {cosechaViendo && (
        <div className="ch-modal-fondo">
          <section className="ch-modal" role="dialog" aria-modal="true">
            <header className="ch-modal-header">
              <div>
                <span className="ch-eyebrow">DETALLE DE LA COSECHA</span>
                <h2>{cosechaViendo.nombre_tipo_cultivo} · {formatearFecha(cosechaViendo.fecha_cosecha)}</h2>
              </div>
              <button type="button" className="ch-modal-cerrar" onClick={() => setCosechaViendo(null)} aria-label="Cerrar detalle">
                <X size={18} />
              </button>
            </header>

            <dl className="ch-detalle">
              <div><dt>Finca</dt><dd>{cosechaViendo.nombre_finca}</dd></div>
              <div><dt>Lote</dt><dd>{cosechaViendo.nombre_lote}</dd></div>
              <div><dt>Cultivo</dt><dd>{cosechaViendo.nombre_tipo_cultivo}</dd></div>
              <div>
                <dt>Cantidad</dt>
                <dd>{formatearCantidad(cosechaViendo.cantidad)} {cosechaViendo.unidad_medida_display}</dd>
              </div>
              <div>
                <dt>Fecha de registro</dt>
                <dd>
                  {new Date(cosechaViendo.fecha_creacion).toLocaleDateString("es-CO", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </dd>
              </div>
              <div className="ch-campo-completo">
                <dt>Observaciones</dt>
                <dd>{cosechaViendo.observaciones || "Sin observaciones"}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {/* Modal: registrar / editar */}
      {mostrarFormulario && (
        <div className="ch-modal-fondo">
          <section className="ch-modal" role="dialog" aria-modal="true" aria-labelledby="ch-modal-titulo">
            <header className="ch-modal-header">
              <div>
                <span className="ch-eyebrow">INFORMACIÓN DE LA COSECHA</span>
                <h2 id="ch-modal-titulo">
                  {cosechaEditando !== null ? "Editar cosecha" : "Registrar cosecha"}
                </h2>
                <p>Completa los datos para guardar el registro.</p>
              </div>
              <button type="button" className="ch-modal-cerrar" onClick={cerrarFormulario} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {lotesDisponibles.length === 0 && (
              <div className="ch-alerta error">
                No hay lotes activos. <Link to="/cultivos">Registra un lote</Link> antes de crear una cosecha.
              </div>
            )}

            {errorForm && <div className="ch-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={guardarCosecha}>
              <div className="ch-form-grid">
                <label className="ch-campo-completo">
                  Lote *
                  <select name="lote" value={formulario.lote} onChange={cambiarCampo} required>
                    <option value="">Selecciona un lote</option>
                    {lotesDisponibles.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre} — {l.nombre_finca} ({l.nombre_tipo_cultivo})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Fecha de cosecha *
                  <input
                    name="fecha_cosecha"
                    type="date"
                    max={hoyISO()}
                    value={formulario.fecha_cosecha}
                    onChange={cambiarCampo}
                    required
                  />
                </label>

                <label>
                  Unidad de medida *
                  <select name="unidad_medida" value={formulario.unidad_medida} onChange={cambiarCampo} required>
                    {UNIDADES.map(([valor, nombre]) => (
                      <option key={valor} value={valor}>{nombre}</option>
                    ))}
                  </select>
                </label>

                <label className="ch-campo-completo">
                  Cantidad *
                  <input
                    name="cantidad"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formulario.cantidad}
                    onChange={cambiarCampo}
                    required
                  />
                </label>

                <label className="ch-campo-completo">
                  Observaciones
                  <textarea
                    name="observaciones"
                    value={formulario.observaciones}
                    onChange={cambiarCampo}
                    rows={3}
                    placeholder="Información adicional de la cosecha..."
                  />
                </label>
              </div>

              <footer className="ch-modal-footer">
                <button type="button" className="ch-btn-secundario" onClick={cerrarFormulario} disabled={guardando}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ch-btn-primary"
                  disabled={guardando || lotesDisponibles.length === 0}
                >
                  {guardando ? "Guardando..." : cosechaEditando !== null ? "Guardar cambios" : "Registrar cosecha"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Cosechas;