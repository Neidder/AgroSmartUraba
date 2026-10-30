import { useEffect, useState } from "react";
import {
  User,
  Plus,
  Search,
  Eye,
  Pencil,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import "../styles/Productores.css";
import { getApiErrorMessage } from "../services/api";
import {
  actualizarEstadoProductor,
  actualizarProductor,
  crearProductor,
  listarProductores,
} from "../services/productoresService";

const POR_PAGINA = 10;

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

// Muestra hasta 5 números de página alrededor de la página actual.
function numerosDePagina(actual, total) {
  const max = 5;
  let fin = Math.min(total, Math.max(1, actual - 2) + max - 1);
  const inicio = Math.max(1, fin - max + 1);
  fin = Math.min(total, fin);
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

function Productores() {
  const [productores, setProductores] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [productorEditando, setProductorEditando] = useState(null);
  const [productorViendo, setProductorViendo] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  function mostrarErrorCarga(err) {
    setError(
      getApiErrorMessage(
        err,
        "No fue posible cargar los productores.",
      ),
    );
  }

  async function cargarProductores() {
    setCargando(true);
    setError("");

    try {
      const datos = await listarProductores();
      setProductores(datos);
    } catch (err) {
      mostrarErrorCarga(err);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vigente = true;

    listarProductores()
      .then((datos) => {
        if (vigente) {
          setProductores(datos);
        }
      })
      .catch((err) => {
        if (vigente) {
          mostrarErrorCarga(err);
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
    try {
      if (editando) {
        await actualizarProductor(productorEditando, formulario);
      } else {
        await crearProductor(formulario);
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
      setError(
        getApiErrorMessage(err, "No fue posible guardar el productor."),
      );
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
      await actualizarEstadoProductor(productor.id, !productor.activo);

      setMensaje(
        `Productor ${productor.activo ? "desactivado" : "activado"} correctamente.`
      );
      await cargarProductores();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "No fue posible cambiar el estado del productor.",
        ),
      );
    }
  }

  // Municipios disponibles, tomados de los datos reales.
  const municipios = [
    ...new Set(productores.map((p) => (p.municipio || "").trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const productoresFiltrados = productores.filter((productor) => {
    const texto = [
      productor.nombres,
      productor.apellidos,
      productor.numero_documento,
      productor.telefono,
    ]
      .join(" ")
      .toLowerCase();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase());
    const coincideMunicipio =
      filtroMunicipio === "todos" ||
      (productor.municipio || "").trim() === filtroMunicipio;
    const coincideEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "activos" && productor.activo) ||
      (filtroEstado === "inactivos" && !productor.activo);

    return coincideBusqueda && coincideMunicipio && coincideEstado;
  });

  // Paginación (en el navegador)
  const total = productoresFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = productoresFiltrados.slice(inicio, inicio + POR_PAGINA);
  const desde = total === 0 ? 0 : inicio + 1;
  const hasta = inicio + visibles.length;

  function conFiltro(setter) {
    return (valor) => {
      setter(valor);
      setPagina(1);
    };
  }

  return (
    <div className="productores-page">
      <header className="productores-header">
        <div className="productores-titulo">
          <User size={38} strokeWidth={1.6} />
          <div>
            <h1>Productores</h1>
            <p>Gestiona la información de los agricultores de la región.</p>
          </div>
        </div>

        <button className="productores-btn-primary" onClick={nuevoProductor}>
          <Plus size={18} /> Nuevo productor
        </button>
      </header>

      {mensaje && (
        <div className="productores-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="productores-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="productores-panel">
        <div className="productores-filtros">
          <label className="productores-busqueda">
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar por nombre, cédula o teléfono..."
              value={busqueda}
              onChange={(e) => conFiltro(setBusqueda)(e.target.value)}
            />
          </label>

          <select
            value={filtroMunicipio}
            onChange={(e) => conFiltro(setFiltroMunicipio)(e.target.value)}
            aria-label="Filtrar por municipio"
          >
            <option value="todos">Todos los municipios</option>
            {municipios.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => conFiltro(setFiltroEstado)(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>

        {cargando ? (
          <div className="productores-vacio">Cargando productores...</div>
        ) : total === 0 ? (
          <div className="productores-vacio">
            <User size={38} strokeWidth={1.4} />
            <h3>No hay productores para mostrar</h3>
            <p>Registra un productor nuevo o cambia los filtros de búsqueda.</p>
            <button className="productores-btn-primary" onClick={nuevoProductor}>
              Registrar productor
            </button>
          </div>
        ) : (
          <div className="productores-tabla-contenedor">
            <table className="productores-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cédula</th>
                  <th>Teléfono</th>
                  <th>Municipio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {visibles.map((productor) => (
                  <tr key={productor.id}>
                    <td>
                      <strong className="productores-nombre">
                        {productor.nombres} {productor.apellidos}
                      </strong>
                      <small className="productores-sub">
                        {productor.correo || "Sin correo"}
                      </small>
                    </td>

                    <td>
                      <span className="productores-doc">
                        {productor.tipo_documento} {productor.numero_documento}
                      </span>
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
                          className="productores-accion ver"
                          onClick={() => setProductorViendo(productor)}
                          title="Ver detalle"
                          aria-label="Ver detalle"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          className="productores-accion editar"
                          onClick={() => editarProductor(productor)}
                          title="Editar productor"
                          aria-label="Editar productor"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className={`productores-accion ${
                            productor.activo ? "desactivar" : "activar"
                          }`}
                          onClick={() => cambiarEstado(productor)}
                          title={
                            productor.activo
                              ? "Desactivar productor"
                              : "Activar productor"
                          }
                          aria-label={
                            productor.activo
                              ? "Desactivar productor"
                              : "Activar productor"
                          }
                        >
                          {productor.activo ? (
                            <UserX size={17} />
                          ) : (
                            <UserCheck size={17} />
                          )}
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
          <footer className="productores-paginacion">
            <span>
              Mostrando {desde} - {hasta} de {total}
            </span>

            <div className="productores-paginas">
              <button
                onClick={() => setPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>

              {numerosDePagina(paginaActual, totalPaginas).map((n) => (
                <button
                  key={n}
                  className={n === paginaActual ? "activa" : ""}
                  onClick={() => setPagina(n)}
                >
                  {n}
                </button>
              ))}

              <button
                onClick={() => setPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                aria-label="Página siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* Modal: ver detalle */}
      {productorViendo && (
        <div className="productores-modal-fondo">
          <section className="productores-modal" role="dialog" aria-modal="true">
            <header className="productores-modal-header">
              <div>
                <span className="productores-eyebrow">DETALLE DEL PRODUCTOR</span>
                <h2>
                  {productorViendo.nombres} {productorViendo.apellidos}
                </h2>
              </div>
              <button
                type="button"
                className="productores-modal-cerrar"
                onClick={() => setProductorViendo(null)}
                aria-label="Cerrar detalle"
              >
                <X size={18} />
              </button>
            </header>

            <dl className="productores-detalle">
              <div><dt>Documento</dt><dd>{productorViendo.tipo_documento} {productorViendo.numero_documento}</dd></div>
              <div><dt>Teléfono</dt><dd>{productorViendo.telefono || "No registrado"}</dd></div>
              <div><dt>Correo</dt><dd>{productorViendo.correo || "No registrado"}</dd></div>
              <div><dt>Municipio</dt><dd>{productorViendo.municipio || "No registrado"}</dd></div>
              <div><dt>Dirección</dt><dd>{productorViendo.direccion || "No registrada"}</dd></div>
              <div><dt>Estado</dt><dd>{productorViendo.activo ? "Activo" : "Inactivo"}</dd></div>
              <div className="productores-campo-completo">
                <dt>Observaciones</dt>
                <dd>{productorViendo.observaciones || "Sin observaciones"}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {/* Modal: crear / editar */}
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
                <p>Completa los datos para guardar el registro.</p>
              </div>

              <button
                type="button"
                className="productores-modal-cerrar"
                onClick={cancelarFormulario}
                aria-label="Cerrar formulario"
              >
                <X size={18} />
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
    </div>
  );
}

export default Productores;