import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import {
  actualizarActividad,
  actualizarEstadoActividad,
  crearActividad,
  listarActividades,
  listarLotesActividad,
} from "../services/actividadesService";
import "../styles/Actividades.css";

const tiposActividad = [
  { valor: "PREPARACION", etiqueta: "Preparación del terreno" },
  { valor: "SIEMBRA", etiqueta: "Siembra" },
  { valor: "RIEGO", etiqueta: "Riego" },
  { valor: "FERTILIZACION", etiqueta: "Fertilización" },
  { valor: "CONTROL_PLAGAS", etiqueta: "Control de plagas" },
  { valor: "LIMPIEZA", etiqueta: "Limpieza" },
  { valor: "PODA", etiqueta: "Poda" },
  { valor: "COSECHA", etiqueta: "Cosecha" },
  { valor: "OTRA", etiqueta: "Otra" },
];

const formularioVacio = () => ({
  lote: "",
  tipo: "",
  descripcion: "",
  fecha_actividad: "",
  costo: "0",
  observaciones: "",
});

const formatoMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 2,
});

function Actividades() {
  const [actividades, setActividades] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroLote, setFiltroLote] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [actividadEditando, setActividadEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio);

  async function cargarDatos(mostrarCarga = false) {
    if (mostrarCarga) setCargando(true);
    try {
      const [listaActividades, listaLotes] = await Promise.all([
        listarActividades(),
        listarLotesActividad(),
      ]);
      setActividades(listaActividades);
      setLotes(listaLotes);
      setError("");
    } catch (err) {
      setError(
        getApiErrorMessage(err, "No fue posible cargar las actividades."),
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vigente = true;

    Promise.all([listarActividades(), listarLotesActividad()])
      .then(([listaActividades, listaLotes]) => {
        if (vigente) {
          setActividades(listaActividades);
          setLotes(listaLotes);
        }
      })
      .catch((err) => {
        if (vigente) {
          setError(
            getApiErrorMessage(err, "No fue posible cargar las actividades."),
          );
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const lotesDisponibles = lotes.filter(
    (lote) => lote.activo || String(lote.id) === formulario.lote,
  );
  const actividadesActivas = actividades.filter((actividad) => actividad.activo);
  const actividadesArchivadas = actividades.length - actividadesActivas.length;
  const costoTotalActivo = actividadesActivas.reduce(
    (total, actividad) => total + Number(actividad.costo || 0),
    0,
  );

  const actividadesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es");

    return actividades.filter((actividad) => {
      const textoActividad = [
        actividad.descripcion,
        actividad.nombre_lote,
        actividad.nombre_responsable,
        actividad.tipo_display,
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      const coincideTexto = textoActividad.includes(texto);
      const coincideEstado =
        filtroEstado === "todas" ||
        (filtroEstado === "activas" && actividad.activo) ||
        (filtroEstado === "archivadas" && !actividad.activo);
      const coincideTipo =
        filtroTipo === "todos" || actividad.tipo === filtroTipo;
      const coincideLote =
        filtroLote === "todos" || String(actividad.lote) === filtroLote;
      const coincideDesde =
        !fechaDesde || actividad.fecha_actividad >= fechaDesde;
      const coincideHasta =
        !fechaHasta || actividad.fecha_actividad <= fechaHasta;

      return (
        coincideTexto &&
        coincideEstado &&
        coincideTipo &&
        coincideLote &&
        coincideDesde &&
        coincideHasta
      );
    });
  }, [
    actividades,
    busqueda,
    fechaDesde,
    fechaHasta,
    filtroEstado,
    filtroLote,
    filtroTipo,
  ]);

  function abrirNuevaActividad() {
    setError("");
    setMensaje("");
    setActividadEditando(null);
    setFormulario(formularioVacio());
    setMostrarFormulario(true);
  }

  function abrirEdicion(actividad) {
    setError("");
    setMensaje("");
    setActividadEditando(actividad.id);
    setFormulario({
      lote: String(actividad.lote),
      tipo: actividad.tipo,
      descripcion: actividad.descripcion || "",
      fecha_actividad: actividad.fecha_actividad || "",
      costo: actividad.costo || "0",
      observaciones: actividad.observaciones || "",
    });
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setActividadEditando(null);
    setFormulario(formularioVacio());
    setError("");
  }

  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  async function guardarActividad(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);

    const editando = actividadEditando !== null;
    const actividadActual = actividades.find(
      (actividad) => actividad.id === actividadEditando,
    );
    const datos = {
      lote: Number(formulario.lote),
      tipo: formulario.tipo,
      descripcion: formulario.descripcion.trim(),
      fecha_actividad: formulario.fecha_actividad,
      costo: formulario.costo || "0",
      observaciones: formulario.observaciones.trim(),
      activo: actividadActual?.activo ?? true,
    };

    try {
      if (editando) {
        await actualizarActividad(actividadEditando, datos);
      } else {
        await crearActividad(datos);
      }

      cerrarFormulario();
      setMensaje(
        editando
          ? "Actividad actualizada correctamente."
          : "Actividad registrada correctamente.",
      );
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err, "No fue posible guardar la actividad."));
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(actividad) {
    const activar = !actividad.activo;
    const accion = activar ? "reactivar" : "archivar";
    if (
      !window.confirm(
        `¿Deseas ${accion} la actividad "${actividad.descripcion}"?`,
      )
    ) {
      return;
    }

    setError("");
    setMensaje("");
    try {
      await actualizarEstadoActividad(actividad.id, activar);
      setMensaje(
        `Actividad ${activar ? "reactivada" : "archivada"} correctamente.`,
      );
      await cargarDatos();
    } catch (err) {
      setError(
        getApiErrorMessage(err, "No fue posible cambiar el estado de la actividad."),
      );
    }
  }

  const puedeCrearActividad = lotes.some((lote) => lote.activo);

  return (
    <main className="actividades-page">
      <header className="actividades-header">
        <div>
          <span className="actividades-eyebrow">
            GESTIÓN AGRÍCOLA INTELIGENTE
          </span>
          <h1>Actividades</h1>
          <p>Registra y consulta las labores realizadas en cada lote.</p>
        </div>
        <button
          className="actividades-btn-principal"
          onClick={abrirNuevaActividad}
          disabled={!puedeCrearActividad}
          title={
            puedeCrearActividad
              ? "Registrar una actividad"
              : "Primero registra o activa un lote"
          }
        >
          ＋ Nueva actividad
        </button>
      </header>

      {mensaje && (
        <div className="actividades-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="actividades-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}

      <section className="actividades-resumen">
        <article className="actividades-resumen-card">
          <span className="actividades-resumen-icon verde">▤</span>
          <div>
            <small>Actividades activas</small>
            <strong>{actividadesActivas.length}</strong>
          </div>
        </article>
        <article className="actividades-resumen-card">
          <span className="actividades-resumen-icon azul">$</span>
          <div>
            <small>Costo registrado activo</small>
            <strong>{formatoMoneda.format(costoTotalActivo)}</strong>
          </div>
        </article>
        <article className="actividades-resumen-card">
          <span className="actividades-resumen-icon gris">◷</span>
          <div>
            <small>Actividades archivadas</small>
            <strong>{actividadesArchivadas}</strong>
          </div>
        </article>
      </section>

      <section className="actividades-panel">
        <div className="actividades-panel-header">
          <div>
            <h2>Registro de actividades</h2>
            <p>Consulta labores, responsables y costos asociados.</p>
          </div>
          <span className="actividades-contador">
            {actividadesFiltradas.length} registros
          </span>
        </div>

        <div className="actividades-filtros">
          <label className="actividades-busqueda">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar descripción, lote o responsable..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              aria-label="Buscar actividades"
            />
          </label>
          <select
            value={filtroEstado}
            onChange={(evento) => setFiltroEstado(evento.target.value)}
            aria-label="Filtrar actividades por estado"
          >
            <option value="activas">Activas</option>
            <option value="archivadas">Archivadas</option>
            <option value="todas">Todos los estados</option>
          </select>
          <select
            value={filtroTipo}
            onChange={(evento) => setFiltroTipo(evento.target.value)}
            aria-label="Filtrar por tipo de actividad"
          >
            <option value="todos">Todos los tipos</option>
            {tiposActividad.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </option>
            ))}
          </select>
          <select
            value={filtroLote}
            onChange={(evento) => setFiltroLote(evento.target.value)}
            aria-label="Filtrar por lote"
          >
            <option value="todos">Todos los lotes</option>
            {lotes.map((lote) => (
              <option key={lote.id} value={lote.id}>
                {lote.nombre}
              </option>
            ))}
          </select>
          <label className="actividades-filtro-fecha">
            <span>Desde</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(evento) => setFechaDesde(evento.target.value)}
              aria-label="Fecha inicial"
            />
          </label>
          <label className="actividades-filtro-fecha">
            <span>Hasta</span>
            <input
              type="date"
              min={fechaDesde || undefined}
              value={fechaHasta}
              onChange={(evento) => setFechaHasta(evento.target.value)}
              aria-label="Fecha final"
            />
          </label>
        </div>

        {cargando ? (
          <div className="actividades-vacio">Cargando actividades...</div>
        ) : actividadesFiltradas.length === 0 ? (
          <div className="actividades-vacio">
            <span>▤</span>
            <h3>No hay actividades para mostrar</h3>
            <p>Registra una actividad o ajusta los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="actividades-tabla-contenedor">
            <table className="actividades-tabla">
              <thead>
                <tr>
                  <th>Actividad</th>
                  <th>Lote</th>
                  <th>Fecha</th>
                  <th>Responsable</th>
                  <th>Costo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {actividadesFiltradas.map((actividad) => (
                  <tr key={actividad.id}>
                    <td>
                      <strong>{actividad.tipo_display}</strong>
                      <small>{actividad.descripcion}</small>
                    </td>
                    <td>{actividad.nombre_lote}</td>
                    <td>{actividad.fecha_actividad}</td>
                    <td>{actividad.nombre_responsable}</td>
                    <td className="actividades-costo">
                      {formatoMoneda.format(Number(actividad.costo || 0))}
                    </td>
                    <td>
                      <span
                        className={`actividades-estado ${
                          actividad.activo ? "activa" : "archivada"
                        }`}
                      >
                        {actividad.activo ? "Activa" : "Archivada"}
                      </span>
                    </td>
                    <td>
                      <div className="actividades-acciones">
                        <button
                          className="actividades-btn-editar"
                          onClick={() => abrirEdicion(actividad)}
                        >
                          Editar
                        </button>
                        <button
                          className="actividades-btn-estado"
                          onClick={() => cambiarEstado(actividad)}
                        >
                          {actividad.activo ? "Archivar" : "Reactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <div className="actividades-modal-fondo">
          <section
            className="actividades-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="actividades-modal-titulo"
          >
            <header className="actividades-modal-header">
              <div>
                <span className="actividades-eyebrow">
                  REGISTRO DE LABORES DEL LOTE
                </span>
                <h2 id="actividades-modal-titulo">
                  {actividadEditando ? "Editar actividad" : "Registrar actividad"}
                </h2>
              </div>
              <button
                className="actividades-cerrar-modal"
                onClick={cerrarFormulario}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form onSubmit={guardarActividad}>
              <div className="actividades-form-grid">
                <label>
                  Lote
                  <select
                    name="lote"
                    value={formulario.lote}
                    onChange={cambiarCampo}
                    required
                  >
                    <option value="">Selecciona un lote</option>
                    {lotesDisponibles.map((lote) => (
                      <option key={lote.id} value={lote.id}>
                        {lote.nombre}{lote.activo ? "" : " (inactivo)"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo de actividad
                  <select
                    name="tipo"
                    value={formulario.tipo}
                    onChange={cambiarCampo}
                    required
                  >
                    <option value="">Selecciona un tipo</option>
                    {tiposActividad.map((tipo) => (
                      <option key={tipo.valor} value={tipo.valor}>
                        {tipo.etiqueta}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="actividades-campo-completo">
                  Descripción
                  <textarea
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={cambiarCampo}
                    rows="3"
                    required
                  />
                </label>
                <label>
                  Fecha de la actividad
                  <input
                    name="fecha_actividad"
                    type="date"
                    value={formulario.fecha_actividad}
                    onChange={cambiarCampo}
                    required
                  />
                </label>
                <label>
                  Costo registrado (COP)
                  <input
                    name="costo"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.costo}
                    onChange={cambiarCampo}
                    required
                  />
                  <small className="actividades-ayuda">
                    No se registra automáticamente en el módulo Economía.
                  </small>
                </label>
                <label className="actividades-campo-completo">
                  Observaciones
                  <textarea
                    name="observaciones"
                    value={formulario.observaciones}
                    onChange={cambiarCampo}
                    rows="3"
                  />
                </label>
              </div>

              <p className="actividades-responsable">
                Responsable: se asignará automáticamente a tu usuario.
              </p>

              <footer className="actividades-modal-footer">
                <button
                  className="actividades-btn-secundario"
                  type="button"
                  onClick={cerrarFormulario}
                >
                  Cancelar
                </button>
                <button
                  className="actividades-btn-principal"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Guardar actividad"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Actividades;
