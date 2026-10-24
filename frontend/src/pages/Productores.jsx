import { useEffect, useState } from "react";
import "../styles/Productores.css";

const API_URL = "http://127.0.0.1:8000/api_productores/productores/";

const formularioInicial = {
  tipo_documento: "CC",
  numero_documento: "",
  nombres: "",
  apellidos: "",
  telefono: "",
  correo: "",
  direccion: "",
  municipio: "",
  observaciones: "",
  activo: true,
};

function Productores() {
  const [productores, setProductores] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [productorEditando, setProductorEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const token = localStorage.getItem("token");

  async function cargarProductores() {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(API_URL, {
        headers: token
          ? { Authorization: `Token ${token}` }
          : {},
      });

      if (!respuesta.ok) {
        throw new Error("No fue posible cargar los productores.");
      }

      const datos = await respuesta.json();

      setProductores(Array.isArray(datos) ? datos : datos.results || []);
    } catch (err) {
      setError(
        `${err.message} Verifica que Django esté funcionando y que la URL de la API sea correcta.`
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProductores();
  }, []);

  function cambiarCampo(evento) {
    const { name, value, type, checked } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevoProductor() {
    setProductorEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function editarProductor(productor) {
    setProductorEditando(productor.id);
    setFormulario({
      tipo_documento: productor.tipo_documento || "CC",
      numero_documento: productor.numero_documento || "",
      nombres: productor.nombres || "",
      apellidos: productor.apellidos || "",
      telefono: productor.telefono || "",
      correo: productor.correo || "",
      direccion: productor.direccion || "",
      municipio: productor.municipio || "",
      observaciones: productor.observaciones || "",
      activo: productor.activo,
    });

    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cancelarFormulario() {
    setMostrarFormulario(false);
    setProductorEditando(null);
    setFormulario(formularioInicial);
    setError("");
  }

  async function guardarProductor(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    const editando = productorEditando !== null;
    const url = editando ? `${API_URL}${productorEditando}/` : API_URL;

    try {
      const respuesta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify(formulario),
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        const detalle = Object.entries(datos)
          .map(([campo, errores]) => {
            const texto = Array.isArray(errores)
              ? errores.join(", ")
              : typeof errores === "string"
                ? errores
                : JSON.stringify(errores);

            return `${campo}: ${texto}`;
          })
          .join(" | ");

        throw new Error(
          detalle || "No fue posible guardar el productor."
        );
      }

      setMostrarFormulario(false);
      setProductorEditando(null);
      setFormulario(formularioInicial);
      setMensaje(
        editando
          ? "Productor actualizado correctamente."
          : "Productor registrado correctamente."
      );

      await cargarProductores();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(productor) {
    const accion = productor.activo ? "desactivar" : "activar";

    if (
      !window.confirm(
        `¿Deseas ${accion} a ${productor.nombres} ${productor.apellidos}?`
      )
    ) {
      return;
    }

    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(`${API_URL}${productor.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify({ activo: !productor.activo }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(
          datos.detail || "No fue posible cambiar el estado del productor."
        );
      }

      setMensaje(
        `Productor ${productor.activo ? "desactivado" : "activado"} correctamente.`
      );

      await cargarProductores();
    } catch (err) {
      setError(err.message);
    }
  }

  const productoresFiltrados = productores.filter((productor) => {
    const texto = [
      productor.nombres,
      productor.apellidos,
      productor.numero_documento,
      productor.telefono,
      productor.municipio,
    ]
      .join(" ")
      .toLowerCase();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase());

    const coincideEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "activos" && productor.activo) ||
      (filtroEstado === "inactivos" && !productor.activo);

    return coincideBusqueda && coincideEstado;
  });

  const totalActivos = productores.filter((p) => p.activo).length;
  const totalInactivos = productores.length - totalActivos;

  return (
    <main className="productores-page">
      <header className="productores-header">
        <div>
          <span className="productores-eyebrow">
            GESTIÓN AGRÍCOLA INTELIGENTE
          </span>
          <h1>Productores</h1>
          <p>Administra la información de los productores de Urabá.</p>
        </div>

        <button
          className="productores-btn-primary"
          onClick={nuevoProductor}
        >
          <span>＋</span> Nuevo productor
        </button>
      </header>

      <section className="productores-resumen">
        <article className="productores-resumen-card">
          <span className="productores-resumen-icon verde">👤</span>
          <div>
            <small>Total de productores</small>
            <strong>{productores.length}</strong>
          </div>
        </article>

        <article className="productores-resumen-card">
          <span className="productores-resumen-icon azul">✓</span>
          <div>
            <small>Productores activos</small>
            <strong>{totalActivos}</strong>
          </div>
        </article>

        <article className="productores-resumen-card">
          <span className="productores-resumen-icon gris">○</span>
          <div>
            <small>Productores inactivos</small>
            <strong>{totalInactivos}</strong>
          </div>
        </article>
      </section>

      {mensaje && (
        <div className="productores-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="productores-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}

      <section className="productores-panel">
        <div className="productores-panel-header">
          <div>
            <h2>Listado de productores</h2>
            <p>Consulta y administra los registros.</p>
          </div>
          <span className="productores-contador">
            {productoresFiltrados.length} registros
          </span>
        </div>

        <div className="productores-filtros">
          <div className="productores-busqueda">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Buscar por nombre, documento, teléfono o municipio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        {cargando ? (
          <div className="productores-vacio">Cargando productores...</div>
        ) : productoresFiltrados.length === 0 ? (
          <div className="productores-vacio">
            <span>♙</span>
            <h3>No hay productores para mostrar</h3>
            <p>
              Registra un productor nuevo o cambia los filtros de búsqueda.
            </p>
            <button
              className="productores-btn-primary"
              onClick={nuevoProductor}
            >
              Registrar productor
            </button>
          </div>
        ) : (
          <div className="productores-tabla-contenedor">
            <table className="productores-tabla">
              <thead>
                <tr>
                  <th>Productor</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Municipio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {productoresFiltrados.map((productor) => (
                  <tr key={productor.id}>
                    <td>
                      <div className="productores-persona">
                        <div className="productores-avatar">
                          {productor.nombres?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>
                            {productor.nombres} {productor.apellidos}
                          </strong>
                          <small>{productor.correo || "Sin correo"}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong>{productor.tipo_documento}</strong>
                      <small className="productores-documento">
                        {productor.numero_documento}
                      </small>
                    </td>

                    <td>{productor.telefono || "No registrado"}</td>
                    <td>{productor.municipio || "No registrado"}</td>

                    <td>
                      <span
                        className={`productores-estado ${
                          productor.activo ? "activo" : "inactivo"
                        }`}
                      >
                        {productor.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td>
                      <div className="productores-acciones">
                        <button
                          className="productores-btn-editar"
                          onClick={() => editarProductor(productor)}
                          title="Editar productor"
                        >
                          ✎
                        </button>

                        <button
                          className="productores-btn-estado"
                          onClick={() => cambiarEstado(productor)}
                          title={
                            productor.activo
                              ? "Desactivar productor"
                              : "Activar productor"
                          }
                        >
                          {productor.activo ? "Desactivar" : "Activar"}
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
        <div className="productores-modal-fondo">
          <section
            className="productores-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="productores-modal-titulo"
          >
            <header className="productores-modal-header">
              <div>
                <span className="productores-eyebrow">
                  INFORMACIÓN DEL PRODUCTOR
                </span>
                <h2 id="productores-modal-titulo">
                  {productorEditando !== null
                    ? "Editar productor"
                    : "Registrar productor"}
                </h2>
                <p>
                  Completa los datos para guardar el registro.
                </p>
              </div>

              <button
                type="button"
                className="productores-modal-cerrar"
                onClick={cancelarFormulario}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form onSubmit={guardarProductor}>
              <div className="productores-form-grid">
                <label>
                  Tipo de documento *
                  <select
                    name="tipo_documento"
                    value={formulario.tipo_documento}
                    onChange={cambiarCampo}
                    required
                  >
                    <option value="CC">Cédula de ciudadanía</option>
                    <option value="CE">Cédula de extranjería</option>
                    <option value="NIT">NIT</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </label>

                <label>
                  Número de documento *
                  <input
                    name="numero_documento"
                    value={formulario.numero_documento}
                    onChange={cambiarCampo}
                    maxLength={30}
                    required
                  />
                </label>

                <label>
                  Nombres *
                  <input
                    name="nombres"
                    value={formulario.nombres}
                    onChange={cambiarCampo}
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  Apellidos *
                  <input
                    name="apellidos"
                    value={formulario.apellidos}
                    onChange={cambiarCampo}
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  Teléfono
                  <input
                    name="telefono"
                    type="tel"
                    value={formulario.telefono}
                    onChange={cambiarCampo}
                    maxLength={20}
                  />
                </label>

                <label>
                  Correo electrónico
                  <input
                    name="correo"
                    type="email"
                    value={formulario.correo}
                    onChange={cambiarCampo}
                  />
                </label>

                <label>
                  Municipio
                  <input
                    name="municipio"
                    value={formulario.municipio}
                    onChange={cambiarCampo}
                    maxLength={100}
                    placeholder="Ej. Apartadó"
                  />
                </label>

                <label>
                  Dirección
                  <input
                    name="direccion"
                    value={formulario.direccion}
                    onChange={cambiarCampo}
                    maxLength={200}
                  />
                </label>

                <label className="productores-campo-completo">
                  Observaciones
                  <textarea
                    name="observaciones"
                    value={formulario.observaciones}
                    onChange={cambiarCampo}
                    rows={3}
                    placeholder="Información adicional del productor..."
                  />
                </label>

                {productorEditando !== null && (
                  <label className="productores-checkbox productores-campo-completo">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={Boolean(formulario.activo)}
                      onChange={cambiarCampo}
                    />
                    Productor activo
                  </label>
                )}
              </div>

              <footer className="productores-modal-footer">
                <button
                  type="button"
                  className="productores-btn-secundario"
                  onClick={cancelarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="productores-btn-primary"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : productorEditando !== null
                      ? "Guardar cambios"
                      : "Registrar productor"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Productores;