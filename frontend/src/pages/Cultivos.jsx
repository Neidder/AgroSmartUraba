import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Sprout,
  Warehouse,
  Leaf,
  LayoutGrid,
  CheckCircle2,
  Ruler,
  Plus,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import "../styles/Cultivos.css";

const API_BASE = "http://127.0.0.1:8000";
// Verifica este prefijo en el urls.py principal del backend
// (debe coincidir con el include("cultivos.urls")).
const API_CULTIVOS = `${API_BASE}/api_cultivos`;
const API_LOTES = `${API_CULTIVOS}/lotes/`;
const API_TIPOS = `${API_CULTIVOS}/tipos-cultivo/`;
const API_FINCAS = `${API_BASE}/api_fincas/fincas/`;
const POR_PAGINA = 10;

const loteInicial = {
  finca: "",
  tipo_cultivo: "",
  nombre: "",
  hectareas: "",
  fecha_siembra: "",
  fecha_fin_estimada: "",
  observaciones: "",
  activo: true,
};

const tipoInicial = { nombre: "", descripcion: "", activo: true };

const ETIQUETAS = {
  finca: "Finca",
  tipo_cultivo: "Tipo de cultivo",
  nombre: "Nombre",
  descripcion: "Descripción",
  hectareas: "Hectáreas",
  fecha_siembra: "Fecha de siembra",
  fecha_fin_estimada: "Fecha estimada",
  observaciones: "Observaciones",
  activo: "Estado",
};

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

function formatearHectareas(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

// Las fechas llegan como "AAAA-MM-DD"; se arman a mano para evitar desfases de zona horaria.
function formatearFecha(texto) {
  if (!texto) return "No registrada";
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function numerosDePagina(actual, total) {
  const max = 5;
  let fin = Math.min(total, Math.max(1, actual - 2) + max - 1);
  const inicio = Math.max(1, fin - max + 1);
  fin = Math.min(total, fin);
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

function Cultivos() {
  const [lotes, setLotes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [fincas, setFincas] = useState([]);

  const [formLote, setFormLote] = useState(loteInicial);
  const [loteEditando, setLoteEditando] = useState(null);
  const [mostrarLote, setMostrarLote] = useState(false);
  const [loteViendo, setLoteViendo] = useState(null);

  const [formTipo, setFormTipo] = useState(tipoInicial);
  const [tipoEditando, setTipoEditando] = useState(null);
  const [mostrarTipo, setMostrarTipo] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroFinca, setFiltroFinca] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [mensaje, setMensaje] = useState("");

  const token = localStorage.getItem("token");
  const authHeaders = token ? { Authorization: `Token ${token}` } : {};

  async function pedirLista(url, mensajeError) {
    const respuesta = await fetch(url, { headers: authHeaders });
    if (!respuesta.ok) throw new Error(mensajeError);
    return listaDe(await respuesta.json());
  }

  async function cargarLotes() {
    try {
      setLotes(await pedirLista(API_LOTES, "No fue posible cargar los lotes."));
    } catch (err) {
      setError(
        `${err.message} Verifica que Django esté funcionando y que la URL de la API sea correcta.`
      );
    }
  }

  async function cargarTipos() {
    try {
      setTipos(await pedirLista(API_TIPOS, "No fue posible cargar los tipos de cultivo."));
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarFincas() {
    try {
      setFincas(await pedirLista(API_FINCAS, "No fue posible cargar las fincas."));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    Promise.all([cargarLotes(), cargarTipos(), cargarFincas()]).finally(() =>
      setCargando(false)
    );
  }, []);

  // ---------- Lotes ----------
  function cambiarLote(evento) {
    const { name, value, type, checked } = evento.target;
    setFormLote((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevoLote() {
    setLoteEditando(null);
    setFormLote(loteInicial);
    setErrorForm("");
    setMensaje("");
    setMostrarLote(true);
  }

  function editarLote(lote) {
    setLoteEditando(lote.id);
    setFormLote({
      finca: String(lote.finca ?? ""),
      tipo_cultivo: String(lote.tipo_cultivo ?? ""),
      nombre: lote.nombre || "",
      hectareas: lote.hectareas ?? "",
      fecha_siembra: lote.fecha_siembra || "",
      fecha_fin_estimada: lote.fecha_fin_estimada || "",
      observaciones: lote.observaciones || "",
      activo: lote.activo,
    });
    setErrorForm("");
    setMensaje("");
    setMostrarLote(true);
  }

  function cerrarLote() {
    setMostrarLote(false);
    setLoteEditando(null);
    setFormLote(loteInicial);
    setErrorForm("");
  }

  async function guardarLote(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm("");
    setMensaje("");

    const editando = loteEditando !== null;
    const url = editando ? `${API_LOTES}${loteEditando}/` : API_LOTES;

    try {
      const respuesta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          ...formLote,
          finca: Number(formLote.finca),
          tipo_cultivo: Number(formLote.tipo_cultivo),
          fecha_siembra: formLote.fecha_siembra || null,
          fecha_fin_estimada: formLote.fecha_fin_estimada || null,
        }),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(textoError(datos, "No fue posible guardar el lote."));
      }

      cerrarLote();
      setMensaje(editando ? "Lote actualizado correctamente." : "Lote registrado correctamente.");
      await cargarLotes();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstadoLote(lote) {
    const accion = lote.activo ? "desactivar" : "activar";
    if (!window.confirm(`¿Deseas ${accion} el lote "${lote.nombre}"?`)) return;

    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(`${API_LOTES}${lote.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ activo: !lote.activo }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(textoError(datos, "No fue posible cambiar el estado del lote."));
      }

      setMensaje(`Lote ${lote.activo ? "desactivado" : "activado"} correctamente.`);
      await cargarLotes();
    } catch (err) {
      setError(err.message);
    }
  }

  // ---------- Tipos de cultivo ----------
  function cambiarTipo(evento) {
    const { name, value, type, checked } = evento.target;
    setFormTipo((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevoTipo() {
    setTipoEditando(null);
    setFormTipo(tipoInicial);
    setErrorForm("");
    setMensaje("");
    setMostrarTipo(true);
  }

  function editarTipo(tipo) {
    setTipoEditando(tipo.id);
    setFormTipo({
      nombre: tipo.nombre || "",
      descripcion: tipo.descripcion || "",
      activo: tipo.activo,
    });
    setErrorForm("");
    setMensaje("");
    setMostrarTipo(true);
  }

  function cerrarTipo() {
    setMostrarTipo(false);
    setTipoEditando(null);
    setFormTipo(tipoInicial);
    setErrorForm("");
  }

  async function guardarTipo(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm("");
    setMensaje("");

    const editando = tipoEditando !== null;
    const url = editando ? `${API_TIPOS}${tipoEditando}/` : API_TIPOS;

    try {
      const respuesta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(formTipo),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(textoError(datos, "No fue posible guardar el tipo de cultivo."));
      }

      cerrarTipo();
      setMensaje(
        editando
          ? "Tipo de cultivo actualizado correctamente."
          : "Tipo de cultivo registrado correctamente."
      );
      await cargarTipos();
      await cargarLotes(); // los lotes muestran el nombre del tipo
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstadoTipo(tipo) {
    const accion = tipo.activo ? "desactivar" : "activar";
    if (!window.confirm(`¿Deseas ${accion} el tipo de cultivo "${tipo.nombre}"?`)) return;

    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(`${API_TIPOS}${tipo.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ activo: !tipo.activo }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(textoError(datos, "No fue posible cambiar el estado del tipo."));
      }

      setMensaje(`Tipo de cultivo ${tipo.activo ? "desactivado" : "activado"} correctamente.`);
      await cargarTipos();
    } catch (err) {
      setError(err.message);
    }
  }

  // ---------- Indicadores (datos reales) ----------
  const lotesActivos = lotes.filter((l) => l.activo);
  const areaSembrada = lotesActivos.reduce((suma, l) => suma + Number(l.hectareas || 0), 0);
  const tiposActivos = tipos.filter((t) => t.activo);
  const ahora = new Date();
  const nuevosEsteMes = lotes.filter((l) => {
    const d = new Date(l.fecha_creacion);
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  }).length;
  const porcentajeActivos = lotes.length
    ? Math.round((lotesActivos.length * 100) / lotes.length)
    : 0;

  // Cultivos más comunes: lotes activos agrupados por tipo
  const conteoTipos = {};
  lotesActivos.forEach((l) => {
    const nombre = l.nombre_tipo_cultivo || "Sin tipo";
    conteoTipos[nombre] = (conteoTipos[nombre] || 0) + 1;
  });
  const masComunes = Object.entries(conteoTipos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ---------- Filtros y paginación ----------
  const filtrados = lotes.filter((lote) => {
    const texto = [lote.nombre, lote.nombre_finca, lote.nombre_tipo_cultivo]
      .join(" ")
      .toLowerCase();

    return (
      texto.includes(busqueda.toLowerCase()) &&
      (filtroFinca === "todas" || String(lote.finca) === filtroFinca) &&
      (filtroTipo === "todos" || String(lote.tipo_cultivo) === filtroTipo) &&
      (filtroEstado === "todos" ||
        (filtroEstado === "activos" && lote.activo) ||
        (filtroEstado === "inactivos" && !lote.activo))
    );
  });

  const total = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtrados.slice(inicio, inicio + POR_PAGINA);

  function conFiltro(setter) {
    return (valor) => {
      setter(valor);
      setPagina(1);
    };
  }

  const fincasDisponibles = fincas.filter(
    (f) => f.activa || String(f.id) === String(formLote.finca)
  );
  const tiposDisponibles = tipos.filter(
    (t) => t.activo || String(t.id) === String(formLote.tipo_cultivo)
  );

  return (
    <div className="cv-page">
      <header className="cv-header">
        <div className="cv-titulo">
          <Sprout size={38} strokeWidth={1.6} />
          <div>
            <h1>Cultivos y lotes</h1>
            <p>Organiza los tipos de cultivo y su distribución en las fincas.</p>
          </div>
        </div>

        <div className="cv-header-acciones">
          <button className="cv-btn-secundario" onClick={nuevoTipo}>
            <Leaf size={17} /> Tipo de cultivo
          </button>
          <button className="cv-btn-primary" onClick={nuevoLote}>
            <Plus size={18} /> Nuevo lote
          </button>
        </div>
      </header>

      <section className="cv-kpis">
        <article className="cv-card cv-kpi">
          <div className="cv-kpi-icon"><LayoutGrid size={24} /></div>
          <div>
            <span>Total de lotes</span>
            <strong>{lotes.length}</strong>
            {nuevosEsteMes > 0 && <small className="cv-up">↑ +{nuevosEsteMes} este mes</small>}
          </div>
        </article>

        <article className="cv-card cv-kpi">
          <div className="cv-kpi-icon"><CheckCircle2 size={24} /></div>
          <div>
            <span>Lotes activos</span>
            <strong>{lotesActivos.length}</strong>
            {lotes.length > 0 && <small className="cv-up">{porcentajeActivos}% del total</small>}
          </div>
        </article>

        <article className="cv-card cv-kpi">
          <div className="cv-kpi-icon"><Ruler size={24} /></div>
          <div>
            <span>Área sembrada (ha)</span>
            <strong>{formatearHectareas(areaSembrada)}</strong>
            <small>de lotes activos</small>
          </div>
        </article>

        <article className="cv-card cv-kpi">
          <div className="cv-kpi-icon"><Leaf size={24} /></div>
          <div>
            <span>Tipos de cultivo activos</span>
            <strong>{tiposActivos.length}</strong>
            <small>en el catálogo</small>
          </div>
        </article>
      </section>

      {mensaje && (
        <div className="cv-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="cv-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error"><X size={16} /></button>
        </div>
      )}

      <div className="cv-grid">
        <section className="cv-card cv-panel">
          <nav className="cv-tabs" aria-label="Fincas y cultivos">
            <NavLink to="/fincas" end className={({ isActive }) => `cv-tab ${isActive ? "cv-tab--activa" : ""}`}>
              <Warehouse size={17} /> Fincas
            </NavLink>
            <NavLink to="/cultivos" className={({ isActive }) => `cv-tab ${isActive ? "cv-tab--activa" : ""}`}>
              <Sprout size={17} /> Cultivos
            </NavLink>
          </nav>

          <div className="cv-filtros">
            <label className="cv-busqueda">
              <Search size={18} />
              <input
                type="search"
                placeholder="Buscar por lote, finca o tipo..."
                value={busqueda}
                onChange={(e) => conFiltro(setBusqueda)(e.target.value)}
              />
            </label>

            <select value={filtroFinca} onChange={(e) => conFiltro(setFiltroFinca)(e.target.value)} aria-label="Filtrar por finca">
              <option value="todas">Todas las fincas</option>
              {fincas.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>

            <select value={filtroTipo} onChange={(e) => conFiltro(setFiltroTipo)(e.target.value)} aria-label="Filtrar por tipo de cultivo">
              <option value="todos">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>

            <select value={filtroEstado} onChange={(e) => conFiltro(setFiltroEstado)(e.target.value)} aria-label="Filtrar por estado">
              <option value="todos">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>

          {cargando ? (
            <div className="cv-vacio">Cargando lotes...</div>
          ) : total === 0 ? (
            <div className="cv-vacio">
              <Sprout size={38} strokeWidth={1.4} />
              <h3>No hay lotes para mostrar</h3>
              <p>Registra un lote o cambia los filtros de búsqueda.</p>
              <button className="cv-btn-primary" onClick={nuevoLote}>Registrar lote</button>
            </div>
          ) : (
            <div className="cv-tabla-contenedor">
              <table className="cv-tabla">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th>Finca</th>
                    <th>Tipo de cultivo</th>
                    <th>Área (ha)</th>
                    <th>Siembra</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((lote) => (
                    <tr key={lote.id}>
                      <td><strong className="cv-nombre">{lote.nombre}</strong></td>
                      <td>{lote.nombre_finca}</td>
                      <td>{lote.nombre_tipo_cultivo}</td>
                      <td>{formatearHectareas(lote.hectareas)}</td>
                      <td>{lote.fecha_siembra ? formatearFecha(lote.fecha_siembra) : "—"}</td>
                      <td>
                        <span className={`cv-estado ${lote.activo ? "activa" : "inactiva"}`}>
                          {lote.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <div className="cv-acciones">
                          <button className="cv-accion ver" onClick={() => setLoteViendo(lote)} title="Ver detalle" aria-label="Ver detalle">
                            <Eye size={17} />
                          </button>
                          <button className="cv-accion editar" onClick={() => editarLote(lote)} title="Editar lote" aria-label="Editar lote">
                            <Pencil size={17} />
                          </button>
                          <button
                            className={`cv-accion ${lote.activo ? "desactivar" : "activar"}`}
                            onClick={() => cambiarEstadoLote(lote)}
                            title={lote.activo ? "Desactivar lote" : "Activar lote"}
                            aria-label={lote.activo ? "Desactivar lote" : "Activar lote"}
                          >
                            {lote.activo ? <PowerOff size={17} /> : <Power size={17} />}
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
            <footer className="cv-paginacion">
              <span>
                Mostrando {inicio + 1} - {inicio + visibles.length} de {total} lotes
              </span>
              <div className="cv-paginas">
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

        <aside className="cv-side">
          <section className="cv-card">
            <h3 className="cv-side-titulo"><Sprout size={18} /> Cultivos más comunes</h3>
            {masComunes.length === 0 ? (
              <p className="cv-side-vacio">Aún no hay lotes activos.</p>
            ) : (
              <ul className="cv-barras">
                {masComunes.map(([nombre, cantidad]) => {
                  const porcentaje = Math.round((cantidad * 100) / lotesActivos.length);
                  return (
                    <li key={nombre}>
                      <div className="cv-barra-texto">
                        <span>{nombre}</span>
                        <strong>{cantidad} {cantidad === 1 ? "lote" : "lotes"} · {porcentaje}%</strong>
                      </div>
                      <div className="cv-barra"><div style={{ width: `${porcentaje}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="cv-card">
            <div className="cv-side-cabecera">
              <h3 className="cv-side-titulo"><Leaf size={18} /> Tipos de cultivo</h3>
              <button className="cv-accion editar" onClick={nuevoTipo} title="Nuevo tipo de cultivo" aria-label="Nuevo tipo de cultivo">
                <Plus size={17} />
              </button>
            </div>

            {tipos.length === 0 ? (
              <p className="cv-side-vacio">Aún no hay tipos de cultivo registrados.</p>
            ) : (
              <ul className="cv-tipos">
                {tipos.map((tipo) => (
                  <li key={tipo.id} className={`cv-tipo ${tipo.activo ? "" : "cv-tipo--inactivo"}`}>
                    <div className="cv-tipo-info">
                      <strong>{tipo.nombre}</strong>
                      <small>{tipo.activo ? "Activo" : "Inactivo"}</small>
                    </div>
                    <button className="cv-accion editar pequena" onClick={() => editarTipo(tipo)} title="Editar tipo" aria-label="Editar tipo">
                      <Pencil size={15} />
                    </button>
                    <button
                      className={`cv-accion pequena ${tipo.activo ? "desactivar" : "activar"}`}
                      onClick={() => cambiarEstadoTipo(tipo)}
                      title={tipo.activo ? "Desactivar tipo" : "Activar tipo"}
                      aria-label={tipo.activo ? "Desactivar tipo" : "Activar tipo"}
                    >
                      {tipo.activo ? <PowerOff size={15} /> : <Power size={15} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {/* Modal: detalle del lote */}
      {loteViendo && (
        <div className="cv-modal-fondo">
          <section className="cv-modal" role="dialog" aria-modal="true">
            <header className="cv-modal-header">
              <div>
                <span className="cv-eyebrow">DETALLE DEL LOTE</span>
                <h2>{loteViendo.nombre}</h2>
              </div>
              <button type="button" className="cv-modal-cerrar" onClick={() => setLoteViendo(null)} aria-label="Cerrar detalle">
                <X size={18} />
              </button>
            </header>

            <dl className="cv-detalle">
              <div><dt>Finca</dt><dd>{loteViendo.nombre_finca}</dd></div>
              <div><dt>Tipo de cultivo</dt><dd>{loteViendo.nombre_tipo_cultivo}</dd></div>
              <div><dt>Área</dt><dd>{formatearHectareas(loteViendo.hectareas)} ha</dd></div>
              <div><dt>Estado</dt><dd>{loteViendo.activo ? "Activo" : "Inactivo"}</dd></div>
              <div><dt>Fecha de siembra</dt><dd>{formatearFecha(loteViendo.fecha_siembra)}</dd></div>
              <div><dt>Fecha estimada de fin</dt><dd>{formatearFecha(loteViendo.fecha_fin_estimada)}</dd></div>
              <div className="cv-campo-completo">
                <dt>Observaciones</dt>
                <dd>{loteViendo.observaciones || "Sin observaciones"}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {/* Modal: crear / editar lote */}
      {mostrarLote && (
        <div className="cv-modal-fondo">
          <section className="cv-modal" role="dialog" aria-modal="true" aria-labelledby="cv-lote-titulo">
            <header className="cv-modal-header">
              <div>
                <span className="cv-eyebrow">INFORMACIÓN DEL LOTE</span>
                <h2 id="cv-lote-titulo">{loteEditando !== null ? "Editar lote" : "Registrar lote"}</h2>
                <p>Completa los datos para guardar el registro.</p>
              </div>
              <button type="button" className="cv-modal-cerrar" onClick={cerrarLote} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {fincasDisponibles.length === 0 && (
              <div className="cv-alerta error">
                No hay fincas activas. <Link to="/fincas">Registra una finca</Link> antes de crear un lote.
              </div>
            )}

            {tiposDisponibles.length === 0 && (
              <div className="cv-alerta error">
                No hay tipos de cultivo activos.{" "}
                <button type="button" className="cv-enlace" onClick={() => { cerrarLote(); nuevoTipo(); }}>
                  Registra un tipo de cultivo
                </button>{" "}
                antes de crear un lote.
              </div>
            )}

            {errorForm && <div className="cv-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={guardarLote}>
              <div className="cv-form-grid">
                <label>
                  Finca *
                  <select name="finca" value={formLote.finca} onChange={cambiarLote} required>
                    <option value="">Selecciona una finca</option>
                    {fincasDisponibles.map((f) => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Tipo de cultivo *
                  <select name="tipo_cultivo" value={formLote.tipo_cultivo} onChange={cambiarLote} required>
                    <option value="">Selecciona un tipo</option>
                    {tiposDisponibles.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Nombre del lote *
                  <input name="nombre" value={formLote.nombre} onChange={cambiarLote} maxLength={100} placeholder="Ej. Lote 1" required />
                </label>

                <label>
                  Hectáreas *
                  <input name="hectareas" type="number" min="0.01" step="0.01" value={formLote.hectareas} onChange={cambiarLote} required />
                </label>

                <label>
                  Fecha de siembra
                  <input name="fecha_siembra" type="date" value={formLote.fecha_siembra} onChange={cambiarLote} />
                </label>

                <label>
                  Fecha estimada de fin
                  <input name="fecha_fin_estimada" type="date" value={formLote.fecha_fin_estimada} onChange={cambiarLote} />
                </label>

                <label className="cv-campo-completo">
                  Observaciones
                  <textarea name="observaciones" value={formLote.observaciones} onChange={cambiarLote} rows={3} placeholder="Información adicional del lote..." />
                </label>

                {loteEditando !== null && (
                  <label className="cv-checkbox cv-campo-completo">
                    <input type="checkbox" name="activo" checked={Boolean(formLote.activo)} onChange={cambiarLote} />
                    Lote activo
                  </label>
                )}
              </div>

              <footer className="cv-modal-footer">
                <button type="button" className="cv-btn-secundario" onClick={cerrarLote} disabled={guardando}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="cv-btn-primary"
                  disabled={guardando || fincasDisponibles.length === 0 || tiposDisponibles.length === 0}
                >
                  {guardando ? "Guardando..." : loteEditando !== null ? "Guardar cambios" : "Registrar lote"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Modal: crear / editar tipo de cultivo */}
      {mostrarTipo && (
        <div className="cv-modal-fondo">
          <section className="cv-modal cv-modal--chico" role="dialog" aria-modal="true" aria-labelledby="cv-tipo-titulo">
            <header className="cv-modal-header">
              <div>
                <span className="cv-eyebrow">CATÁLOGO</span>
                <h2 id="cv-tipo-titulo">{tipoEditando !== null ? "Editar tipo de cultivo" : "Nuevo tipo de cultivo"}</h2>
                <p>Los tipos se usan al registrar lotes.</p>
              </div>
              <button type="button" className="cv-modal-cerrar" onClick={cerrarTipo} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {errorForm && <div className="cv-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={guardarTipo}>
              <div className="cv-form-grid cv-form-grid--una">
                <label>
                  Nombre *
                  <input name="nombre" value={formTipo.nombre} onChange={cambiarTipo} maxLength={100} placeholder="Ej. Plátano" required />
                </label>

                <label>
                  Descripción
                  <textarea name="descripcion" value={formTipo.descripcion} onChange={cambiarTipo} rows={3} placeholder="Descripción opcional del cultivo..." />
                </label>

                {tipoEditando !== null && (
                  <label className="cv-checkbox">
                    <input type="checkbox" name="activo" checked={Boolean(formTipo.activo)} onChange={cambiarTipo} />
                    Tipo de cultivo activo
                  </label>
                )}
              </div>

              <footer className="cv-modal-footer">
                <button type="button" className="cv-btn-secundario" onClick={cerrarTipo} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="cv-btn-primary" disabled={guardando}>
                  {guardando ? "Guardando..." : tipoEditando !== null ? "Guardar cambios" : "Registrar tipo"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Cultivos;