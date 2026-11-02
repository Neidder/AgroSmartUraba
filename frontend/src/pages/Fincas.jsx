import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Warehouse,
  Plus,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  CheckCircle2,
  Ruler,
  Sprout,
  MapPin,
} from "lucide-react";
import "../styles/Fincas.css";

const API_BASE = "http://127.0.0.1:8000";
// Verifica este prefijo en el urls.py principal del backend
// (debe coincidir con el include("fincas.urls")).
const API_FINCAS = `${API_BASE}/api_fincas/fincas/`;
const API_PRODUCTORES = `${API_BASE}/api_productores/productores/`;
const POR_PAGINA = 10;

const formularioInicial = {
  productor: "",
  nombre: "",
  municipio: "",
  vereda: "",
  direccion: "",
  hectareas: "",
  observaciones: "",
  activa: true,
};

const ETIQUETAS = {
  productor: "Productor",
  nombre: "Nombre",
  municipio: "Municipio",
  vereda: "Vereda",
  direccion: "Dirección",
  hectareas: "Hectáreas",
  observaciones: "Observaciones",
  activa: "Estado",
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

function numerosDePagina(actual, total) {
  const max = 5;
  let fin = Math.min(total, Math.max(1, actual - 2) + max - 1);
  const inicio = Math.max(1, fin - max + 1);
  fin = Math.min(total, fin);
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

function Fincas() {
  const [fincas, setFincas] = useState([]);
  const [productores, setProductores] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [fincaEditando, setFincaEditando] = useState(null);
  const [fincaViendo, setFincaViendo] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const token = localStorage.getItem("token");
  const authHeaders = token ? { Authorization: `Token ${token}` } : {};

  async function cargarFincas() {
    setCargando(true);
    try {
      const respuesta = await fetch(API_FINCAS, { headers: authHeaders });
      if (!respuesta.ok) throw new Error("No fue posible cargar las fincas.");
      setFincas(listaDe(await respuesta.json()));
    } catch (err) {
      setError(
        `${err.message} Verifica que Django esté funcionando y que la URL de la API sea correcta.`
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarProductores() {
    try {
      const respuesta = await fetch(API_PRODUCTORES, { headers: authHeaders });
      if (!respuesta.ok) throw new Error();
      setProductores(listaDe(await respuesta.json()));
    } catch {
      setError("No fue posible cargar la lista de productores.");
    }
  }

  useEffect(() => {
    cargarFincas();
    cargarProductores();
  }, []);

  function cambiarCampo(evento) {
    const { name, value, type, checked } = evento.target;
    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevaFinca() {
    setFincaEditando(null);
    setFormulario(formularioInicial);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function editarFinca(finca) {
    setFincaEditando(finca.id);
    setFormulario({
      productor: String(finca.productor ?? ""),
      nombre: finca.nombre || "",
      municipio: finca.municipio || "",
      vereda: finca.vereda || "",
      direccion: finca.direccion || "",
      hectareas: finca.hectareas ?? "",
      observaciones: finca.observaciones || "",
      activa: finca.activa,
    });
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setFincaEditando(null);
    setFormulario(formularioInicial);
  }

  async function guardarFinca(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    const editando = fincaEditando !== null;
    const url = editando ? `${API_FINCAS}${fincaEditando}/` : API_FINCAS;

    try {
      const respuesta = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          ...formulario,
          productor: Number(formulario.productor),
        }),
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(textoError(datos, "No fue posible guardar la finca."));
      }

      cerrarFormulario();
      setMensaje(
        editando
          ? "Finca actualizada correctamente."
          : "Finca registrada correctamente."
      );
      await cargarFincas();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(finca) {
    const accion = finca.activa ? "desactivar" : "activar";
    if (!window.confirm(`¿Deseas ${accion} la finca "${finca.nombre}"?`)) return;

    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(`${API_FINCAS}${finca.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ activa: !finca.activa }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(
          textoError(datos, "No fue posible cambiar el estado de la finca.")
        );
      }

      setMensaje(
        `Finca ${finca.activa ? "desactivada" : "activada"} correctamente.`
      );
      await cargarFincas();
    } catch (err) {
      setError(err.message);
    }
  }

  // ---- Indicadores (todo calculado con datos reales) ----
  const activas = fincas.filter((f) => f.activa);
  const areaTotal = activas.reduce((suma, f) => suma + Number(f.hectareas || 0), 0);
  const productoresConFinca = new Set(fincas.map((f) => f.productor)).size;
  const ahora = new Date();
  const nuevasEsteMes = fincas.filter((f) => {
    const d = new Date(f.fecha_creacion);
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  }).length;
  const porcentajeActivas = fincas.length
    ? Math.round((activas.length * 100) / fincas.length)
    : 0;

  const conteoMunicipios = {};
  fincas.forEach((f) => {
    const m = (f.municipio || "").trim() || "Sin municipio";
    conteoMunicipios[m] = (conteoMunicipios[m] || 0) + 1;
  });
  const porMunicipio = Object.entries(conteoMunicipios)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const municipios = Object.keys(conteoMunicipios).sort((a, b) =>
    a.localeCompare(b, "es")
  );

  // ---- Filtros y paginación ----
  const filtradas = fincas.filter((finca) => {
    const texto = [finca.nombre, finca.nombre_productor, finca.municipio, finca.vereda]
      .join(" ")
      .toLowerCase();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase());
    const coincideMunicipio =
      filtroMunicipio === "todos" || (finca.municipio || "").trim() === filtroMunicipio;
    const coincideEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "activas" && finca.activa) ||
      (filtroEstado === "inactivas" && !finca.activa);

    return coincideBusqueda && coincideMunicipio && coincideEstado;
  });

  const total = filtradas.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA);

  function conFiltro(setter) {
    return (valor) => {
      setter(valor);
      setPagina(1);
    };
  }

  const productoresDisponibles = productores.filter(
    (p) => p.activo || String(p.id) === String(formulario.productor)
  );

  return (
    <div className="fn-page">
      <header className="fn-header">
        <div className="fn-titulo">
          <Warehouse size={38} strokeWidth={1.6} />
          <div>
            <h1>Fincas</h1>
            <p>Administra las fincas y la información asociada.</p>
          </div>
        </div>

        <button className="fn-btn-primary" onClick={nuevaFinca}>
          <Plus size={18} /> Nueva finca
        </button>
      </header>

      <section className="fn-kpis">
        <article className="fn-card fn-kpi">
          <div className="fn-kpi-icon"><Warehouse size={24} /></div>
          <div>
            <span>Total de fincas</span>
            <strong>{fincas.length}</strong>
            {nuevasEsteMes > 0 && <small className="fn-up">↑ +{nuevasEsteMes} este mes</small>}
          </div>
        </article>

        <article className="fn-card fn-kpi">
          <div className="fn-kpi-icon"><CheckCircle2 size={24} /></div>
          <div>
            <span>Fincas activas</span>
            <strong>{activas.length}</strong>
            {fincas.length > 0 && <small className="fn-up">{porcentajeActivas}% del total</small>}
          </div>
        </article>

        <article className="fn-card fn-kpi">
          <div className="fn-kpi-icon"><Ruler size={24} /></div>
          <div>
            <span>Área total (ha)</span>
            <strong>{formatearHectareas(areaTotal)}</strong>
            <small>de fincas activas</small>
          </div>
        </article>

        <article className="fn-card fn-kpi">
          <div className="fn-kpi-icon"><Users size={24} /></div>
          <div>
            <span>Productores con finca</span>
            <strong>{productoresConFinca}</strong>
          </div>
        </article>
      </section>

      {mensaje && (
        <div className="fn-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="fn-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error"><X size={16} /></button>
        </div>
      )}

      <div className="fn-grid">
        <section className="fn-card fn-panel">
          <nav className="fn-tabs" aria-label="Fincas y cultivos">
            <NavLink to="/fincas" end className={({ isActive }) => `fn-tab ${isActive ? "fn-tab--activa" : ""}`}>
              <Warehouse size={17} /> Fincas
            </NavLink>
            <NavLink to="/cultivos" className={({ isActive }) => `fn-tab ${isActive ? "fn-tab--activa" : ""}`}>
              <Sprout size={17} /> Cultivos
            </NavLink>
          </nav>

          <div className="fn-filtros">
            <label className="fn-busqueda">
              <Search size={18} />
              <input
                type="search"
                placeholder="Buscar finca, productor o municipio..."
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
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => conFiltro(setFiltroEstado)(e.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="todos">Todos los estados</option>
              <option value="activas">Activas</option>
              <option value="inactivas">Inactivas</option>
            </select>
          </div>

          {cargando ? (
            <div className="fn-vacio">Cargando fincas...</div>
          ) : total === 0 ? (
            <div className="fn-vacio">
              <Warehouse size={38} strokeWidth={1.4} />
              <h3>No hay fincas para mostrar</h3>
              <p>Registra una finca nueva o cambia los filtros de búsqueda.</p>
              <button className="fn-btn-primary" onClick={nuevaFinca}>Registrar finca</button>
            </div>
          ) : (
            <div className="fn-tabla-contenedor">
              <table className="fn-tabla">
                <thead>
                  <tr>
                    <th>Nombre de la finca</th>
                    <th>Productor</th>
                    <th>Ubicación</th>
                    <th>Área (ha)</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((finca) => (
                    <tr key={finca.id}>
                      <td><strong className="fn-nombre">{finca.nombre}</strong></td>
                      <td>{finca.nombre_productor}</td>
                      <td>
                        {finca.municipio}
                        {finca.vereda && <small className="fn-sub">Vereda {finca.vereda}</small>}
                      </td>
                      <td>{formatearHectareas(finca.hectareas)}</td>
                      <td>
                        <span className={`fn-estado ${finca.activa ? "activa" : "inactiva"}`}>
                          {finca.activa ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td>
                        <div className="fn-acciones">
                          <button className="fn-accion ver" onClick={() => setFincaViendo(finca)} title="Ver detalle" aria-label="Ver detalle">
                            <Eye size={17} />
                          </button>
                          <button className="fn-accion editar" onClick={() => editarFinca(finca)} title="Editar finca" aria-label="Editar finca">
                            <Pencil size={17} />
                          </button>
                          <button
                            className={`fn-accion ${finca.activa ? "desactivar" : "activar"}`}
                            onClick={() => cambiarEstado(finca)}
                            title={finca.activa ? "Desactivar finca" : "Activar finca"}
                            aria-label={finca.activa ? "Desactivar finca" : "Activar finca"}
                          >
                            {finca.activa ? <PowerOff size={17} /> : <Power size={17} />}
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
            <footer className="fn-paginacion">
              <span>
                Mostrando {inicio + 1} - {inicio + visibles.length} de {total} fincas
              </span>
              <div className="fn-paginas">
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

        <aside className="fn-side">
          <section className="fn-card">
            <h3 className="fn-side-titulo"><MapPin size={18} /> Fincas por municipio</h3>
            {porMunicipio.length === 0 ? (
              <p className="fn-side-vacio">Aún no hay fincas registradas.</p>
            ) : (
              <ul className="fn-barras">
                {porMunicipio.map(([municipio, cantidad]) => {
                  const porcentaje = Math.round((cantidad * 100) / fincas.length);
                  return (
                    <li key={municipio}>
                      <div className="fn-barra-texto">
                        <span>{municipio}</span>
                        <strong>{cantidad} {cantidad === 1 ? "finca" : "fincas"}</strong>
                      </div>
                      <div className="fn-barra"><div style={{ width: `${porcentaje}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {/* Modal: detalle */}
      {fincaViendo && (
        <div className="fn-modal-fondo">
          <section className="fn-modal" role="dialog" aria-modal="true">
            <header className="fn-modal-header">
              <div>
                <span className="fn-eyebrow">DETALLE DE LA FINCA</span>
                <h2>{fincaViendo.nombre}</h2>
              </div>
              <button type="button" className="fn-modal-cerrar" onClick={() => setFincaViendo(null)} aria-label="Cerrar detalle">
                <X size={18} />
              </button>
            </header>

            <dl className="fn-detalle">
              <div><dt>Productor</dt><dd>{fincaViendo.nombre_productor}</dd></div>
              <div><dt>Estado</dt><dd>{fincaViendo.activa ? "Activa" : "Inactiva"}</dd></div>
              <div><dt>Municipio</dt><dd>{fincaViendo.municipio}</dd></div>
              <div><dt>Vereda</dt><dd>{fincaViendo.vereda || "No registrada"}</dd></div>
              <div><dt>Dirección</dt><dd>{fincaViendo.direccion || "No registrada"}</dd></div>
              <div><dt>Área</dt><dd>{formatearHectareas(fincaViendo.hectareas)} ha</dd></div>
              <div>
                <dt>Fecha de registro</dt>
                <dd>
                  {new Date(fincaViendo.fecha_creacion).toLocaleDateString("es-CO", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </dd>
              </div>
              <div className="fn-campo-completo">
                <dt>Observaciones</dt>
                <dd>{fincaViendo.observaciones || "Sin observaciones"}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {/* Modal: crear / editar */}
      {mostrarFormulario && (
        <div className="fn-modal-fondo">
          <section className="fn-modal" role="dialog" aria-modal="true" aria-labelledby="fn-modal-titulo">
            <header className="fn-modal-header">
              <div>
                <span className="fn-eyebrow">INFORMACIÓN DE LA FINCA</span>
                <h2 id="fn-modal-titulo">
                  {fincaEditando !== null ? "Editar finca" : "Registrar finca"}
                </h2>
                <p>Completa los datos para guardar el registro.</p>
              </div>
              <button type="button" className="fn-modal-cerrar" onClick={cerrarFormulario} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {productoresDisponibles.length === 0 && (
              <div className="fn-alerta error">
                No hay productores activos. <Link to="/productores">Registra un productor</Link> antes de crear una finca.
              </div>
            )}

            {error && (
              <div className="fn-alerta error" role="alert">{error}</div>
            )}

            <form onSubmit={guardarFinca}>
              <div className="fn-form-grid">
                <label className="fn-campo-completo">
                  Productor *
                  <select name="productor" value={formulario.productor} onChange={cambiarCampo} required>
                    <option value="">Selecciona un productor</option>
                    {productoresDisponibles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombres} {p.apellidos} — {p.tipo_documento} {p.numero_documento}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Nombre de la finca *
                  <input name="nombre" value={formulario.nombre} onChange={cambiarCampo} maxLength={150} required />
                </label>

                <label>
                  Hectáreas *
                  <input
                    name="hectareas"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formulario.hectareas}
                    onChange={cambiarCampo}
                    required
                  />
                </label>

                <label>
                  Municipio *
                  <input name="municipio" value={formulario.municipio} onChange={cambiarCampo} maxLength={100} placeholder="Ej. Apartadó" required />
                </label>

                <label>
                  Vereda
                  <input name="vereda" value={formulario.vereda} onChange={cambiarCampo} maxLength={100} />
                </label>

                <label className="fn-campo-completo">
                  Dirección
                  <input name="direccion" value={formulario.direccion} onChange={cambiarCampo} maxLength={200} />
                </label>

                <label className="fn-campo-completo">
                  Observaciones
                  <textarea name="observaciones" value={formulario.observaciones} onChange={cambiarCampo} rows={3} placeholder="Información adicional de la finca..." />
                </label>

                {fincaEditando !== null && (
                  <label className="fn-checkbox fn-campo-completo">
                    <input type="checkbox" name="activa" checked={Boolean(formulario.activa)} onChange={cambiarCampo} />
                    Finca activa
                  </label>
                )}
              </div>

              <footer className="fn-modal-footer">
                <button type="button" className="fn-btn-secundario" onClick={cerrarFormulario} disabled={guardando}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="fn-btn-primary"
                  disabled={guardando || productoresDisponibles.length === 0}
                >
                  {guardando ? "Guardando..." : fincaEditando !== null ? "Guardar cambios" : "Registrar finca"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Fincas;