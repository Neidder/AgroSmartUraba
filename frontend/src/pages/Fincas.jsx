import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import {
  actualizarEstadoFinca,
  actualizarFinca,
  crearFinca,
  listarFincas,
  listarProductores,
} from "../services/fincasService";
import "../styles/Fincas.css";

const formularioVacio = () => ({
  productor: "",
  nombre: "",
  municipio: "",
  vereda: "",
  direccion: "",
  hectareas: "",
  observaciones: "",
  activa: true,
});

function nombreProductor(productor) {
  return `${productor.nombres} ${productor.apellidos}`.trim();
}

function Fincas() {
  const [fincas, setFincas] = useState([]);
  const [productores, setProductores] = useState([]);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [fincaEditando, setFincaEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  function mostrarError(err, fallback) {
    setError(getApiErrorMessage(err, fallback));
  }

  async function cargarFincas() {
    try {
      const datos = await listarFincas();
      setFincas(datos);
    } catch (err) {
      mostrarError(err, "No fue posible cargar las fincas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vigente = true;

    Promise.all([listarFincas(), listarProductores()])
      .then(([listaFincas, listaProductores]) => {
        if (vigente) {
          setFincas(listaFincas);
          setProductores(listaProductores);
        }
      })
      .catch((err) => {
        if (vigente) {
          mostrarError(err, "No fue posible cargar las fincas y productores.");
        }
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, []);

  function abrirNuevaFinca() {
    setError("");
    setMensaje("");
    setFincaEditando(null);
    setFormulario(formularioVacio());
    setMostrarFormulario(true);
  }

  function abrirEdicion(finca) {
    setError("");
    setMensaje("");
    setFincaEditando(finca.id);
    setFormulario({
      productor: String(finca.productor),
      nombre: finca.nombre || "",
      municipio: finca.municipio || "",
      vereda: finca.vereda || "",
      direccion: finca.direccion || "",
      hectareas: finca.hectareas || "",
      observaciones: finca.observaciones || "",
      activa: finca.activa,
    });
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setFincaEditando(null);
    setFormulario(formularioVacio());
    setError("");
  }

  function cambiarCampo(evento) {
    const { name, value, type, checked } = evento.target;
    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function guardarFinca(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);

    const editando = fincaEditando !== null;
    const datos = {
      ...formulario,
      productor: Number(formulario.productor),
      hectareas: formulario.hectareas,
      nombre: formulario.nombre.trim(),
      municipio: formulario.municipio.trim(),
      vereda: formulario.vereda.trim(),
      direccion: formulario.direccion.trim(),
      observaciones: formulario.observaciones.trim(),
    };

    try {
      if (editando) {
        await actualizarFinca(fincaEditando, datos);
      } else {
        await crearFinca(datos);
      }

      cerrarFormulario();
      setMensaje(
        editando
          ? "Finca actualizada correctamente."
          : "Finca registrada correctamente.",
      );
      await cargarFincas();
    } catch (err) {
      mostrarError(err, "No fue posible guardar la finca.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(finca) {
    const accion = finca.activa ? "desactivar" : "activar";
    if (
      !window.confirm(`¿Deseas ${accion} la finca "${finca.nombre}"?`)
    ) {
      return;
    }

    setError("");
    setMensaje("");
    try {
      await actualizarEstadoFinca(finca.id, !finca.activa);
      setMensaje(
        `Finca ${finca.activa ? "desactivada" : "activada"} correctamente.`,
      );
      await cargarFincas();
    } catch (err) {
      mostrarError(err, "No fue posible cambiar el estado de la finca.");
    }
  }

  const textoBusqueda = busqueda.trim().toLocaleLowerCase("es");
  const fincasFiltradas = fincas.filter((finca) => {
    const texto = [
      finca.nombre,
      finca.nombre_productor,
      finca.municipio,
      finca.vereda,
      finca.direccion,
    ]
      .join(" ")
      .toLocaleLowerCase("es");
    const coincideBusqueda = texto.includes(textoBusqueda);
    const coincideEstado =
      filtroEstado === "todas" ||
      (filtroEstado === "activas" && finca.activa) ||
      (filtroEstado === "inactivas" && !finca.activa);

    return coincideBusqueda && coincideEstado;
  });

  const totalActivas = fincas.filter((finca) => finca.activa).length;
  const totalInactivas = fincas.length - totalActivas;
  const productoresDisponibles = productores.filter(
    (productor) =>
      productor.activo || String(productor.id) === formulario.productor,
  );
  const puedeCrearFinca = productores.some((productor) => productor.activo);

  return (
    <main className="fincas-page">
      <header className="fincas-header">
        <div>
          <span className="fincas-eyebrow">
            GESTIÓN AGRÍCOLA INTELIGENTE
          </span>
          <h1>Fincas</h1>
          <p>Administra las fincas asociadas a los productores de Urabá.</p>
        </div>
        <button
          className="fincas-btn-principal"
          onClick={abrirNuevaFinca}
          disabled={!puedeCrearFinca}
          title={
            puedeCrearFinca
              ? "Registrar una finca"
              : "Primero registra o activa un productor"
          }
        >
          ＋ Nueva finca
        </button>
      </header>

      {mensaje && (
        <div className="fincas-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="fincas-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}

      <section className="fincas-resumen">
        <article className="fincas-resumen-card">
          <span className="fincas-resumen-icon verde">⌂</span>
          <div>
            <small>Total de fincas</small>
            <strong>{fincas.length}</strong>
          </div>
        </article>
        <article className="fincas-resumen-card">
          <span className="fincas-resumen-icon azul">✓</span>
          <div>
            <small>Fincas activas</small>
            <strong>{totalActivas}</strong>
          </div>
        </article>
        <article className="fincas-resumen-card">
          <span className="fincas-resumen-icon gris">○</span>
          <div>
            <small>Fincas inactivas</small>
            <strong>{totalInactivas}</strong>
          </div>
        </article>
      </section>

      <section className="fincas-panel">
        <div className="fincas-panel-header">
          <div>
            <h2>Listado de fincas</h2>
            <p>Busca y administra sus datos y estado.</p>
          </div>
          <span className="fincas-contador">
            {fincasFiltradas.length} registros
          </span>
        </div>

        <div className="fincas-filtros">
          <label className="fincas-busqueda">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar por finca, productor, municipio o vereda..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              aria-label="Buscar fincas"
            />
          </label>
          <select
            value={filtroEstado}
            onChange={(evento) => setFiltroEstado(evento.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="todas">Todos los estados</option>
            <option value="activas">Activas</option>
            <option value="inactivas">Inactivas</option>
          </select>
        </div>

        {cargando ? (
          <div className="fincas-vacio">Cargando fincas...</div>
        ) : fincasFiltradas.length === 0 ? (
          <div className="fincas-vacio">
            <span>⌂</span>
            <h3>No hay fincas para mostrar</h3>
            <p>Registra una finca nueva o cambia los filtros de búsqueda.</p>
            {puedeCrearFinca && (
              <button
                className="fincas-btn-principal"
                onClick={abrirNuevaFinca}
              >
                Registrar finca
              </button>
            )}
          </div>
        ) : (
          <div className="fincas-tabla-contenedor">
            <table className="fincas-tabla">
              <thead>
                <tr>
                  <th>Finca</th>
                  <th>Productor</th>
                  <th>Ubicación</th>
                  <th>Área</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {fincasFiltradas.map((finca) => (
                  <tr key={finca.id}>
                    <td>
                      <strong>{finca.nombre}</strong>
                      {finca.direccion && <small>{finca.direccion}</small>}
                    </td>
                    <td>{finca.nombre_productor}</td>
                    <td>
                      <strong>{finca.municipio}</strong>
                      {finca.vereda && <small>{finca.vereda}</small>}
                    </td>
                    <td className="fincas-area">{finca.hectareas} ha</td>
                    <td>
                      <span
                        className={`fincas-estado ${
                          finca.activa ? "activa" : "inactiva"
                        }`}
                      >
                        {finca.activa ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td>
                      <div className="fincas-acciones">
                        <button
                          className="fincas-btn-editar"
                          onClick={() => abrirEdicion(finca)}
                          title={`Editar ${finca.nombre}`}
                        >
                          Editar
                        </button>
                        <button
                          className="fincas-btn-estado"
                          onClick={() => cambiarEstado(finca)}
                          title={`${finca.activa ? "Desactivar" : "Activar"} ${finca.nombre}`}
                        >
                          {finca.activa ? "Desactivar" : "Activar"}
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
        <div className="fincas-modal-fondo">
          <section
            className="fincas-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fincas-modal-titulo"
          >
            <header className="fincas-modal-header">
              <div>
                <span className="fincas-eyebrow">INFORMACIÓN DE LA FINCA</span>
                <h2 id="fincas-modal-titulo">
                  {fincaEditando ? "Editar finca" : "Registrar finca"}
                </h2>
              </div>
              <button
                className="fincas-cerrar-modal"
                onClick={cerrarFormulario}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form onSubmit={guardarFinca}>
              <div className="fincas-form-grid">
                <label className="fincas-campo-completo">
                  Productor propietario
                  <select
                    name="productor"
                    value={formulario.productor}
                    onChange={cambiarCampo}
                    required
                  >
                    <option value="">Selecciona un productor</option>
                    {productoresDisponibles.map((productor) => (
                      <option key={productor.id} value={productor.id}>
                        {nombreProductor(productor)}
                        {productor.activo ? "" : " (inactivo)"}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Nombre de la finca
                  <input
                    name="nombre"
                    value={formulario.nombre}
                    onChange={cambiarCampo}
                    maxLength={150}
                    required
                  />
                </label>
                <label>
                  Municipio
                  <input
                    name="municipio"
                    value={formulario.municipio}
                    onChange={cambiarCampo}
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Vereda
                  <input
                    name="vereda"
                    value={formulario.vereda}
                    onChange={cambiarCampo}
                    maxLength={100}
                  />
                </label>
                <label>
                  Área (hectáreas)
                  <input
                    type="number"
                    name="hectareas"
                    value={formulario.hectareas}
                    onChange={cambiarCampo}
                    min="0.01"
                    max="99999999.99"
                    step="0.01"
                    required
                  />
                </label>
                <label className="fincas-campo-completo">
                  Dirección
                  <input
                    name="direccion"
                    value={formulario.direccion}
                    onChange={cambiarCampo}
                    maxLength={200}
                  />
                </label>
                <label className="fincas-campo-completo">
                  Observaciones
                  <textarea
                    name="observaciones"
                    value={formulario.observaciones}
                    onChange={cambiarCampo}
                    rows={3}
                  />
                </label>
                {fincaEditando && (
                  <label className="fincas-checkbox fincas-campo-completo">
                    <input
                      type="checkbox"
                      name="activa"
                      checked={formulario.activa}
                      onChange={cambiarCampo}
                    />
                    Finca activa
                  </label>
                )}
              </div>

              <footer className="fincas-modal-footer">
                <button
                  type="button"
                  className="fincas-btn-secundario"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="fincas-btn-principal"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : fincaEditando
                      ? "Guardar cambios"
                      : "Registrar finca"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Fincas;
