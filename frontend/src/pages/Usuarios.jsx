import { useEffect, useState } from "react";
import {
  UserCog,
  Lock,
  Plus,
  Search,
  Eye,
  Pencil,
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useUsuario } from "../hooks/useUsuario";
import "../styles/Usuarios.css";

const API_USUARIOS = "http://127.0.0.1:8000/api_usuarios/usuarios/";
const POR_PAGINA = 10;

const ROLES = [
  ["ADMINISTRADOR", "Administrador"],
  ["TRABAJADOR", "Trabajador"],
];

const formularioInicial = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  rol: "TRABAJADOR",
  is_active: true,
  password: "",
  confirmar: "",
};

const ETIQUETAS = {
  username: "Usuario",
  password: "Contraseña",
  first_name: "Nombres",
  last_name: "Apellidos",
  email: "Correo",
  rol: "Rol",
  is_active: "Estado",
};

// Mensajes frecuentes que el backend devuelve en inglés.
const TRADUCCIONES = {
  "A user with that username already exists.": "Ya existe un usuario con ese nombre de usuario.",
  "Enter a valid email address.": "Ingresa un correo electrónico válido.",
  "This field may not be blank.": "Este campo no puede estar vacío.",
  "This field is required.": "Este campo es obligatorio.",
  "Enter a valid username. This value may contain only letters, numbers, and @/./+/-/_ characters.":
    "El usuario solo puede tener letras, números y los símbolos @ . + - _",
};

function traducir(texto) {
  return TRADUCCIONES[texto] || texto;
}

function listaDe(datos) {
  return Array.isArray(datos) ? datos : datos?.results || [];
}

function textoError(datos, porDefecto) {
  if (!datos || typeof datos !== "object") return porDefecto;
  if (typeof datos.detail === "string") return traducir(datos.detail);

  const partes = Object.entries(datos).map(([campo, errores]) => {
    const texto = Array.isArray(errores)
      ? errores.map(traducir).join(" ")
      : typeof errores === "string"
        ? traducir(errores)
        : JSON.stringify(errores);
    const etiqueta = ETIQUETAS[campo];
    return etiqueta ? `${etiqueta}: ${texto}` : texto;
  });

  return partes.join(" | ") || porDefecto;
}

function nombreCompleto(usuario) {
  const nombre = `${usuario.first_name || ""} ${usuario.last_name || ""}`.trim();
  return nombre || usuario.username;
}

function formatearFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
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

function Usuarios() {
  const { id: miId } = useUsuario();

  const [usuarios, setUsuarios] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [usuarioViendo, setUsuarioViendo] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [mensaje, setMensaje] = useState("");

  const token = localStorage.getItem("token");
  const authHeaders = token ? { Authorization: `Token ${token}` } : {};

  async function cargarUsuarios() {
    try {
      const respuesta = await fetch(API_USUARIOS, { headers: authHeaders });

      if (respuesta.status === 403) {
        setSinPermiso(true);
        return;
      }
      if (!respuesta.ok) throw new Error("No fue posible cargar los usuarios.");

      setUsuarios(listaDe(await respuesta.json()));
    } catch (err) {
      setError(
        `${err.message} Verifica que Django esté funcionando y que la URL de la API sea correcta.`
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // ---------- Protecciones: nunca dejar el sistema sin administrador ----------
  const adminsActivos = usuarios.filter((u) => u.rol === "ADMINISTRADOR" && u.is_active);

  function motivoBloqueo(usuario) {
    if (usuario.id === miId) return "No puedes archivar ni cambiar el rol de tu propia cuenta.";
    if (usuario.rol === "ADMINISTRADOR" && usuario.is_active && adminsActivos.length === 1) {
      return "Debe quedar al menos un administrador activo.";
    }
    return "";
  }

  function cambiarCampo(evento) {
    const { name, value, type, checked } = evento.target;
    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function nuevoUsuario() {
    setUsuarioEditando(null);
    setFormulario(formularioInicial);
    setErrorForm("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function editarUsuario(usuario) {
    setUsuarioEditando(usuario);
    setFormulario({
      username: usuario.username || "",
      first_name: usuario.first_name || "",
      last_name: usuario.last_name || "",
      email: usuario.email || "",
      rol: usuario.rol || "TRABAJADOR",
      is_active: usuario.is_active,
      password: "",
      confirmar: "",
    });
    setErrorForm("");
    setMensaje("");
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setUsuarioEditando(null);
    setFormulario(formularioInicial);
    setErrorForm("");
  }

  async function guardarUsuario(evento) {
    evento.preventDefault();
    setErrorForm("");
    setMensaje("");

    const editando = usuarioEditando !== null;
    const { password, confirmar } = formulario;

    if (!editando && !password) {
      setErrorForm("La contraseña es obligatoria para crear un usuario.");
      return;
    }
    if (password && password.length < 8) {
      setErrorForm("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setErrorForm("Las contraseñas no coinciden.");
      return;
    }

    const cuerpo = {
      username: formulario.username.trim(),
      first_name: formulario.first_name.trim(),
      last_name: formulario.last_name.trim(),
      email: formulario.email.trim(),
      rol: formulario.rol,
      is_active: formulario.is_active,
    };
    if (password) cuerpo.password = password;

    setGuardando(true);

    try {
      const respuesta = await fetch(
        editando ? `${API_USUARIOS}${usuarioEditando.id}/` : API_USUARIOS,
        {
          method: editando ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify(cuerpo),
        }
      );

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(textoError(datos, "No fue posible guardar el usuario."));
      }

      cerrarFormulario();
      setMensaje(
        editando ? "Usuario actualizado correctamente." : "Usuario creado correctamente."
      );
      await cargarUsuarios();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(usuario) {
    const accion = usuario.is_active ? "archivar" : "restaurar";
    if (!window.confirm(`¿Deseas ${accion} a ${nombreCompleto(usuario)}?`)) return;

    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(`${API_USUARIOS}${usuario.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ is_active: !usuario.is_active }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(textoError(datos, "No fue posible cambiar el estado del usuario."));
      }

      setMensaje(`Usuario ${usuario.is_active ? "archivado" : "restaurado"} correctamente.`);
      await cargarUsuarios();
    } catch (err) {
      setError(err.message);
    }
  }

  // ---------- Filtros y paginación ----------
  const filtrados = usuarios.filter((u) => {
    const texto = [u.username, u.first_name, u.last_name, u.email].join(" ").toLowerCase();

    return (
      texto.includes(busqueda.toLowerCase()) &&
      (filtroRol === "todos" || u.rol === filtroRol) &&
      (filtroEstado === "todos" ||
        (filtroEstado === "activos" && u.is_active) ||
        (filtroEstado === "archivados" && !u.is_active))
    );
  });

  function conFiltro(setter) {
    return (valor) => {
      setter(valor);
      setPagina(1);
    };
  }

  const total = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtrados.slice(inicio, inicio + POR_PAGINA);

  const editandoBloqueado = usuarioEditando ? Boolean(motivoBloqueo(usuarioEditando)) : false;

  if (sinPermiso) {
    return (
      <div className="us-page">
        <section className="us-card us-restringido">
          <Lock size={42} strokeWidth={1.4} />
          <h2>Acceso restringido</h2>
          <p>Solo los administradores pueden gestionar los usuarios del sistema.</p>
          <small>
            Si eres administrador, cierra sesión y vuelve a ingresar para actualizar tus permisos.
          </small>
        </section>
      </div>
    );
  }

  return (
    <div className="us-page">
      <header className="us-header">
        <div className="us-titulo">
          <UserCog size={38} strokeWidth={1.6} />
          <div>
            <h1>Usuarios</h1>
            <p>Administra las cuentas de acceso y los roles del sistema.</p>
          </div>
        </div>

        <button className="us-btn-primary" onClick={nuevoUsuario}>
          <Plus size={18} /> Nuevo usuario
        </button>
      </header>

      {mensaje && (
        <div className="us-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="us-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error"><X size={16} /></button>
        </div>
      )}

      <section className="us-card us-panel">
        <div className="us-filtros">
          <label className="us-busqueda">
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar por nombre, usuario o correo..."
              value={busqueda}
              onChange={(e) => conFiltro(setBusqueda)(e.target.value)}
            />
          </label>

          <select value={filtroRol} onChange={(e) => conFiltro(setFiltroRol)(e.target.value)} aria-label="Filtrar por rol">
            <option value="todos">Todos los roles</option>
            {ROLES.map(([valor, nombre]) => (
              <option key={valor} value={valor}>{nombre}</option>
            ))}
          </select>

          <select value={filtroEstado} onChange={(e) => conFiltro(setFiltroEstado)(e.target.value)} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="archivados">Archivados</option>
          </select>
        </div>

        {cargando ? (
          <div className="us-vacio">Cargando usuarios...</div>
        ) : total === 0 ? (
          <div className="us-vacio">
            <UserCog size={38} strokeWidth={1.4} />
            <h3>No hay usuarios para mostrar</h3>
            <p>Crea un usuario nuevo o cambia los filtros de búsqueda.</p>
            <button className="us-btn-primary" onClick={nuevoUsuario}>Crear usuario</button>
          </div>
        ) : (
          <div className="us-tabla-contenedor">
            <table className="us-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((usuario) => {
                  const bloqueo = motivoBloqueo(usuario);
                  const esYo = usuario.id === miId;

                  return (
                    <tr key={usuario.id} className={usuario.is_active ? "" : "us-fila--archivada"}>
                      <td>
                        <strong className="us-nombre">
                          {nombreCompleto(usuario)} {esYo && <span className="us-yo">Tú</span>}
                        </strong>
                        <small className="us-sub">@{usuario.username}</small>
                      </td>
                      <td>{usuario.email || "No registrado"}</td>
                      <td>
                        <span className={`us-rol ${usuario.rol === "ADMINISTRADOR" ? "admin" : "trabajador"}`}>
                          {usuario.rol === "ADMINISTRADOR" ? "Administrador" : "Trabajador"}
                        </span>
                      </td>
                      <td>
                        <span className={`us-estado ${usuario.is_active ? "activa" : "inactiva"}`}>
                          {usuario.is_active ? "Activo" : "Archivado"}
                        </span>
                      </td>
                      <td>{formatearFecha(usuario.date_joined)}</td>
                      <td>
                        <div className="us-acciones">
                          <button className="us-accion ver" onClick={() => setUsuarioViendo(usuario)} title="Ver detalle" aria-label="Ver detalle">
                            <Eye size={17} />
                          </button>
                          <button className="us-accion editar" onClick={() => editarUsuario(usuario)} title="Editar usuario" aria-label="Editar usuario">
                            <Pencil size={17} />
                          </button>
                          <button
                            className={`us-accion ${usuario.is_active ? "desactivar" : "activar"}`}
                            onClick={() => cambiarEstado(usuario)}
                            disabled={usuario.is_active && Boolean(bloqueo)}
                            title={
                              usuario.is_active
                                ? bloqueo || "Archivar usuario"
                                : "Restaurar usuario"
                            }
                            aria-label={usuario.is_active ? "Archivar usuario" : "Restaurar usuario"}
                          >
                            {usuario.is_active ? <Archive size={17} /> : <ArchiveRestore size={17} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!cargando && total > 0 && (
          <footer className="us-paginacion">
            <span>
              Mostrando {inicio + 1} - {inicio + visibles.length} de {total} usuarios
            </span>
            <div className="us-paginas">
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

      {/* Modal: detalle */}
      {usuarioViendo && (
        <div className="us-modal-fondo">
          <section className="us-modal" role="dialog" aria-modal="true">
            <header className="us-modal-header">
              <div>
                <span className="us-eyebrow">DETALLE DEL USUARIO</span>
                <h2>{nombreCompleto(usuarioViendo)}</h2>
              </div>
              <button type="button" className="us-modal-cerrar" onClick={() => setUsuarioViendo(null)} aria-label="Cerrar detalle">
                <X size={18} />
              </button>
            </header>

            <dl className="us-detalle">
              <div><dt>Usuario</dt><dd>@{usuarioViendo.username}</dd></div>
              <div><dt>Correo</dt><dd>{usuarioViendo.email || "No registrado"}</dd></div>
              <div><dt>Rol</dt><dd>{usuarioViendo.rol === "ADMINISTRADOR" ? "Administrador" : "Trabajador"}</dd></div>
              <div><dt>Estado</dt><dd>{usuarioViendo.is_active ? "Activo" : "Archivado"}</dd></div>
              <div><dt>Fecha de registro</dt><dd>{formatearFecha(usuarioViendo.date_joined)}</dd></div>
            </dl>
          </section>
        </div>
      )}

      {/* Modal: crear / editar */}
      {mostrarFormulario && (
        <div className="us-modal-fondo">
          <section className="us-modal" role="dialog" aria-modal="true" aria-labelledby="us-modal-titulo">
            <header className="us-modal-header">
              <div>
                <span className="us-eyebrow">INFORMACIÓN DEL USUARIO</span>
                <h2 id="us-modal-titulo">
                  {usuarioEditando !== null ? "Editar usuario" : "Nuevo usuario"}
                </h2>
                <p>Completa los datos para guardar el registro.</p>
              </div>
              <button type="button" className="us-modal-cerrar" onClick={cerrarFormulario} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {errorForm && <div className="us-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={guardarUsuario}>
              <div className="us-form-grid">
                <label>
                  Nombres *
                  <input name="first_name" value={formulario.first_name} onChange={cambiarCampo} maxLength={150} required />
                </label>

                <label>
                  Apellidos *
                  <input name="last_name" value={formulario.last_name} onChange={cambiarCampo} maxLength={150} required />
                </label>

                <label>
                  Usuario *
                  <input name="username" value={formulario.username} onChange={cambiarCampo} maxLength={150} autoComplete="off" required />
                </label>

                <label>
                  Correo electrónico
                  <input name="email" type="email" value={formulario.email} onChange={cambiarCampo} />
                  <span className="us-ayuda">Se usa para recuperar la contraseña.</span>
                </label>

                <label>
                  Rol *
                  <select name="rol" value={formulario.rol} onChange={cambiarCampo} disabled={editandoBloqueado} required>
                    {ROLES.map(([valor, nombre]) => (
                      <option key={valor} value={valor}>{nombre}</option>
                    ))}
                  </select>
                </label>

                {usuarioEditando !== null && (
                  <label className="us-checkbox">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={Boolean(formulario.is_active)}
                      onChange={cambiarCampo}
                      disabled={editandoBloqueado}
                    />
                    Usuario activo (desmárcalo para archivarlo)
                  </label>
                )}

                {editandoBloqueado && (
                  <p className="us-ayuda us-campo-completo">
                    {motivoBloqueo(usuarioEditando)}
                  </p>
                )}

                <label>
                  {usuarioEditando !== null ? "Nueva contraseña" : "Contraseña *"}
                  <input
                    name="password"
                    type="password"
                    value={formulario.password}
                    onChange={cambiarCampo}
                    autoComplete="new-password"
                    minLength={8}
                    required={usuarioEditando === null}
                  />
                  {usuarioEditando !== null && (
                    <span className="us-ayuda">Déjala en blanco para conservar la actual.</span>
                  )}
                </label>

                <label>
                  Confirmar contraseña
                  <input
                    name="confirmar"
                    type="password"
                    value={formulario.confirmar}
                    onChange={cambiarCampo}
                    autoComplete="new-password"
                    required={Boolean(formulario.password)}
                  />
                </label>
              </div>

              <footer className="us-modal-footer">
                <button type="button" className="us-btn-secundario" onClick={cerrarFormulario} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="us-btn-primary" disabled={guardando}>
                  {guardando ? "Guardando..." : usuarioEditando !== null ? "Guardar cambios" : "Crear usuario"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Usuarios;