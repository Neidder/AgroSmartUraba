import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import {
  actualizarEstadoLote,
  actualizarEstadoTipoCultivo,
  actualizarLote,
  actualizarTipoCultivo,
  crearLote,
  crearTipoCultivo,
  listarLotes,
  listarTiposCultivo,
} from "../services/cultivosService";
import { listarFincas } from "../services/fincasService";
import "../styles/Cultivos.css";

const formularioLoteVacio = () => ({
  finca: "",
  tipo_cultivo: "",
  nombre: "",
  hectareas: "",
  fecha_siembra: "",
  fecha_fin_estimada: "",
  observaciones: "",
});

const formularioTipoVacio = () => ({
  nombre: "",
  descripcion: "",
});

function Cultivos() {
  const [lotes, setLotes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroFinca, setFiltroFinca] = useState("todas");
  const [modal, setModal] = useState("");
  const [loteEditando, setLoteEditando] = useState(null);
  const [tipoEditando, setTipoEditando] = useState(null);
  const [formularioLote, setFormularioLote] = useState(formularioLoteVacio);
  const [formularioTipo, setFormularioTipo] = useState(formularioTipoVacio);

  async function cargarDatos(mostrarCarga = false) {
    if (mostrarCarga) setCargando(true);
    try {
      const [listaLotes, listaTipos, listaFincas] = await Promise.all([
        listarLotes(),
        listarTiposCultivo(),
        listarFincas(),
      ]);
      setLotes(listaLotes);
      setTipos(listaTipos);
      setFincas(listaFincas);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "No fue posible cargar los cultivos."));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vigente = true;

    Promise.all([listarLotes(), listarTiposCultivo(), listarFincas()])
      .then(([listaLotes, listaTipos, listaFincas]) => {
        if (vigente) {
          setLotes(listaLotes);
          setTipos(listaTipos);
          setFincas(listaFincas);
        }
      })
      .catch((err) => {
        if (vigente) {
          setError(getApiErrorMessage(err, "No fue posible cargar los cultivos."));
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const lotesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es");

    return lotes.filter((lote) => {
      const coincideTexto = [
        lote.nombre,
        lote.nombre_finca,
        lote.nombre_tipo_cultivo,
      ]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(texto);
      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activos" && lote.activo) ||
        (filtroEstado === "inactivos" && !lote.activo);
      const coincideFinca =
        filtroFinca === "todas" || String(lote.finca) === filtroFinca;

      return coincideTexto && coincideEstado && coincideFinca;
    });
  }, [busqueda, filtroEstado, filtroFinca, lotes]);

  const lotesActivos = lotes.filter((lote) => lote.activo);
  const tiposActivos = tipos.filter((tipo) => tipo.activo).length;
  const tiposDisponibles = tipos.filter(
    (tipo) =>
      tipo.activo || String(tipo.id) === formularioLote.tipo_cultivo,
  );
  const fincasDisponibles = fincas.filter(
    (finca) =>
      finca.activa || String(finca.id) === formularioLote.finca,
  );
  const areaDisponible = useMemo(() => {
    const finca = fincas.find(
      (item) => String(item.id) === formularioLote.finca,
    );
    if (!finca) return null;

    const ocupada = lotesActivos
      .filter(
        (lote) =>
          String(lote.finca) === formularioLote.finca &&
          lote.id !== loteEditando,
      )
      .reduce((total, lote) => total + Number(lote.hectareas), 0);

    return Math.max(Number(finca.hectareas) - ocupada, 0);
  }, [fincas, formularioLote.finca, loteEditando, lotesActivos]);

  function mostrarError(err, fallback) {
    setError(getApiErrorMessage(err, fallback));
  }

  function abrirNuevoLote() {
    setError("");
    setMensaje("");
    setLoteEditando(null);
    setFormularioLote(formularioLoteVacio());
    setModal("lote");
  }

  function abrirEdicionLote(lote) {
    setError("");
    setMensaje("");
    setLoteEditando(lote.id);
    setFormularioLote({
      finca: String(lote.finca),
      tipo_cultivo: String(lote.tipo_cultivo),
      nombre: lote.nombre || "",
      hectareas: lote.hectareas || "",
      fecha_siembra: lote.fecha_siembra || "",
      fecha_fin_estimada: lote.fecha_fin_estimada || "",
      observaciones: lote.observaciones || "",
    });
    setModal("lote");
  }

  function abrirNuevoTipo() {
    setError("");
    setMensaje("");
    setTipoEditando(null);
    setFormularioTipo(formularioTipoVacio());
    setModal("tipo");
  }

  function abrirEdicionTipo(tipo) {
    setError("");
    setMensaje("");
    setTipoEditando(tipo.id);
    setFormularioTipo({
      nombre: tipo.nombre || "",
      descripcion: tipo.descripcion || "",
    });
    setModal("tipo");
  }

  function cerrarModal() {
    setModal("");
    setLoteEditando(null);
    setTipoEditando(null);
    setFormularioLote(formularioLoteVacio());
    setFormularioTipo(formularioTipoVacio());
    setError("");
  }

  function cambiarCampoLote(evento) {
    const { name, value } = evento.target;
    setFormularioLote((actual) => ({ ...actual, [name]: value }));
  }

  function cambiarCampoTipo(evento) {
    const { name, value } = evento.target;
    setFormularioTipo((actual) => ({ ...actual, [name]: value }));
  }

  async function guardarLote(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);

    const editando = loteEditando !== null;
    const datos = {
      ...formularioLote,
      finca: Number(formularioLote.finca),
      tipo_cultivo: Number(formularioLote.tipo_cultivo),
      nombre: formularioLote.nombre.trim(),
      hectareas: formularioLote.hectareas,
      observaciones: formularioLote.observaciones.trim(),
      activo: editando
        ? Boolean(lotes.find((lote) => lote.id === loteEditando)?.activo)
        : true,
    };

    try {
      if (editando) {
        await actualizarLote(loteEditando, datos);
      } else {
        await crearLote(datos);
      }

      cerrarModal();
      setMensaje(editando ? "Lote actualizado correctamente." : "Lote registrado correctamente.");
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "No fue posible guardar el lote.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarTipo(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);

    const editando = tipoEditando !== null;
    const datos = {
      ...formularioTipo,
      nombre: formularioTipo.nombre.trim(),
      descripcion: formularioTipo.descripcion.trim(),
      activo: editando
        ? Boolean(tipos.find((tipo) => tipo.id === tipoEditando)?.activo)
        : true,
    };

    try {
      if (editando) {
        await actualizarTipoCultivo(tipoEditando, datos);
      } else {
        await crearTipoCultivo(datos);
      }

      cerrarModal();
      setMensaje(
        editando
          ? "Tipo de cultivo actualizado correctamente."
          : "Tipo de cultivo registrado correctamente.",
      );
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "No fue posible guardar el tipo de cultivo.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstadoLote(lote) {
    const activar = !lote.activo;
    const accion = activar ? "activar" : "desactivar";
    if (!window.confirm(`¿Deseas ${accion} el lote "${lote.nombre}"?`)) return;

    setError("");
    setMensaje("");
    try {
      await actualizarEstadoLote(lote.id, activar);
      setMensaje(`Lote ${activar ? "activado" : "desactivado"} correctamente.`);
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "No fue posible cambiar el estado del lote.");
    }
  }

  async function cambiarEstadoTipo(tipo) {
    const activar = !tipo.activo;
    const accion = activar ? "activar" : "desactivar";
    if (
      !window.confirm(
        `¿Deseas ${accion} el tipo de cultivo "${tipo.nombre}"?`,
      )
    ) {
      return;
    }

    setError("");
    setMensaje("");
    try {
      await actualizarEstadoTipoCultivo(tipo.id, activar);
      setMensaje(
        `Tipo de cultivo ${activar ? "activado" : "desactivado"} correctamente.`,
      );
      await cargarDatos();
    } catch (err) {
      mostrarError(err, "No fue posible cambiar el estado del tipo de cultivo.");
    }
  }

  const puedeCrearLote =
    fincas.some((finca) => finca.activa) &&
    tipos.some((tipo) => tipo.activo);

  return (
    <main className="cultivos-page">
      <header className="cultivos-header">
        <div>
          <span className="cultivos-eyebrow">GESTIÓN AGRÍCOLA INTELIGENTE</span>
          <h1>Cultivos y lotes</h1>
          <p>Organiza los tipos de cultivo y su distribución en las fincas.</p>
        </div>
        <div className="cultivos-header-acciones">
          <button
            className="cultivos-btn-secundario"
            onClick={abrirNuevoTipo}
          >
            ＋ Tipo de cultivo
          </button>
          <button
            className="cultivos-btn-principal"
            onClick={abrirNuevoLote}
            disabled={!puedeCrearLote}
            title={
              puedeCrearLote
                ? "Registrar un lote"
                : "Activa una finca y un tipo de cultivo para continuar"
            }
          >
            ＋ Nuevo lote
          </button>
        </div>
      </header>

      {mensaje && (
        <div className="cultivos-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="cultivos-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}

      <section className="cultivos-resumen">
        <article className="cultivos-resumen-card">
          <span className="cultivos-resumen-icon verde">▦</span>
          <div><small>Total de lotes</small><strong>{lotes.length}</strong></div>
        </article>
        <article className="cultivos-resumen-card">
          <span className="cultivos-resumen-icon azul">✓</span>
          <div><small>Lotes activos</small><strong>{lotesActivos.length}</strong></div>
        </article>
        <article className="cultivos-resumen-card">
          <span className="cultivos-resumen-icon gris">♧</span>
          <div><small>Tipos activos</small><strong>{tiposActivos}</strong></div>
        </article>
      </section>

      <section className="cultivos-panel">
        <div className="cultivos-panel-header">
          <div>
            <h2>Tipos de cultivo</h2>
            <p>Catálogo disponible para registrar nuevos lotes.</p>
          </div>
          <span className="cultivos-contador">{tipos.length} tipos</span>
        </div>
        {cargando ? (
          <div className="cultivos-vacio">Cargando tipos de cultivo...</div>
        ) : tipos.length === 0 ? (
          <div className="cultivos-vacio">Aún no hay tipos de cultivo registrados.</div>
        ) : (
          <div className="cultivos-tipos-grid">
            {tipos.map((tipo) => (
              <article className="cultivos-tipo-card" key={tipo.id}>
                <div>
                  <span className={`cultivos-estado ${tipo.activo ? "activa" : "inactiva"}`}>
                    {tipo.activo ? "Activo" : "Inactivo"}
                  </span>
                  <h3>{tipo.nombre}</h3>
                  <p>{tipo.descripcion || "Sin descripción."}</p>
                  <small>
                    {lotes.filter((lote) => lote.tipo_cultivo === tipo.id).length} lotes asociados
                  </small>
                </div>
                <div className="cultivos-acciones">
                  <button
                    className="cultivos-btn-editar"
                    onClick={() => abrirEdicionTipo(tipo)}
                  >
                    Editar
                  </button>
                  <button
                    className="cultivos-btn-estado"
                    onClick={() => cambiarEstadoTipo(tipo)}
                  >
                    {tipo.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="cultivos-panel">
        <div className="cultivos-panel-header">
          <div>
            <h2>Lotes registrados</h2>
            <p>Consulta ubicación, área, tipo de cultivo y estado.</p>
          </div>
          <span className="cultivos-contador">{lotesFiltrados.length} registros</span>
        </div>

        <div className="cultivos-filtros">
          <label className="cultivos-busqueda">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar por lote, finca o tipo..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              aria-label="Buscar lotes"
            />
          </label>
          <select
            value={filtroEstado}
            onChange={(evento) => setFiltroEstado(evento.target.value)}
            aria-label="Filtrar lotes por estado"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
          <select
            value={filtroFinca}
            onChange={(evento) => setFiltroFinca(evento.target.value)}
            aria-label="Filtrar lotes por finca"
          >
            <option value="todas">Todas las fincas</option>
            {fincas.map((finca) => (
              <option key={finca.id} value={finca.id}>{finca.nombre}</option>
            ))}
          </select>
        </div>

        {cargando ? (
          <div className="cultivos-vacio">Cargando lotes...</div>
        ) : lotesFiltrados.length === 0 ? (
          <div className="cultivos-vacio">
            <span>▦</span>
            <h3>No hay lotes para mostrar</h3>
            <p>Registra un lote o ajusta los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="cultivos-tabla-contenedor">
            <table className="cultivos-tabla">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Finca</th>
                  <th>Tipo de cultivo</th>
                  <th>Área</th>
                  <th>Siembra</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lotesFiltrados.map((lote) => (
                  <tr key={lote.id}>
                    <td><strong>{lote.nombre}</strong></td>
                    <td>{lote.nombre_finca}</td>
                    <td>{lote.nombre_tipo_cultivo}</td>
                    <td className="cultivos-area">{lote.hectareas} ha</td>
                    <td>{lote.fecha_siembra || "—"}</td>
                    <td>
                      <span className={`cultivos-estado ${lote.activo ? "activa" : "inactiva"}`}>
                        {lote.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="cultivos-acciones">
                        <button
                          className="cultivos-btn-editar"
                          onClick={() => abrirEdicionLote(lote)}
                        >
                          Editar
                        </button>
                        <button
                          className="cultivos-btn-estado"
                          onClick={() => cambiarEstadoLote(lote)}
                        >
                          {lote.activo ? "Desactivar" : "Activar"}
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

      {modal && (
        <div className="cultivos-modal-fondo">
          <section
            className="cultivos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cultivos-modal-titulo"
          >
            <header className="cultivos-modal-header">
              <div>
                <span className="cultivos-eyebrow">
                  {modal === "lote" ? "INFORMACIÓN DEL LOTE" : "CATÁLOGO AGRÍCOLA"}
                </span>
                <h2 id="cultivos-modal-titulo">
                  {modal === "lote"
                    ? loteEditando ? "Editar lote" : "Registrar lote"
                    : tipoEditando ? "Editar tipo de cultivo" : "Registrar tipo de cultivo"}
                </h2>
              </div>
              <button
                className="cultivos-cerrar-modal"
                type="button"
                onClick={cerrarModal}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            {modal === "lote" ? (
              <form onSubmit={guardarLote}>
                <div className="cultivos-form-grid">
                  <label>
                    Finca
                    <select
                      name="finca"
                      value={formularioLote.finca}
                      onChange={cambiarCampoLote}
                      required
                    >
                      <option value="">Selecciona una finca</option>
                      {fincasDisponibles.map((finca) => (
                        <option key={finca.id} value={finca.id}>
                          {finca.nombre} ({finca.hectareas} ha)
                          {finca.activa ? "" : " (inactiva)"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tipo de cultivo
                    <select
                      name="tipo_cultivo"
                      value={formularioLote.tipo_cultivo}
                      onChange={cambiarCampoLote}
                      required
                    >
                      <option value="">Selecciona un tipo</option>
                      {tiposDisponibles.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nombre}{tipo.activo ? "" : " (inactivo)"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nombre del lote
                    <input
                      name="nombre"
                      value={formularioLote.nombre}
                      onChange={cambiarCampoLote}
                      maxLength={100}
                      required
                    />
                  </label>
                  <label>
                    Área (hectáreas)
                    <input
                      name="hectareas"
                      type="number"
                      min="0.01"
                      max={areaDisponible ?? undefined}
                      step="0.01"
                      value={formularioLote.hectareas}
                      onChange={cambiarCampoLote}
                      required
                    />
                    {areaDisponible !== null && (
                      <small className="cultivos-ayuda">
                        Área disponible en esta finca: {areaDisponible.toFixed(2)} ha
                      </small>
                    )}
                  </label>
                  <label>
                    Fecha de siembra
                    <input
                      name="fecha_siembra"
                      type="date"
                      value={formularioLote.fecha_siembra}
                      onChange={cambiarCampoLote}
                    />
                  </label>
                  <label>
                    Fin estimado
                    <input
                      name="fecha_fin_estimada"
                      type="date"
                      min={formularioLote.fecha_siembra || undefined}
                      value={formularioLote.fecha_fin_estimada}
                      onChange={cambiarCampoLote}
                    />
                  </label>
                  <label className="cultivos-campo-completo">
                    Observaciones
                    <textarea
                      name="observaciones"
                      value={formularioLote.observaciones}
                      onChange={cambiarCampoLote}
                      rows="3"
                    />
                  </label>
                </div>
                <footer className="cultivos-modal-footer">
                  <button
                    className="cultivos-btn-secundario"
                    type="button"
                    onClick={cerrarModal}
                  >
                    Cancelar
                  </button>
                  <button className="cultivos-btn-principal" disabled={guardando}>
                    {guardando ? "Guardando..." : "Guardar lote"}
                  </button>
                </footer>
              </form>
            ) : (
              <form onSubmit={guardarTipo}>
                <div className="cultivos-form-grid">
                  <label className="cultivos-campo-completo">
                    Nombre del tipo
                    <input
                      name="nombre"
                      value={formularioTipo.nombre}
                      onChange={cambiarCampoTipo}
                      maxLength={100}
                      required
                    />
                  </label>
                  <label className="cultivos-campo-completo">
                    Descripción
                    <textarea
                      name="descripcion"
                      value={formularioTipo.descripcion}
                      onChange={cambiarCampoTipo}
                      rows="4"
                    />
                  </label>
                </div>
                <footer className="cultivos-modal-footer">
                  <button
                    className="cultivos-btn-secundario"
                    type="button"
                    onClick={cerrarModal}
                  >
                    Cancelar
                  </button>
                  <button className="cultivos-btn-principal" disabled={guardando}>
                    {guardando ? "Guardando..." : "Guardar tipo"}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default Cultivos;
