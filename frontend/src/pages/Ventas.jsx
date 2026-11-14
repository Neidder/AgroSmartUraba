import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Receipt,
  Banknote,
  TrendingUp,
  Ban,
  CalendarDays,
  Tag,
  Sprout,
  Users,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useUsuario } from "../hooks/useUsuario";
import "../styles/Ventas.css";

const API_BASE = "http://127.0.0.1:8000";
const API_VENTAS = `${API_BASE}/api_ventas/ventas/`;
const API_PRECIOS = `${API_BASE}/api_ventas/precios/`;
const API_TIPOS = `${API_BASE}/api_cultivos/tipos-cultivo/`;
const POR_PAGINA = 10;

const UNIDADES = [
  ["KG", "Kilogramos"],
  ["TON", "Toneladas"],
  ["UND", "Unidades"],
  ["CAJAS", "Cajas"],
];

const ETIQUETAS = {
  productor: "Productor",
  fecha_venta: "Fecha de venta",
  comprador_nombre: "Comprador",
  comprador_documento: "Documento del comprador",
  comprador_contacto: "Contacto del comprador",
  detalles: "Productos",
  cosecha: "Cosecha",
  cantidad: "Cantidad",
  tipo_cultivo: "Cultivo",
  unidad_medida: "Unidad",
  precio_unitario: "Precio",
  vigente_desde: "Vigente desde",
  motivo: "Motivo",
  estado: "Estado",
};

function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function ventaInicial() {
  return {
    productor: "",
    fecha_venta: hoyISO(),
    comprador_nombre: "",
    comprador_documento: "",
    comprador_contacto: "",
    lineas: [{ cosecha: "", cantidad: "" }],
  };
}

function tarifaInicial() {
  return { tipo_cultivo: "", unidad_medida: "KG", precio_unitario: "", vigente_desde: hoyISO() };
}

function listaDe(datos) {
  return Array.isArray(datos) ? datos : datos?.results || [];
}

// Convierte cualquier forma de error del backend (texto, lista, objetos anidados) en frases.
function aplanar(valor) {
  if (valor === null || valor === undefined) return [];
  if (typeof valor === "string") return [valor];
  if (Array.isArray(valor)) return valor.flatMap(aplanar);
  if (typeof valor === "object") {
    return Object.entries(valor).flatMap(([campo, v]) =>
      aplanar(v).map((t) => (ETIQUETAS[campo] ? `${ETIQUETAS[campo]}: ${t}` : t))
    );
  }
  return [String(valor)];
}

function textoError(datos, porDefecto) {
  if (!datos || typeof datos !== "object") return porDefecto;
  if (typeof datos.detail === "string") return datos.detail;

  const partes = Object.entries(datos).flatMap(([campo, v]) => {
    const etiqueta = ETIQUETAS[campo];
    return aplanar(v).map((t) => (etiqueta ? `${etiqueta}: ${t}` : t));
  });

  return partes.join(" | ") || porDefecto;
}

// Las fechas llegan como "AAAA-MM-DD": se arman a mano para evitar desfases de zona horaria.
function formatearFecha(texto) {
  if (!texto) return "—";
  const [anio, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${anio}`;
}

function formatearFechaHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

function formatearCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatearCantidad(valor) {
  return Number(valor || 0).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function mesDe(fecha) {
  const [anio, mes] = fecha.split("-").map(Number);
  return anio * 12 + (mes - 1);
}

function numerosDePagina(actual, total) {
  const max = 5;
  let fin = Math.min(total, Math.max(1, actual - 2) + max - 1);
  const inicio = Math.max(1, fin - max + 1);
  fin = Math.min(total, fin);
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

function BarrasIngresos({ datos }) {
  const maximo = Math.max(0, ...datos.map(([, valor]) => valor));
  return (
    <ul className="vt-barras">
      {datos.map(([nombre, valor]) => (
        <li key={nombre}>
          <div className="vt-barra-texto">
            <span>{nombre}</span>
            <strong>{formatearCOP(valor)}</strong>
          </div>
          <div className="vt-barra">
            <div style={{ width: `${maximo ? (valor / maximo) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Ventas() {
  const { esAdministrador } = useUsuario();

  const [ventas, setVentas] = useState([]);
  const [precios, setPrecios] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [opciones, setOpciones] = useState({ productores: [], cosechas: [] });

  const [form, setForm] = useState(ventaInicial);
  const [ventaEditando, setVentaEditando] = useState(null);
  const [mostrarVenta, setMostrarVenta] = useState(false);
  const [cargandoOpciones, setCargandoOpciones] = useState(false);
  const [ventaViendo, setVentaViendo] = useState(null);
  const [ventaAnulando, setVentaAnulando] = useState(null);
  const [motivo, setMotivo] = useState("");

  const [formTarifa, setFormTarifa] = useState(tarifaInicial);
  const [mostrarTarifa, setMostrarTarifa] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtroProductor, setFiltroProductor] = useState("todos");
  const [filtroProducto, setFiltroProducto] = useState("todos");
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

  async function cargarVentas() {
    try {
      setVentas(await pedirLista(API_VENTAS, "No fue posible cargar las ventas."));
    } catch (err) {
      setError(`${err.message} Verifica que Django esté funcionando y que la URL de la API sea correcta.`);
    }
  }

  async function cargarPrecios() {
    try {
      setPrecios(await pedirLista(API_PRECIOS, "No fue posible cargar las tarifas."));
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarTipos() {
    try {
      setTipos(await pedirLista(API_TIPOS, "No fue posible cargar los tipos de cultivo."));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    Promise.all([cargarVentas(), cargarPrecios(), cargarTipos()]).finally(() => setCargando(false));
  }, []);

  // Cosechas disponibles y precios vigentes a la fecha de la venta
  async function cargarOpciones(fecha, ventaId) {
    setCargandoOpciones(true);
    const parametros = new URLSearchParams({ fecha_venta: fecha });
    if (ventaId) parametros.set("venta", ventaId);

    try {
      const respuesta = await fetch(`${API_VENTAS}opciones/?${parametros}`, { headers: authHeaders });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(textoError(datos, "No fue posible cargar las cosechas disponibles."));
      }
      setOpciones(await respuesta.json());
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setCargandoOpciones(false);
    }
  }

  // ---------- Venta: formulario ----------
  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  }

  function cambiarProductor(evento) {
    // las cosechas dependen del productor: se reinician los productos
    setForm((actual) => ({ ...actual, productor: evento.target.value, lineas: [{ cosecha: "", cantidad: "" }] }));
  }

  function cambiarFecha(evento) {
    const fecha = evento.target.value;
    setForm((actual) => ({ ...actual, fecha_venta: fecha }));
    if (fecha) cargarOpciones(fecha, ventaEditando?.id);
  }

  function cambiarLinea(indice, campo, valor) {
    setForm((actual) => ({
      ...actual,
      lineas: actual.lineas.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)),
    }));
  }

  function agregarLinea() {
    setForm((actual) => ({ ...actual, lineas: [...actual.lineas, { cosecha: "", cantidad: "" }] }));
  }

  function quitarLinea(indice) {
    setForm((actual) => ({
      ...actual,
      lineas: actual.lineas.length === 1 ? actual.lineas : actual.lineas.filter((_, i) => i !== indice),
    }));
  }

  function nuevaVenta() {
    const inicial = ventaInicial();
    setVentaEditando(null);
    setForm(inicial);
    setErrorForm("");
    setMensaje("");
    setMostrarVenta(true);
    cargarOpciones(inicial.fecha_venta, null);
  }

  function editarVenta(venta) {
    setVentaEditando(venta);
    setForm({
      productor: String(venta.productor),
      fecha_venta: venta.fecha_venta,
      comprador_nombre: venta.comprador_nombre || "",
      comprador_documento: venta.comprador_documento || "",
      comprador_contacto: venta.comprador_contacto || "",
      lineas: venta.detalles.map((d) => ({ cosecha: String(d.cosecha), cantidad: d.cantidad })),
    });
    setErrorForm("");
    setMensaje("");
    setMostrarVenta(true);
    cargarOpciones(venta.fecha_venta, venta.id);
  }

  function cerrarVenta() {
    setMostrarVenta(false);
    setVentaEditando(null);
    setForm(ventaInicial());
    setErrorForm("");
  }

  // Al editar, las líneas que ya existían conservan su precio original.
  const preciosOriginales = {};
  ventaEditando?.detalles.forEach((d) => {
    preciosOriginales[d.cosecha] = d.precio_unitario;
  });

  const cosechasDelProductor = opciones.cosechas.filter((c) => String(c.productor) === String(form.productor));

  function estadoLinea(linea) {
    const opcion = cosechasDelProductor.find((c) => String(c.id) === String(linea.cosecha));
    const precio = opcion ? (preciosOriginales[opcion.id] ?? opcion.precio_unitario) : null;
    const cantidad = Number(linea.cantidad || 0);
    const disponible = opcion ? Number(opcion.cantidad_disponible) : 0;
    const sinTarifa = Boolean(opcion) && precio === null;
    const excede = Boolean(opcion) && cantidad > disponible;
    const subtotal = opcion && precio !== null ? cantidad * Number(precio) : 0;
    const completa = Boolean(opcion) && cantidad > 0 && !sinTarifa && !excede;
    return { opcion, precio, cantidad, disponible, sinTarifa, excede, subtotal, completa };
  }

  const estadosLineas = form.lineas.map(estadoLinea);
  const totalVenta = estadosLineas.reduce((suma, e) => suma + e.subtotal, 0);
  const ventaValida = Boolean(form.productor) && estadosLineas.length > 0 && estadosLineas.every((e) => e.completa);

  async function guardarVenta(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm("");
    setMensaje("");

    const editando = ventaEditando !== null;

    try {
      const respuesta = await fetch(editando ? `${API_VENTAS}${ventaEditando.id}/` : API_VENTAS, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          productor: Number(form.productor),
          fecha_venta: form.fecha_venta,
          comprador_nombre: form.comprador_nombre.trim(),
          comprador_documento: form.comprador_documento.trim(),
          comprador_contacto: form.comprador_contacto.trim(),
          detalles: form.lineas.map((l) => ({ cosecha: Number(l.cosecha), cantidad: l.cantidad })),
        }),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(textoError(datos, "No fue posible guardar la venta."));

      cerrarVenta();
      setMensaje(editando ? "Venta actualizada correctamente." : "Venta registrada correctamente.");
      await cargarVentas();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // ---------- Anular ----------
  function abrirAnulacion(venta) {
    setVentaAnulando(venta);
    setMotivo("");
    setErrorForm("");
    setMensaje("");
  }

  async function anularVenta(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm("");

    try {
      const respuesta = await fetch(`${API_VENTAS}${ventaAnulando.id}/anular/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(textoError(datos, "No fue posible anular la venta."));

      setVentaAnulando(null);
      setMensaje("Venta anulada correctamente. Las cantidades vuelven a estar disponibles.");
      await cargarVentas();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // ---------- Tarifas ----------
  function cambiarTarifa(evento) {
    const { name, value } = evento.target;
    setFormTarifa((actual) => ({ ...actual, [name]: value }));
  }

  function nuevaTarifa() {
    setFormTarifa(tarifaInicial());
    setErrorForm("");
    setMensaje("");
    setMostrarTarifa(true);
  }

  function cerrarTarifa() {
    setMostrarTarifa(false);
    setErrorForm("");
  }

  async function guardarTarifa(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm("");

    try {
      const respuesta = await fetch(API_PRECIOS, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ ...formTarifa, tipo_cultivo: Number(formTarifa.tipo_cultivo) }),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(textoError(datos, "No fue posible guardar la tarifa."));

      cerrarTarifa();
      setMensaje("Tarifa registrada correctamente.");
      await cargarPrecios();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // Tarifa vigente de hoy por cultivo y unidad
  const hoy = hoyISO();
  const vigentes = {};
  precios
    .filter((p) => p.vigente_desde <= hoy)
    .forEach((p) => {
      const clave = `${p.tipo_cultivo}-${p.unidad_medida}`;
      const actual = vigentes[clave];
      if (!actual || p.vigente_desde > actual.vigente_desde || (p.vigente_desde === actual.vigente_desde && p.id > actual.id)) {
        vigentes[clave] = p;
      }
    });
  const listaTarifas = (verHistorial ? precios : Object.values(vigentes)).slice().sort(
    (a, b) =>
      a.nombre_tipo_cultivo.localeCompare(b.nombre_tipo_cultivo, "es") ||
      a.unidad_medida.localeCompare(b.unidad_medida) ||
      b.vigente_desde.localeCompare(a.vigente_desde)
  );

  // ---------- Indicadores (datos reales) ----------
  const registradas = ventas.filter((v) => v.estado === "REGISTRADA");
  const anuladas = ventas.length - registradas.length;
  const ingresosTotales = registradas.reduce((suma, v) => suma + Number(v.total || 0), 0);
  const promedio = registradas.length ? ingresosTotales / registradas.length : 0;

  const mesActual = new Date().getFullYear() * 12 + new Date().getMonth();
  const ventasEsteMes = registradas.filter((v) => mesDe(v.fecha_venta) === mesActual).length;
  const ingresosDelMes = (mes) =>
    registradas.filter((v) => mesDe(v.fecha_venta) === mes).reduce((suma, v) => suma + Number(v.total || 0), 0);
  const ingresosMesAnterior = ingresosDelMes(mesActual - 1);
  const variacionIngresos =
    ingresosMesAnterior > 0
      ? Math.round(((ingresosDelMes(mesActual) - ingresosMesAnterior) * 100) / ingresosMesAnterior)
      : null;

  // ---------- Filtros y paginación ----------
  const productoresOpciones = [...new Set(ventas.map((v) => v.nombre_productor))].sort((a, b) => a.localeCompare(b, "es"));
  const productosOpciones = [...new Set(ventas.flatMap((v) => v.detalles.map((d) => d.nombre_producto)))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  const filtradas = ventas.filter((v) => {
    const texto = [
      `#${v.id}`,
      v.nombre_productor,
      v.comprador_nombre,
      v.comprador_documento,
      ...v.detalles.map((d) => d.nombre_producto),
    ]
      .join(" ")
      .toLowerCase();

    return (
      texto.includes(busqueda.toLowerCase()) &&
      (!desde || v.fecha_venta >= desde) &&
      (!hasta || v.fecha_venta <= hasta) &&
      (filtroProductor === "todos" || v.nombre_productor === filtroProductor) &&
      (filtroProducto === "todos" || v.detalles.some((d) => d.nombre_producto === filtroProducto)) &&
      (filtroEstado === "todos" || v.estado === filtroEstado)
    );
  });

  const hayFiltros =
    busqueda || desde || hasta || filtroProductor !== "todos" || filtroProducto !== "todos" || filtroEstado !== "todos";

  function limpiarFiltros() {
    setBusqueda("");
    setDesde("");
    setHasta("");
    setFiltroProductor("todos");
    setFiltroProducto("todos");
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

  // Ingresos por producto y por productor (sobre las ventas registradas del filtro actual)
  const porProducto = {};
  const porProductor = {};
  filtradas
    .filter((v) => v.estado === "REGISTRADA")
    .forEach((v) => {
      porProductor[v.nombre_productor] = (porProductor[v.nombre_productor] || 0) + Number(v.total || 0);
      v.detalles.forEach((d) => {
        porProducto[d.nombre_producto] = (porProducto[d.nombre_producto] || 0) + Number(d.subtotal || 0);
      });
    });
  const topProductos = Object.entries(porProducto).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topProductores = Object.entries(porProductor).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const tiposActivos = tipos.filter((t) => t.activo);

  return (
    <div className="vt-page">
      <header className="vt-header">
        <div className="vt-titulo">
          <ShoppingCart size={38} strokeWidth={1.6} />
          <div>
            <h1>Ventas</h1>
            <p>Registra las ventas de cosechas y consulta los ingresos.</p>
          </div>
        </div>

        <button className="vt-btn-primary" onClick={nuevaVenta}>
          <Plus size={18} /> Nueva venta
        </button>
      </header>

      <section className="vt-kpis">
        <article className="vt-card vt-kpi">
          <div className="vt-kpi-icon"><Receipt size={24} /></div>
          <div>
            <span>Ventas registradas</span>
            <strong>{registradas.length}</strong>
            {ventasEsteMes > 0 && <small className="vt-up">↑ +{ventasEsteMes} este mes</small>}
          </div>
        </article>

        <article className="vt-card vt-kpi">
          <div className="vt-kpi-icon"><Banknote size={24} /></div>
          <div>
            <span>Ingresos totales</span>
            <strong className="vt-kpi-monto">{formatearCOP(ingresosTotales)}</strong>
            {variacionIngresos !== null ? (
              <small className={variacionIngresos >= 0 ? "vt-up" : "vt-down"}>
                {variacionIngresos >= 0 ? "↑" : "↓"} {Math.abs(variacionIngresos)}% vs. mes anterior
              </small>
            ) : (
              <small>sin contar ventas anuladas</small>
            )}
          </div>
        </article>

        <article className="vt-card vt-kpi">
          <div className="vt-kpi-icon"><TrendingUp size={24} /></div>
          <div>
            <span>Promedio por venta</span>
            <strong className="vt-kpi-monto">{formatearCOP(promedio)}</strong>
            <small>por venta registrada</small>
          </div>
        </article>

        <article className="vt-card vt-kpi">
          <div className="vt-kpi-icon"><Ban size={24} /></div>
          <div>
            <span>Ventas anuladas</span>
            <strong>{anuladas}</strong>
            <small>no suman a los ingresos</small>
          </div>
        </article>
      </section>

      {mensaje && (
        <div className="vt-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="vt-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error"><X size={16} /></button>
        </div>
      )}

      <div className="vt-grid">
        <section className="vt-card vt-panel">
          <div className="vt-filtros">
            <label className="vt-busqueda">
              <Search size={18} />
              <input
                type="search"
                placeholder="Buscar por n.º, productor, comprador o producto..."
                value={busqueda}
                onChange={(e) => conFiltro(setBusqueda)(e.target.value)}
              />
            </label>

            <div className="vt-rango">
              <CalendarDays size={18} />
              <label>
                <span>Desde</span>
                <input type="date" value={desde} max={hasta || undefined} onChange={(e) => conFiltro(setDesde)(e.target.value)} />
              </label>
              <label>
                <span>Hasta</span>
                <input type="date" value={hasta} min={desde || undefined} onChange={(e) => conFiltro(setHasta)(e.target.value)} />
              </label>
            </div>

            <select value={filtroProductor} onChange={(e) => conFiltro(setFiltroProductor)(e.target.value)} aria-label="Filtrar por productor">
              <option value="todos">Todos los productores</option>
              {productoresOpciones.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select value={filtroProducto} onChange={(e) => conFiltro(setFiltroProducto)(e.target.value)} aria-label="Filtrar por producto">
              <option value="todos">Todos los productos</option>
              {productosOpciones.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select value={filtroEstado} onChange={(e) => conFiltro(setFiltroEstado)(e.target.value)} aria-label="Filtrar por estado">
              <option value="todos">Todos los estados</option>
              <option value="REGISTRADA">Registradas</option>
              <option value="ANULADA">Anuladas</option>
            </select>

            {hayFiltros && (
              <button type="button" className="vt-btn-secundario" onClick={limpiarFiltros}>
                Limpiar
              </button>
            )}
          </div>

          {cargando ? (
            <div className="vt-vacio">Cargando ventas...</div>
          ) : total === 0 ? (
            <div className="vt-vacio">
              <ShoppingCart size={38} strokeWidth={1.4} />
              <h3>No hay ventas para mostrar</h3>
              <p>Registra una venta o cambia los filtros de búsqueda.</p>
              <button className="vt-btn-primary" onClick={nuevaVenta}>Registrar venta</button>
            </div>
          ) : (
            <div className="vt-tabla-contenedor">
              <table className="vt-tabla">
                <thead>
                  <tr>
                    <th>N.º</th>
                    <th>Fecha</th>
                    <th>Productor</th>
                    <th>Comprador</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((venta) => {
                    const productos = venta.detalles
                      .map((d) => `${d.nombre_producto} (${formatearCantidad(d.cantidad)} ${d.unidad_medida})`)
                      .join(", ");
                    const anulada = venta.estado === "ANULADA";

                    return (
                      <tr key={venta.id} className={anulada ? "vt-fila--anulada" : ""}>
                        <td><strong className="vt-nombre">#{venta.id}</strong></td>
                        <td>{formatearFecha(venta.fecha_venta)}</td>
                        <td>{venta.nombre_productor}</td>
                        <td>{venta.comprador_nombre || "—"}</td>
                        <td className="vt-productos" title={productos}>{productos}</td>
                        <td className="vt-total">{formatearCOP(venta.total)}</td>
                        <td>
                          <span className={`vt-estado ${anulada ? "anulada" : "registrada"}`}>
                            {anulada ? "Anulada" : "Registrada"}
                          </span>
                        </td>
                        <td>
                          <div className="vt-acciones">
                            <button className="vt-accion ver" onClick={() => setVentaViendo(venta)} title="Ver detalle" aria-label="Ver detalle">
                              <Eye size={17} />
                            </button>
                            {!anulada && (
                              <>
                                <button className="vt-accion editar" onClick={() => editarVenta(venta)} title="Editar venta" aria-label="Editar venta">
                                  <Pencil size={17} />
                                </button>
                                <button className="vt-accion desactivar" onClick={() => abrirAnulacion(venta)} title="Anular venta" aria-label="Anular venta">
                                  <Ban size={17} />
                                </button>
                              </>
                            )}
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
            <footer className="vt-paginacion">
              <span>
                Mostrando {inicio + 1} - {inicio + visibles.length} de {total} ventas
              </span>
              <div className="vt-paginas">
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

        <aside className="vt-side">
          <section className="vt-card">
            <div className="vt-side-cabecera">
              <h3 className="vt-side-titulo"><Tag size={18} /> {verHistorial ? "Historial de tarifas" : "Tarifas vigentes"}</h3>
              {esAdministrador && (
                <button className="vt-accion editar" onClick={nuevaTarifa} title="Nueva tarifa" aria-label="Nueva tarifa">
                  <Plus size={17} />
                </button>
              )}
            </div>

            {listaTarifas.length === 0 ? (
              <p className="vt-side-vacio">
                Aún no hay tarifas. {esAdministrador ? "Registra la primera para poder vender." : "Pide a un administrador que registre una."}
              </p>
            ) : (
              <ul className="vt-tarifas">
                {listaTarifas.map((t) => (
                  <li key={t.id}>
                    <div>
                      <strong>{t.nombre_tipo_cultivo}</strong>
                      <small>
                        por {t.unidad_medida_display.toLowerCase()} · desde {formatearFecha(t.vigente_desde)}
                      </small>
                    </div>
                    <span className="vt-tarifa-precio">{formatearCOP(t.precio_unitario)}</span>
                  </li>
                ))}
              </ul>
            )}

            {precios.length > 0 && (
              <button type="button" className="vt-enlace vt-enlace--bloque" onClick={() => setVerHistorial((v) => !v)}>
                {verHistorial ? "Ver solo las vigentes" : "Ver historial completo"}
              </button>
            )}
          </section>

          <section className="vt-card">
            <h3 className="vt-side-titulo"><Sprout size={18} /> Ingresos por producto</h3>
            {topProductos.length === 0 ? (
              <p className="vt-side-vacio">Aún no hay ventas registradas.</p>
            ) : (
              <BarrasIngresos datos={topProductos} />
            )}
          </section>

          <section className="vt-card">
            <h3 className="vt-side-titulo"><Users size={18} /> Ingresos por productor</h3>
            {topProductores.length === 0 ? (
              <p className="vt-side-vacio">Aún no hay ventas registradas.</p>
            ) : (
              <BarrasIngresos datos={topProductores} />
            )}
          </section>
        </aside>
      </div>

      {/* Modal: detalle de la venta */}
      {ventaViendo && (
        <div className="vt-modal-fondo">
          <section className="vt-modal vt-modal--ancho" role="dialog" aria-modal="true">
            <header className="vt-modal-header">
              <div>
                <span className="vt-eyebrow">DETALLE DE LA VENTA</span>
                <h2>Venta #{ventaViendo.id} · {formatearFecha(ventaViendo.fecha_venta)}</h2>
              </div>
              <button type="button" className="vt-modal-cerrar" onClick={() => setVentaViendo(null)} aria-label="Cerrar detalle">
                <X size={18} />
              </button>
            </header>

            <dl className="vt-detalle">
              <div><dt>Productor</dt><dd>{ventaViendo.nombre_productor}</dd></div>
              <div>
                <dt>Estado</dt>
                <dd>{ventaViendo.estado === "ANULADA" ? "Anulada" : "Registrada"}</dd>
              </div>
              <div><dt>Comprador</dt><dd>{ventaViendo.comprador_nombre || "No registrado"}</dd></div>
              <div><dt>Documento</dt><dd>{ventaViendo.comprador_documento || "No registrado"}</dd></div>
              <div><dt>Contacto</dt><dd>{ventaViendo.comprador_contacto || "No registrado"}</dd></div>
              <div><dt>Fecha de registro</dt><dd>{formatearFechaHora(ventaViendo.fecha_creacion)}</dd></div>
              {ventaViendo.estado === "ANULADA" && (
                <div className="vt-campo-completo">
                  <dt>Anulación ({formatearFechaHora(ventaViendo.fecha_anulacion)})</dt>
                  <dd>{ventaViendo.motivo_anulacion || "Sin motivo registrado"}</dd>
                </div>
              )}
            </dl>

            <div className="vt-mini-contenedor">
              <table className="vt-mini">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {ventaViendo.detalles.map((d) => (
                    <tr key={d.id}>
                      <td>{d.nombre_producto}</td>
                      <td>{d.nombre_lote}</td>
                      <td>{formatearCantidad(d.cantidad)} {d.unidad_medida}</td>
                      <td>{formatearCOP(d.precio_unitario)}</td>
                      <td>{formatearCOP(d.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>Total</td>
                    <td>{formatearCOP(ventaViendo.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Modal: registrar / editar venta */}
      {mostrarVenta && (
        <div className="vt-modal-fondo">
          <section className="vt-modal vt-modal--ancho" role="dialog" aria-modal="true" aria-labelledby="vt-venta-titulo">
            <header className="vt-modal-header">
              <div>
                <span className="vt-eyebrow">INFORMACIÓN DE LA VENTA</span>
                <h2 id="vt-venta-titulo">
                  {ventaEditando !== null ? `Editar venta #${ventaEditando.id}` : "Nueva venta"}
                </h2>
                <p>El precio se toma de la tarifa vigente en la fecha de la venta.</p>
              </div>
              <button type="button" className="vt-modal-cerrar" onClick={cerrarVenta} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {errorForm && <div className="vt-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={guardarVenta}>
              <div className="vt-form-grid">
                <label>
                  Productor *
                  <select name="productor" value={form.productor} onChange={cambiarProductor} required>
                    <option value="">Selecciona un productor</option>
                    {opciones.productores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} — {p.numero_documento}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Fecha de venta *
                  <input name="fecha_venta" type="date" max={hoyISO()} value={form.fecha_venta} onChange={cambiarFecha} required />
                </label>

                <label>
                  Comprador
                  <input name="comprador_nombre" value={form.comprador_nombre} onChange={cambiarCampo} maxLength={150} placeholder="Nombre o empresa" />
                </label>

                <label>
                  Documento del comprador
                  <input name="comprador_documento" value={form.comprador_documento} onChange={cambiarCampo} maxLength={30} />
                </label>

                <label className="vt-campo-completo">
                  Contacto del comprador
                  <input name="comprador_contacto" value={form.comprador_contacto} onChange={cambiarCampo} maxLength={100} placeholder="Teléfono o correo" />
                </label>
              </div>

              <div className="vt-lineas">
                <div className="vt-lineas-titulo">
                  <h3>Productos vendidos</h3>
                  {cargandoOpciones && <small>Actualizando cosechas y precios...</small>}
                </div>

                {!form.productor ? (
                  <p className="vt-ayuda">Selecciona un productor para ver sus cosechas disponibles.</p>
                ) : cosechasDelProductor.length === 0 && !cargandoOpciones ? (
                  <p className="vt-ayuda">
                    Este productor no tiene cosechas disponibles para vender.{" "}
                    <Link to="/cosechas">Registra una cosecha</Link> primero.
                  </p>
                ) : (
                  <>
                    <div className="vt-linea vt-linea--cabecera">
                      <span>Cosecha</span>
                      <span>Cantidad</span>
                      <span>Precio unit.</span>
                      <span>Subtotal</span>
                      <span />
                    </div>

                    {form.lineas.map((linea, i) => {
                      const e = estadosLineas[i];
                      const usadas = form.lineas.filter((_, j) => j !== i).map((l) => String(l.cosecha));
                      const elegibles = cosechasDelProductor.filter((c) => !usadas.includes(String(c.id)));

                      return (
                        <div key={i} className="vt-linea-bloque">
                          <div className="vt-linea">
                            <select
                              value={linea.cosecha}
                              onChange={(ev) => cambiarLinea(i, "cosecha", ev.target.value)}
                              aria-label="Cosecha"
                              required
                            >
                              <option value="">Selecciona una cosecha</option>
                              {elegibles.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre_producto} · {c.nombre_lote} · {formatearFecha(c.fecha_cosecha)} · disp.{" "}
                                  {formatearCantidad(c.cantidad_disponible)} {c.unidad_medida_display}
                                </option>
                              ))}
                            </select>

                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={linea.cantidad}
                              onChange={(ev) => cambiarLinea(i, "cantidad", ev.target.value)}
                              aria-label="Cantidad"
                              placeholder="0"
                              required
                            />

                            <div className="vt-celda">{e.opcion && e.precio !== null ? formatearCOP(e.precio) : "—"}</div>
                            <div className="vt-celda vt-celda--fuerte">{e.opcion && e.precio !== null ? formatearCOP(e.subtotal) : "—"}</div>

                            <button
                              type="button"
                              className="vt-accion desactivar"
                              onClick={() => quitarLinea(i)}
                              disabled={form.lineas.length === 1}
                              title="Quitar producto"
                              aria-label="Quitar producto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {e.opcion && (
                            <small className={`vt-linea-nota ${e.excede || e.sinTarifa ? "vt-linea-nota--error" : ""}`}>
                              {e.sinTarifa
                                ? `No hay una tarifa vigente de ${e.opcion.nombre_producto} por ${e.opcion.unidad_medida_display.toLowerCase()} en esta fecha. Registra una tarifa primero.`
                                : e.excede
                                  ? `Solo hay ${formatearCantidad(e.disponible)} ${e.opcion.unidad_medida_display.toLowerCase()} disponibles.`
                                  : `Disponible: ${formatearCantidad(e.disponible)} ${e.opcion.unidad_medida_display.toLowerCase()}`}
                            </small>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      className="vt-enlace"
                      onClick={agregarLinea}
                      disabled={form.lineas.length >= cosechasDelProductor.length}
                    >
                      + Agregar otro producto
                    </button>
                  </>
                )}

                <div className="vt-total-venta">
                  <span>Total de la venta</span>
                  <strong>{formatearCOP(totalVenta)}</strong>
                </div>
              </div>

              <footer className="vt-modal-footer">
                <button type="button" className="vt-btn-secundario" onClick={cerrarVenta} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="vt-btn-primary" disabled={guardando || !ventaValida}>
                  {guardando ? "Guardando..." : ventaEditando !== null ? "Guardar cambios" : "Registrar venta"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Modal: anular venta */}
      {ventaAnulando && (
        <div className="vt-modal-fondo">
          <section className="vt-modal vt-modal--chico" role="dialog" aria-modal="true" aria-labelledby="vt-anular-titulo">
            <header className="vt-modal-header">
              <div>
                <span className="vt-eyebrow">ANULAR VENTA</span>
                <h2 id="vt-anular-titulo">Venta #{ventaAnulando.id}</h2>
                <p>
                  {ventaAnulando.nombre_productor} · {formatearCOP(ventaAnulando.total)}
                </p>
              </div>
              <button type="button" className="vt-modal-cerrar" onClick={() => setVentaAnulando(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <p className="vt-ayuda">
              La venta queda en el historial como anulada y deja de sumar a los ingresos. Las cantidades vuelven a estar
              disponibles para vender. Esta acción no se puede deshacer.
            </p>

            {errorForm && <div className="vt-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={anularVenta}>
              <div className="vt-form-grid vt-form-grid--una">
                <label>
                  Motivo de la anulación *
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                    placeholder="Ej. El comprador canceló el pedido"
                    required
                  />
                </label>
              </div>

              <footer className="vt-modal-footer">
                <button type="button" className="vt-btn-secundario" onClick={() => setVentaAnulando(null)} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="vt-btn-peligro" disabled={guardando || !motivo.trim()}>
                  {guardando ? "Anulando..." : "Anular venta"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Modal: nueva tarifa */}
      {mostrarTarifa && (
        <div className="vt-modal-fondo">
          <section className="vt-modal vt-modal--chico" role="dialog" aria-modal="true" aria-labelledby="vt-tarifa-titulo">
            <header className="vt-modal-header">
              <div>
                <span className="vt-eyebrow">TARIFAS</span>
                <h2 id="vt-tarifa-titulo">Nueva tarifa</h2>
                <p>Las tarifas no se editan: para cambiar un precio, registra una nueva con su fecha de vigencia.</p>
              </div>
              <button type="button" className="vt-modal-cerrar" onClick={cerrarTarifa} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {errorForm && <div className="vt-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={guardarTarifa}>
              <div className="vt-form-grid">
                <label className="vt-campo-completo">
                  Tipo de cultivo *
                  <select name="tipo_cultivo" value={formTarifa.tipo_cultivo} onChange={cambiarTarifa} required>
                    <option value="">Selecciona un cultivo</option>
                    {tiposActivos.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Unidad de medida *
                  <select name="unidad_medida" value={formTarifa.unidad_medida} onChange={cambiarTarifa} required>
                    {UNIDADES.map(([valor, nombre]) => (
                      <option key={valor} value={valor}>{nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Precio unitario (COP) *
                  <input name="precio_unitario" type="number" min="0.01" step="0.01" value={formTarifa.precio_unitario} onChange={cambiarTarifa} required />
                </label>

                <label className="vt-campo-completo">
                  Vigente desde *
                  <input name="vigente_desde" type="date" value={formTarifa.vigente_desde} onChange={cambiarTarifa} required />
                </label>
              </div>

              <footer className="vt-modal-footer">
                <button type="button" className="vt-btn-secundario" onClick={cerrarTarifa} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="vt-btn-primary" disabled={guardando}>
                  {guardando ? "Guardando..." : "Registrar tarifa"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Ventas;