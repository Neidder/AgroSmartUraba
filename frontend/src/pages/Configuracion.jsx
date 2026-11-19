import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Palette,
  User,
  Server,
  Info,
  LifeBuoy,
  Sun,
  Moon,
  Monitor,
  Check,
  KeyRound,
  LogOut,
  RefreshCw,
  ExternalLink,
  GraduationCap,
  Search,
  Eye,
  EyeOff,
  Leaf,
  Users,
  Warehouse,
  Sprout,
  ClipboardCheck,
  Wheat,
  ShoppingCart,
  Wallet,
  LayoutDashboard,
  UserCog,
  Code,
  Wifi,
  WifiOff,
} from "lucide-react";
import { usePreferencias } from "../hooks/usePreferencias";
import { useUsuario, notificarUsuarioActualizado } from "../hooks/useUsuario";
import { temaResuelto } from "../utils/preferencias";
import { PROYECTO } from "../data/proyecto";
import "../styles/Configuracion.css";

const API_BASE = "http://127.0.0.1:8000";
const API_PERFIL = `${API_BASE}/api_usuarios/perfil/`;
const API_CAMBIAR_CLAVE = `${API_BASE}/api_usuarios/cambiar-contrasena/`;

const SECCIONES = [
  { clave: "apariencia", nombre: "Apariencia", Icono: Palette },
  { clave: "perfil", nombre: "Mi perfil", Icono: User },
  { clave: "sistema", nombre: "Sistema", Icono: Server },
  { clave: "acerca", nombre: "Acerca de", Icono: Info },
  { clave: "ayuda", nombre: "Ayuda", Icono: LifeBuoy },
];

const TEMAS = [
  { valor: "claro", nombre: "Claro", detalle: "Fondo claro", Icono: Sun },
  { valor: "oscuro", nombre: "Oscuro", detalle: "Descansa la vista", Icono: Moon },
  { valor: "auto", nombre: "Automático", detalle: "Sigue al sistema", Icono: Monitor },
];

const TAMANOS = [
  { valor: "pequena", nombre: "Pequeña", tamano: "0.85rem" },
  { valor: "normal", nombre: "Normal", tamano: "1rem" },
  { valor: "grande", nombre: "Grande", tamano: "1.15rem" },
  { valor: "muygrande", nombre: "Muy grande", tamano: "1.3rem" },
];

const FUENTES = [
  { valor: "predeterminada", nombre: "Predeterminada", familia: "inherit" },
  { valor: "clasica", nombre: "Clásica", familia: 'Georgia, "Times New Roman", serif' },
  { valor: "legible", nombre: "Alta legibilidad", familia: "Verdana, Tahoma, Geneva, sans-serif" },
  { valor: "monoespaciada", nombre: "Monoespaciada", familia: 'ui-monospace, "Cascadia Code", Consolas, monospace' },
];

const ACENTOS = [
  { valor: "verde", nombre: "Verde", color: "#0f7a45" },
  { valor: "azul", nombre: "Azul", color: "#1f6fb2" },
  { valor: "morado", nombre: "Morado", color: "#6b46c1" },
  { valor: "naranja", nombre: "Naranja", color: "#c2570c" },
];

const MODULOS = [
  { nombre: "Productores", detalle: "Registro de los productores de la región", Icono: Users },
  { nombre: "Fincas", detalle: "Fincas, ubicación y área", Icono: Warehouse },
  { nombre: "Cultivos y lotes", detalle: "Tipos de cultivo y su distribución", Icono: Sprout },
  { nombre: "Actividades", detalle: "Labores realizadas en los lotes", Icono: ClipboardCheck },
  { nombre: "Cosechas", detalle: "Producción por lote y por fecha", Icono: Wheat },
  { nombre: "Ventas", detalle: "Ventas con tarifas y anulación", Icono: ShoppingCart },
  { nombre: "Economía", detalle: "Costos, pérdidas y balance", Icono: Wallet },
  { nombre: "Panel principal", detalle: "Indicadores y gráficas", Icono: LayoutDashboard },
  { nombre: "Usuarios", detalle: "Cuentas y roles del sistema", Icono: UserCog },
];

const PREGUNTAS = [
  {
    p: "¿Cómo registro una finca?",
    r: "Entra a Fincas y pulsa «Nueva finca». Debes elegir un productor activo, escribir el nombre, el municipio y las hectáreas (mayores que 0). Si todavía no hay productores, registra uno primero en el módulo Productores.",
  },
  {
    p: "¿Cómo registro un lote o un cultivo?",
    r: "En Cultivos, primero crea el tipo de cultivo (plátano, banano, cacao…) con «Tipo de cultivo». Luego pulsa «Nuevo lote» y elige la finca y el tipo. La suma de las hectáreas de los lotes activos no puede superar el área de la finca.",
  },
  {
    p: "¿Cómo registro una cosecha?",
    r: "En Cosechas pulsa «Registrar cosecha», elige un lote activo, la fecha (no puede ser futura), la cantidad y la unidad de medida.",
  },
  {
    p: "¿Cómo registro una venta?",
    r: "Primero un administrador debe registrar una tarifa (precio por cultivo y unidad) en el panel «Tarifas vigentes» de Ventas. Después pulsa «Nueva venta», elige el productor y las cosechas que vende: el precio se toma solo de la tarifa vigente en la fecha de la venta.",
  },
  {
    p: "¿Cómo anulo una venta?",
    r: "En la tabla de Ventas, pulsa el icono de anular, escribe el motivo y confirma. La venta queda en el historial como anulada, deja de sumar a los ingresos y las cantidades vuelven a estar disponibles. No se puede deshacer.",
  },
  {
    p: "¿Por qué no puedo borrar registros?",
    r: "Para conservar el historial, el sistema no borra: archiva (actividades, usuarios), desactiva (fincas, lotes, productores) o anula (ventas). Así no se pierden cosechas, ventas ni costos asociados.",
  },
  {
    p: "¿Por qué no veo el módulo Usuarios?",
    r: "Solo los administradores lo ven. Si eres administrador y no aparece, cierra sesión y vuelve a ingresar para actualizar tus permisos.",
  },
  {
    p: "¿Por qué una cosecha no aparece al vender?",
    r: "Una cosecha solo está disponible si su lote, su finca, su productor y su cultivo están activos, y si todavía le queda cantidad sin vender.",
  },
  {
    p: "¿Cómo se calcula el balance en Economía?",
    r: "Balance = ingresos por ventas − costos de producción. Las pérdidas se muestran aparte como valor estimado, porque ya se reflejan en lo que se dejó de cosechar y vender.",
  },
  {
    p: "¿Cómo cambio el tema o el tamaño de la letra?",
    r: "En Configuración → Apariencia. Los cambios se aplican al instante y se guardan en este navegador.",
  },
  {
    p: "Olvidé mi contraseña, ¿qué hago?",
    r: "En la pantalla de inicio de sesión usa la opción de recuperar la contraseña: te llegará un enlace al correo registrado. Si ya iniciaste sesión, puedes cambiarla en Configuración → Mi perfil.",
  },
];

function textoError(datos, porDefecto) {
  if (!datos || typeof datos !== "object") return porDefecto;
  if (typeof datos.detail === "string") return datos.detail;
  if (typeof datos.error === "string") return datos.error;

  const partes = Object.values(datos).flatMap((valor) => (Array.isArray(valor) ? valor.map(String) : [String(valor)]));
  return partes.join(" | ") || porDefecto;
}

function formatearFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

function Interruptor({ activo, onChange, titulo, detalle }) {
  return (
    <label className="cf-interruptor">
      <span className="cf-interruptor-texto">
        <strong>{titulo}</strong>
        <small>{detalle}</small>
      </span>
      <input type="checkbox" role="switch" checked={activo} onChange={(e) => onChange(e.target.checked)} />
      <span className="cf-interruptor-pista" aria-hidden="true" />
    </label>
  );
}

/* ------------------------------------------------------------------ Apariencia */

function SeccionApariencia({ preferencias, cambiar, restablecer }) {
  return (
    <>
      <section className="cf-bloque">
        <h3>Tema</h3>
        <p className="cf-bloque-ayuda">Elige cómo se ve la aplicación. «Automático» usa el tema de tu sistema.</p>
        <div className="cf-opciones cf-opciones--3">
          {TEMAS.map(({ valor, nombre, detalle, Icono }) => (
            <button
              key={valor}
              type="button"
              className={`cf-opcion ${preferencias.tema === valor ? "cf-opcion--activa" : ""}`}
              onClick={() => cambiar("tema", valor)}
              aria-pressed={preferencias.tema === valor}
            >
              <Icono size={22} />
              <strong>{nombre}</strong>
              <small>{detalle}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="cf-bloque">
        <h3>Tamaño de letra</h3>
        <p className="cf-bloque-ayuda">Agranda o reduce el texto de toda la aplicación.</p>
        <div className="cf-opciones cf-opciones--4">
          {TAMANOS.map(({ valor, nombre, tamano }) => (
            <button
              key={valor}
              type="button"
              className={`cf-opcion ${preferencias.tamano === valor ? "cf-opcion--activa" : ""}`}
              onClick={() => cambiar("tamano", valor)}
              aria-pressed={preferencias.tamano === valor}
            >
              <span className="cf-muestra" style={{ fontSize: tamano }}>Aa</span>
              <strong>{nombre}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="cf-bloque">
        <h3>Tipo de letra</h3>
        <div className="cf-opciones cf-opciones--4">
          {FUENTES.map(({ valor, nombre, familia }) => (
            <button
              key={valor}
              type="button"
              className={`cf-opcion ${preferencias.fuente === valor ? "cf-opcion--activa" : ""}`}
              onClick={() => cambiar("fuente", valor)}
              aria-pressed={preferencias.fuente === valor}
            >
              <span className="cf-muestra" style={{ fontFamily: familia }}>Aa</span>
              <strong>{nombre}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="cf-bloque">
        <h3>Color de acento</h3>
        <p className="cf-bloque-ayuda">Cambia el color de los botones, los enlaces y los elementos activos.</p>
        <div className="cf-acentos">
          {ACENTOS.map(({ valor, nombre, color }) => (
            <button
              key={valor}
              type="button"
              className={`cf-acento ${preferencias.acento === valor ? "cf-acento--activo" : ""}`}
              onClick={() => cambiar("acento", valor)}
              aria-pressed={preferencias.acento === valor}
              aria-label={nombre}
              title={nombre}
            >
              <span className="cf-acento-color" style={{ background: color }}>
                {preferencias.acento === valor && <Check size={18} />}
              </span>
              <small>{nombre}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="cf-bloque">
        <h3>Accesibilidad y comodidad</h3>
        <div className="cf-interruptores">
          <Interruptor
            titulo="Alto contraste"
            detalle="Refuerza el texto y los bordes para leer con más facilidad."
            activo={preferencias.contraste === "alto"}
            onChange={(v) => cambiar("contraste", v ? "alto" : "normal")}
          />
          <Interruptor
            titulo="Reducir animaciones"
            detalle="Quita transiciones y movimientos de la interfaz."
            activo={preferencias.animaciones === "reducidas"}
            onChange={(v) => cambiar("animaciones", v ? "reducidas" : "normales")}
          />
          <Interruptor
            titulo="Tablas compactas"
            detalle="Muestra más filas en pantalla con menos espacio entre ellas."
            activo={preferencias.densidad === "compacta"}
            onChange={(v) => cambiar("densidad", v ? "compacta" : "comoda")}
          />
        </div>
      </section>

      <section className="cf-bloque">
        <h3>Vista previa</h3>
        <div className="cf-vista">
          <h4>Producción de plátano</h4>
          <p>Esta finca registró 12,5 toneladas durante el último mes.</p>
          <div className="cf-vista-fila">
            <span className="cf-chip cf-chip--ok">Activa</span>
            <span className="cf-chip cf-chip--aviso">Pendiente</span>
            <span className="cf-chip cf-chip--peligro">Anulada</span>
          </div>
          <div className="cf-vista-barra"><div /></div>
          <button type="button" className="cf-btn-primary">Botón principal</button>
        </div>
      </section>

      <div className="cf-pie">
        <button type="button" className="cf-btn-secundario" onClick={restablecer}>
          <RefreshCw size={16} /> Restablecer apariencia
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Perfil */

function SeccionPerfil() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const cabeceras = token ? { Authorization: `Token ${token}` } : {};

  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [clave, setClave] = useState({ actual: "", nueva: "", confirmar: "" });
  const [verClaves, setVerClaves] = useState(false);
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [mensajeClave, setMensajeClave] = useState("");
  const [errorClave, setErrorClave] = useState("");

  useEffect(() => {
    let vigente = true;

    (async () => {
      try {
        const respuesta = await fetch(API_PERFIL, { headers: cabeceras });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(textoError(datos, "No fue posible cargar tu perfil."));
        if (!vigente) return;
        setPerfil(datos);
        setForm({ first_name: datos.first_name || "", last_name: datos.last_name || "", email: datos.email || "" });
      } catch (err) {
        if (vigente) setError(err.message);
      } finally {
        if (vigente) setCargando(false);
      }
    })();

    return () => {
      vigente = false;
    };
  }, []);

  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  }

  async function guardarPerfil(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(API_PERFIL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...cabeceras },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(textoError(datos, "No fue posible guardar tu perfil."));

      setPerfil(datos);
      try {
        const guardado = JSON.parse(localStorage.getItem("usuario") || "{}");
        localStorage.setItem(
          "usuario",
          JSON.stringify({ ...guardado, nombre: datos.first_name, apellido: datos.last_name })
        );
      } catch {
        // si el usuario guardado no se puede leer, no se actualiza el nombre del encabezado
      }
      notificarUsuarioActualizado();
      setMensaje("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarClave(evento) {
    evento.preventDefault();
    setErrorClave("");
    setMensajeClave("");

    if (clave.nueva.length < 8) {
      setErrorClave("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (clave.nueva !== clave.confirmar) {
      setErrorClave("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setGuardandoClave(true);

    try {
      const respuesta = await fetch(API_CAMBIAR_CLAVE, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...cabeceras },
        body: JSON.stringify({ contrasena_actual: clave.actual, nueva_contrasena: clave.nueva }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(textoError(datos, "No fue posible cambiar la contraseña."));

      // el servidor renueva el token: se guarda para no perder la sesión
      if (datos.token) localStorage.setItem("token", datos.token);
      setClave({ actual: "", nueva: "", confirmar: "" });
      setMensajeClave("Contraseña actualizada. Tus otras sesiones se cerraron por seguridad.");
    } catch (err) {
      setErrorClave(err.message);
    } finally {
      setGuardandoClave(false);
    }
  }

  function cerrarSesion() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  }

  if (cargando) return <p className="cf-estado">Cargando tu perfil...</p>;

  const nombreCompleto = perfil ? `${perfil.first_name || ""} ${perfil.last_name || ""}`.trim() || perfil.username : "";

  return (
    <>
      {perfil && (
        <section className="cf-perfil-cabecera">
          <div className="cf-avatar">{nombreCompleto.charAt(0).toUpperCase()}</div>
          <div>
            <h3>{nombreCompleto}</h3>
            <p>
              @{perfil.username} ·{" "}
              <span className={`cf-chip ${perfil.rol === "ADMINISTRADOR" ? "cf-chip--ok" : "cf-chip--info"}`}>
                {perfil.rol === "ADMINISTRADOR" ? "Administrador" : "Trabajador"}
              </span>
            </p>
            <small>Miembro desde el {formatearFecha(perfil.date_joined)}</small>
          </div>
        </section>
      )}

      {error && !perfil && <div className="cf-alerta cf-alerta--error" role="alert">{error}</div>}

      {perfil && (
        <form className="cf-bloque" onSubmit={guardarPerfil}>
          <h3>Datos personales</h3>
          {mensaje && <div className="cf-alerta cf-alerta--ok" role="status">{mensaje}</div>}
          {error && <div className="cf-alerta cf-alerta--error" role="alert">{error}</div>}

          <div className="cf-form-grid">
            <label>
              Nombres
              <input name="first_name" value={form.first_name} onChange={cambiarCampo} maxLength={150} required />
            </label>
            <label>
              Apellidos
              <input name="last_name" value={form.last_name} onChange={cambiarCampo} maxLength={150} required />
            </label>
            <label>
              Usuario
              <input value={perfil.username} disabled />
              <span className="cf-ayuda">El nombre de usuario no se puede cambiar.</span>
            </label>
            <label>
              Correo electrónico
              <input name="email" type="email" value={form.email} onChange={cambiarCampo} />
              <span className="cf-ayuda">Se usa para recuperar la contraseña.</span>
            </label>
          </div>

          <div className="cf-pie">
            <button type="submit" className="cf-btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}

      <form className="cf-bloque" onSubmit={cambiarClave}>
        <h3><KeyRound size={18} /> Cambiar contraseña</h3>
        <p className="cf-bloque-ayuda">Usa al menos 8 caracteres. Al cambiarla se cierran tus otras sesiones abiertas.</p>

        {mensajeClave && <div className="cf-alerta cf-alerta--ok" role="status">{mensajeClave}</div>}
        {errorClave && <div className="cf-alerta cf-alerta--error" role="alert">{errorClave}</div>}

        <div className="cf-form-grid">
          <label className="cf-campo-completo">
            Contraseña actual
            <input
              type={verClaves ? "text" : "password"}
              value={clave.actual}
              onChange={(e) => setClave((c) => ({ ...c, actual: e.target.value }))}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type={verClaves ? "text" : "password"}
              value={clave.nueva}
              onChange={(e) => setClave((c) => ({ ...c, nueva: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              type={verClaves ? "text" : "password"}
              value={clave.confirmar}
              onChange={(e) => setClave((c) => ({ ...c, confirmar: e.target.value }))}
              autoComplete="new-password"
              required
            />
          </label>
        </div>

        <div className="cf-pie cf-pie--entre">
          <button type="button" className="cf-enlace" onClick={() => setVerClaves((v) => !v)}>
            {verClaves ? <EyeOff size={16} /> : <Eye size={16} />} {verClaves ? "Ocultar contraseñas" : "Mostrar contraseñas"}
          </button>
          <button type="submit" className="cf-btn-primary" disabled={guardandoClave}>
            {guardandoClave ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </div>
      </form>

      <section className="cf-bloque">
        <h3>Sesión</h3>
        <p className="cf-bloque-ayuda">Cierra la sesión en este dispositivo.</p>
        <div className="cf-pie">
          <button type="button" className="cf-btn-peligro" onClick={cerrarSesion}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ Sistema */

function SeccionSistema({ preferencias, restablecer }) {
  const { nombre, rol } = useUsuario();
  const token = localStorage.getItem("token");
  const [conexion, setConexion] = useState({ estado: "probando", ms: null });

  async function probarConexion() {
    setConexion({ estado: "probando", ms: null });
    const inicio = performance.now();
    try {
      const respuesta = await fetch(API_PERFIL, { headers: token ? { Authorization: `Token ${token}` } : {} });
      const ms = Math.round(performance.now() - inicio);
      setConexion({ estado: respuesta.ok ? "ok" : respuesta.status === 401 ? "sesion" : "error", ms });
    } catch {
      setConexion({ estado: "error", ms: null });
    }
  }

  useEffect(() => {
    probarConexion();
  }, []);

  const estados = {
    probando: { texto: "Probando la conexión...", clase: "", Icono: RefreshCw },
    ok: { texto: `Conectado al servidor${conexion.ms !== null ? ` · ${conexion.ms} ms` : ""}`, clase: "cf-conexion--ok", Icono: Wifi },
    sesion: { texto: "El servidor responde, pero tu sesión expiró. Vuelve a iniciar sesión.", clase: "cf-conexion--aviso", Icono: Wifi },
    error: { texto: "Sin conexión con el servidor. Verifica que Django esté encendido.", clase: "cf-conexion--error", Icono: WifiOff },
  };
  const actual = estados[conexion.estado];
  const Icono = actual.Icono;

  const datos = [
    ["Versión de la aplicación", PROYECTO.version],
    ["Servidor", API_BASE],
    ["Usuario conectado", nombre],
    ["Rol", rol],
    ["Tema aplicado", temaResuelto(preferencias.tema) === "oscuro" ? "Oscuro" : "Claro"],
    ["Idioma del navegador", navigator.language || "—"],
  ];

  return (
    <>
      <section className="cf-bloque">
        <h3>Conexión con el servidor</h3>
        <div className={`cf-conexion ${actual.clase}`}>
          <Icono size={20} />
          <span>{actual.texto}</span>
          <button type="button" className="cf-btn-secundario" onClick={probarConexion} disabled={conexion.estado === "probando"}>
            Probar de nuevo
          </button>
        </div>
      </section>

      <section className="cf-bloque">
        <h3>Información del sistema</h3>
        <dl className="cf-datos">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt>{etiqueta}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="cf-bloque">
        <h3>Mantenimiento</h3>
        <p className="cf-bloque-ayuda">
          Las preferencias de apariencia se guardan solo en este navegador. Puedes volver a los valores originales.
        </p>
        <div className="cf-pie cf-pie--inicio">
          <button type="button" className="cf-btn-secundario" onClick={restablecer}>
            <RefreshCw size={16} /> Restablecer preferencias
          </button>
          <button type="button" className="cf-btn-secundario" onClick={() => window.location.reload()}>
            Recargar la aplicación
          </button>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ Acerca de */

function SeccionAcerca() {
  const { institucion } = PROYECTO;

  return (
    <>
      <section className="cf-hero">
        <div className="cf-hero-icono"><Leaf size={34} /></div>
        <div>
          <h3>{PROYECTO.nombre}</h3>
          <p>{PROYECTO.eslogan}</p>
          <span className="cf-chip cf-chip--ok">Versión {PROYECTO.version}</span>
        </div>
      </section>

      <section className="cf-bloque">
        <h3>Sobre el proyecto</h3>
        <p className="cf-texto">{PROYECTO.descripcion}</p>
        <h4 className="cf-subtitulo">Objetivo</h4>
        <p className="cf-texto">{PROYECTO.objetivo}</p>
      </section>

      <section className="cf-bloque">
        <h3>Módulos</h3>
        <div className="cf-modulos">
          {MODULOS.map(({ nombre, detalle, Icono }) => (
            <div key={nombre} className="cf-modulo">
              <span className="cf-modulo-icono"><Icono size={18} /></span>
              <div>
                <strong>{nombre}</strong>
                <small>{detalle}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cf-bloque">
        <h3>Equipo de desarrollo</h3>
        <div className="cf-equipo">
          {PROYECTO.equipo.map((persona) => (
            <article key={persona.nombre} className="cf-persona">
              <div className="cf-avatar cf-avatar--grande">{persona.nombre.charAt(0)}</div>
              <div>
                <strong>{persona.nombre}</strong>
                <small>{persona.rol}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cf-bloque">
        <h3><GraduationCap size={18} /> Contexto académico</h3>
        <dl className="cf-datos">
          <div><dt>Institución</dt><dd>{institucion.nombre}</dd></div>
          <div><dt>Programa</dt><dd>{institucion.programa}</dd></div>
          <div><dt>Asignatura</dt><dd>{institucion.proyecto}</dd></div>
          <div><dt>Grupo</dt><dd>{institucion.grupo}</dd></div>
          <div><dt>Docente</dt><dd>{institucion.docente}</dd></div>
          <div><dt>Lugar y año</dt><dd>{institucion.ciudad} — {institucion.anio}</dd></div>
        </dl>
      </section>

      <section className="cf-bloque">
        <h3><Code size={18} /> Tecnologías</h3>
        <div className="cf-tecnologias">
          {PROYECTO.tecnologias.map(({ grupo, items }) => (
            <div key={grupo}>
              <strong>{grupo}</strong>
              <div className="cf-etiquetas">
                {items.map((item) => (
                  <span key={item} className="cf-chip cf-chip--neutro">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cf-bloque">
        <h3>Código fuente</h3>
        <p className="cf-bloque-ayuda">El proyecto está publicado en GitHub.</p>
        <div className="cf-pie cf-pie--inicio">
          <a className="cf-btn-secundario" href={PROYECTO.repositorio} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> Ver repositorio
          </a>
        </div>
      </section>

      <p className="cf-copyright">
        © {institucion.anio} {PROYECTO.nombre} · {institucion.nombre}
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ Ayuda */

function SeccionAyuda() {
  const [busqueda, setBusqueda] = useState("");
  const texto = busqueda.trim().toLowerCase();
  const visibles = PREGUNTAS.filter(({ p, r }) => !texto || `${p} ${r}`.toLowerCase().includes(texto));

  return (
    <section className="cf-bloque">
      <h3>Preguntas frecuentes</h3>
      <p className="cf-bloque-ayuda">Respuestas rápidas sobre cómo usar AgroSmart Urabá.</p>

      <label className="cf-busqueda">
        <Search size={18} />
        <input
          type="search"
          placeholder="Buscar en la ayuda..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </label>

      {visibles.length === 0 ? (
        <p className="cf-estado">No encontramos resultados para «{busqueda}».</p>
      ) : (
        <div className="cf-preguntas">
          {visibles.map(({ p, r }) => (
            <details key={p} className="cf-pregunta">
              <summary>{p}</summary>
              <p>{r}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Página */

function Configuracion() {
  const { preferencias, cambiar, restablecer } = usePreferencias();
  const [seccion, setSeccion] = useState("apariencia");

  const actual = SECCIONES.find((s) => s.clave === seccion);

  return (
    <div className="cf-page">
      <header className="cf-header">
        <div className="cf-titulo">
          <Settings size={38} strokeWidth={1.6} />
          <div>
            <h1>Configuración</h1>
            <p>Personaliza la aplicación, administra tu cuenta y consulta la información del proyecto.</p>
          </div>
        </div>
      </header>

      <div className="cf-layout">
        <nav className="cf-menu" aria-label="Secciones de configuración">
          {SECCIONES.map(({ clave, nombre, Icono }) => (
            <button
              key={clave}
              type="button"
              className={`cf-menu-item ${seccion === clave ? "cf-menu-item--activo" : ""}`}
              onClick={() => setSeccion(clave)}
              aria-current={seccion === clave ? "page" : undefined}
            >
              <Icono size={18} />
              <span>{nombre}</span>
            </button>
          ))}
        </nav>

        <section className="cf-contenido" aria-labelledby="cf-seccion-titulo">
          <h2 id="cf-seccion-titulo" className="cf-seccion-titulo">{actual.nombre}</h2>

          {seccion === "apariencia" && (
            <SeccionApariencia preferencias={preferencias} cambiar={cambiar} restablecer={restablecer} />
          )}
          {seccion === "perfil" && <SeccionPerfil />}
          {seccion === "sistema" && <SeccionSistema preferencias={preferencias} restablecer={restablecer} />}
          {seccion === "acerca" && <SeccionAcerca />}
          {seccion === "ayuda" && <SeccionAyuda />}
        </section>
      </div>
    </div>
  );
}

export default Configuracion;