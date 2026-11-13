import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Tractor,
  Sprout,
  Plus,
  Eye,
  Pencil,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useUsuario } from "../hooks/useUsuario";
import fondoBanner from "../assets/sidebar-bg.webp";
import "../styles/Actividades.css";

const API_BASE = "http://127.0.0.1:8000";
// Verifica este prefijo en el urls.py principal del backend
// (puedes copiarlo de services/actividadesService.js).
const API_ACTIVIDADES = `${API_BASE}/api_actividades/actividades/`;
const API_LOTES = `${API_BASE}/api_cultivos/lotes/`;
const POR_PAGINA = 10;

const TIPOS = [
  ["PREPARACION", "Preparación del terreno"],
  ["SIEMBRA", "Siembra"],
  ["RIEGO", "Riego"],
  ["FERTILIZACION", "Fertilización"],
  ["CONTROL_PLAGAS", "Control de plagas"],
  ["LIMPIEZA", "Limpieza"],
  ["PODA", "Poda"],
  ["COSECHA", "Cosecha"],
  ["OTRA", "Otra"],
];

const ETIQUETAS = {
  lote: "Lote",
  tipo: "Tipo de actividad",
  descripcion: "Descripción",
  fecha_actividad: "Fecha",
  costo: "Costo",
  observaciones: "Observaciones",
  activo: "Estado",
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
    tipo: "",
    descripcion: "",
    fecha_actividad: hoyISO(),
    costo: "0",
    observaciones: "",
    activo: true,
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

function formatearCosto(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function numerosDePagina(actual, total) {
  const max = 5;
  let fin = Math.min(total, Math.max(1, actual - 2) + max - 1);
  const inicio = Math.max(1, fin - max + 1);
  fin = Math.min(total, fin);
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

function Actividades() {
  const { nombre: nombreUsuario } = useUsuario();

  const [actividades, setActividades] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [actividadEditando, setActividadEditando] = useState(null);
  const [actividadViendo, setActividadViendo] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtroFinca, setFiltroFinca] = useState("todas");
  const [filtroCultivo, setFiltroCultivo] = useState("todos");
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

  async function cargarActividades() {
    try {
      const respuesta = await fetch(API_ACTIVIDADES, { headers: authHeaders });
      if (!respuesta.ok) throw new Error("No fue posible cargar las actividades.");
      setActividades(listaDe(await respuesta.json()));
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
    Promise.all([cargarActividades(), cargarLotes()]).finally(() => setCargando(false));
  }, []);

  function cambiarCampo(evento) {
    const { name, value, type, checked } = evento.target;
    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevaActividad() {
    setActividadEditando(null);
    setFormulario(formularioInicial());
    setErrorForm("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function editarActividad(actividad) {
    setActividadEditando(actividad.id);
    setFormulario({
      lote: String(actividad.lote ?? ""),
      tipo: actividad.tipo || "",
      descripcion: actividad.descripcion || "",
      fecha_actividad: actividad.fecha_actividad || "",
      costo: actividad.costo ?? "0",
      observaciones: actividad.observaciones || "",
      activo: actividad.activo,
    });
    setErrorForm("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setActividadEditando(null);
    setFormulario(formularioInicial());
    setErrorForm("");
  }

  async function guardarActividad(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm("");
    setMensaje("");

    const editando = actividadEditando !== null;
    const url = editando ? `${API_ACTIVIDADES}${actividadEditando}/` : API_ACTIVIDADES;

    try {
      const respuesta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          ...formulario,
          lote: Number(formulario.lote),
          costo: formulario.costo === "" ? 0 : formulario.costo,
        }),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(textoError(datos, "No fue posible guardar la actividad."));
      }

      cerrarFormulario();
      setMensaje(
        editando
          ? "Actividad actualizada correctamente."
          : "Actividad registrada correctamente."
      );
      await cargarActividades();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(actividad) {
    const accion = actividad.activo ? "archivar" : "restaurar";
    if (!window.confirm(`¿Deseas ${accion} esta actividad (${actividad.tipo_display})?`)) return;

    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(`${API_ACTIVIDADES}${actividad.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ activo: !actividad.activo }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(textoError(datos, "No fue posible cambiar el estado de la actividad."));
      }

      setMensaje(`Actividad ${actividad.activo ? "archivada" : "restaurada"} correctamente.`);
      await cargarActividades();
    } catch (err) {
      setError(err.message);
    }
  }

  // La actividad solo trae el lote: finca y cultivo salen de la lista de lotes.
  const lotesPorId = Object.fromEntries(lotes.map((l) => [l.id, l]));
  const filas = actividades.map((a) => {
    const lote = lotesPorId[a.lote];
    return {
      ...a,
      finca: lote?.nombre_finca || "—",
      cultivo: lote?.nombre_tipo_cultivo || "—",
    };
  });

  // ---------- Filtros y paginación ----------
  const fincasOpciones = [...new Set(filas.map((f) => f.finca))].sort((a, b) => a.localeCompare(b, "es"));
  const cultivosOpciones = [...new Set(filas.map((f) => f.cultivo))].sort((a, b) => a.localeCompare(b, "es"));

  const filtradas = filas.filter((a) => {
    const texto = [a.finca, a.nombre_lote, a.cultivo, a.tipo_display, a.nombre_responsable, a.descripcion]
      .join(" ")
      .toLowerCase();

    return (
      texto.includes(busqueda.toLowerCase()) &&
      (!desde || a.fecha_actividad >= desde) &&
      (!hasta || a.fecha_actividad <= hasta) &&
      (filtroFinca === "todas" || a.finca === filtroFinca) &&
      (filtroCultivo === "todos" || a.cultivo === filtroCultivo) &&
      (filtroTipo === "todos" || a.tipo === filtroTipo) &&
      (filtroEstado === "todos" ||
        (filtroEstado === "activas" && a.activo) ||
        (filtroEstado === "archivadas" && !a.activo))
    );
  });

  const hayFiltros =
    busqueda || desde || hasta || filtroFinca !== "todas" || filtroCultivo !== "todos" ||
    filtroTipo !== "todos" || filtroEstado !== "todos";

  function limpiarFiltros() {
    setBusqueda("");
    setDesde("");
    setHasta("");
    setFiltroFinca("todas");
    setFiltroCultivo("todos");
    setFiltroTipo("todos");
    setFiltroEstado("todos");
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

  const lotesDisponibles = lotes.filter(
    (l) => l.activo || String(l.id) === String(formulario.lote)
  );

  return (
    <div className="ac-page">
      <header className="ac-header">
        <div className="ac-titulo">
          <Tractor size={42} strokeWidth={1.6} />
          <div>
            <h1>Actividades agrícolas</h1>
            <p>Registra y consulta las actividades realizadas en los cultivos.</p>
          </div>
        </div>

        <button className="ac-btn-primary" onClick={nuevaActividad}>
          <Plus size={18} /> Nueva actividad
        </button>
      </header>

      {mensaje && (
        <div className="ac-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="ac-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error"><X size={16} /></button>
        </div>
      )}

      <section className="ac-card ac-filtros-card">
        <div className="ac-filtros">
          <label className="ac-campo ac-campo--ancho">
            Buscar
            <input
              type="search"
              placeholder="Responsable, lote, descripción..."
              value={busqueda}
              onChange={(e) => conFiltro(setBusqueda)(e.target.value)}
            />
          </label>

          <label className="ac-campo">
            Fecha inicio
            <input type="date" value={desde} max={hasta || undefined} onChange={(e) => conFiltro(setDesde)(e.target.value)} />
          </label>

          <label className="ac-campo">
            Fecha fin
            <input type="date" value={hasta} min={desde || undefined} onChange={(e) => conFiltro(setHasta)(e.target.value)} />
          </label>

          <label className="ac-campo">
            Finca
            <select value={filtroFinca} onChange={(e) => conFiltro(setFiltroFinca)(e.target.value)}>
              <option value="todas">Todas las fincas</option>
              {fincasOpciones.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>

          <label className="ac-campo">
            Cultivo
            <select value={filtroCultivo} onChange={(e) => conFiltro(setFiltroCultivo)(e.target.value)}>
              <option value="todos">Todos los cultivos</option>
              {cultivosOpciones.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="ac-campo">
            Tipo de actividad
            <select value={filtroTipo} onChange={(e) => conFiltro(setFiltroTipo)(e.target.value)}>
              <option value="todos">Todos los tipos</option>
              {TIPOS.map(([valor, nombre]) => (
                <option key={valor} value={valor}>{nombre}</option>
              ))}
            </select>
          </label>

          <label className="ac-campo">
            Estado
            <select value={filtroEstado} onChange={(e) => conFiltro(setFiltroEstado)(e.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="activas">Activas</option>
              <option value="archivadas">Archivadas</option>
            </select>
          </label>

          {hayFiltros && (
            <button type="button" className="ac-btn-secundario ac-limpiar" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      <section className="ac-card ac-panel">
        {cargando ? (
          <div className="ac-vacio">Cargando actividades...</div>
        ) : total === 0 ? (
          <div className="ac-vacio">
            <Tractor size={38} strokeWidth={1.4} />
            <h3>No hay actividades para mostrar</h3>
            <p>Registra una actividad o cambia los filtros de búsqueda.</p>
            <button className="ac-btn-primary" onClick={nuevaActividad}>Registrar actividad</button>
          </div>
        ) : (
          <div className="ac-tabla-contenedor">
            <table className="ac-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Finca</th>
                  <th>Cultivo</th>
                  <th>Tipo de actividad</th>
                  <th>Responsable</th>
                  <th>Costo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((a) => (
                  <tr key={a.id} className={a.activo ? "" : "ac-fila--archivada"}>
                    <td>{formatearFecha(a.fecha_actividad)}</td>
                    <td>
                      <strong className="ac-nombre">{a.finca}</strong>
                      <small className="ac-sub">{a.nombre_lote}</small>
                    </td>
                    <td>{a.cultivo}</td>
                    <td>{a.tipo_display}</td>
                    <td>{a.nombre_responsable}</td>
                    <td className="ac-costo">{formatearCosto(a.costo)}</td>
                    <td>
                      <span className={`ac-estado ${a.activo ? "activa" : "inactiva"}`}>
                        {a.activo ? "Activa" : "Archivada"}
                      </span>
                    </td>
                    <td>
                      <div className="ac-acciones">
                        <button className="ac-accion ver" onClick={() => setActividadViendo(a)} title="Ver detalle" aria-label="Ver detalle">
                          <Eye size={17} />
                        </button>
                        <button className="ac-accion editar" onClick={() => editarActividad(a)} title="Editar actividad" aria-label="Editar actividad">
                          <Pencil size={17} />
                        </button>
                        <button
                          className={`ac-accion ${a.activo ? "desactivar" : "activar"}`}
                          onClick={() => cambiarEstado(a)}
                          title={a.activo ? "Archivar actividad" : "Restaurar actividad"}
                          aria-label={a.activo ? "Archivar actividad" : "Restaurar actividad"}
                        >
                          {a.activo ? <Archive size={17} /> : <ArchiveRestore size={17} />}
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
          <footer className="ac-paginacion">
            <span>
              Mostrando {inicio + 1} - {inicio + visibles.length} de {total} actividades
            </span>
            <div className="ac-paginas">
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

      <aside className="ac-banner" style={{ "--ac-banner": `url(${fondoBanner})` }}>
        <Sprout size={42} strokeWidth={1.6} />
        <p>Un campo bien cuidado, produce un mejor futuro.</p>
      </aside>

      {/* Modal: detalle */}
      {actividadViendo && (
        <div className="ac-modal-fondo">
          <section className="ac-modal" role="dialog" aria-modal="true">
            <header className="ac-modal-header">
              <div>
                <span className="ac-eyebrow">DETALLE DE LA ACTIVIDAD</span>
                <h2>{actividadViendo.tipo_display} · {formatearFecha(actividadViendo.fecha_actividad)}</h2>
              </div>
              <button type="button" className="ac-modal-cerrar" onClick={() => setActividadViendo(null)} aria-label="Cerrar detalle">
                <X size={18} />
              </button>
            </header>

            <dl className="ac-detalle">
              <div><dt>Finca</dt><dd>{actividadViendo.finca}</dd></div>
              <div><dt>Lote</dt><dd>{actividadViendo.nombre_lote}</dd></div>
              <div><dt>Cultivo</dt><dd>{actividadViendo.cultivo}</dd></div>
              <div><dt>Responsable</dt><dd>{actividadViendo.nombre_responsable}</dd></div>
              <div><dt>Costo</dt><dd>{formatearCosto(actividadViendo.costo)}</dd></div>
              <div><dt>Estado</dt><dd>{actividadViendo.activo ? "Activa" : "Archivada"}</dd></div>
              <div className="ac-campo-completo">
                <dt>Descripción</dt>
                <dd>{actividadViendo.descripcion}</dd>
              </div>
              <div className="ac-campo-completo">
                <dt>Observaciones</dt>
                <dd>{actividadViendo.observaciones || "Sin observaciones"}</dd>
              </div>
              <div>
                <dt>Fecha de registro</dt>
                <dd>
                  {new Date(actividadViendo.fecha_creacion).toLocaleDateString("es-CO", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {/* Modal: crear / editar */}
      {mostrarFormulario && (
        <div className="ac-modal-fondo">
          <section className="ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-modal-titulo">
            <header className="ac-modal-header">
              <div>
                <span className="ac-eyebrow">INFORMACIÓN DE LA ACTIVIDAD</span>
                <h2 id="ac-modal-titulo">
                  {actividadEditando !== null ? "Editar actividad" : "Nueva actividad"}
                </h2>
                <p>
                  {actividadEditando !== null
                    ? "Actualiza los datos de la actividad."
                    : `Quedarás registrado como responsable (${nombreUsuario}).`}
                </p>
              </div>
              <button type="button" className="ac-modal-cerrar" onClick={cerrarFormulario} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {lotesDisponibles.length === 0 && (
              <div className="ac-alerta error">
                No hay lotes activos. <Link to="/cultivos">Registra un lote</Link> antes de crear una actividad.
              </div>
            )}

            {errorForm && <div className="ac-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={guardarActividad}>
              <div className="ac-form-grid">
                <label className="ac-campo-completo">
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
                  Tipo de actividad *
                  <select name="tipo" value={formulario.tipo} onChange={cambiarCampo} required>
                    <option value="">Selecciona un tipo</option>
                    {TIPOS.map(([valor, nombre]) => (
                      <option key={valor} value={valor}>{nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Fecha *
                  <input name="fecha_actividad" type="date" value={formulario.fecha_actividad} onChange={cambiarCampo} required />
                </label>

                <label className="ac-campo-completo">
                  Descripción *
                  <textarea
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={cambiarCampo}
                    rows={3}
                    placeholder="¿Qué se hizo en esta actividad?"
                    required
                  />
                </label>

                <label>
                  Costo (COP)
                  <input name="costo" type="number" min="0" step="0.01" value={formulario.costo} onChange={cambiarCampo} />
                </label>

                <label>
                  Observaciones
                  <input name="observaciones" value={formulario.observaciones} onChange={cambiarCampo} placeholder="Opcional" />
                </label>

                {actividadEditando !== null && (
                  <label className="ac-checkbox ac-campo-completo">
                    <input type="checkbox" name="activo" checked={Boolean(formulario.activo)} onChange={cambiarCampo} />
                    Actividad activa
                  </label>
                )}
              </div>

              <footer className="ac-modal-footer">
                <button type="button" className="ac-btn-secundario" onClick={cerrarFormulario} disabled={guardando}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ac-btn-primary"
                  disabled={guardando || lotesDisponibles.length === 0}
                >
                  {guardando ? "Guardando..." : actividadEditando !== null ? "Guardar cambios" : "Registrar actividad"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Actividades;