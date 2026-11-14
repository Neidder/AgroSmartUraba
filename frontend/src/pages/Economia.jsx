import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  Banknote,
  Receipt,
  TrendingDown,
  Scale,
  CalendarDays,
  Plus,
  Search,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import "../styles/Economia.css";

const API_BASE = "http://127.0.0.1:8000";
const API_COSTOS = `${API_BASE}/api_economia/costos-produccion/`;
const API_PERDIDAS = `${API_BASE}/api_economia/perdidas-agricolas/`;
const API_LOTES = `${API_BASE}/api_cultivos/lotes/`;
const API_VENTAS = `${API_BASE}/api_ventas/ventas/`;
const POR_PAGINA = 10;

const CATEGORIAS = [
  ["SEMILLAS", "Semillas"],
  ["FERTILIZANTES", "Fertilizantes"],
  ["PLAGUICIDAS", "Plaguicidas"],
  ["MANO_OBRA", "Mano de obra"],
  ["TRANSPORTE", "Transporte"],
  ["RIEGO", "Riego"],
  ["HERRAMIENTAS", "Herramientas"],
  ["OTRO", "Otro"],
];

const MOTIVOS = [
  ["PLAGAS", "Plagas"],
  ["ENFERMEDAD", "Enfermedad"],
  ["CLIMA", "Condiciones climáticas"],
  ["SEQUIA", "Sequía"],
  ["INUNDACION", "Inundación"],
  ["DANIO_MANUAL", "Daño durante labores"],
  ["OTRO", "Otro"],
];

const UNIDADES = [
  ["KG", "Kilogramos"],
  ["TON", "Toneladas"],
  ["UND", "Unidades"],
  ["CAJAS", "Cajas"],
];

const NOMBRE_CATEGORIA = Object.fromEntries(CATEGORIAS);
const NOMBRE_MOTIVO = Object.fromEntries(MOTIVOS);
const NOMBRE_UNIDAD = Object.fromEntries(UNIDADES);

const ETIQUETAS = {
  lote: "Lote",
  categoria: "Categoría",
  descripcion: "Descripción",
  monto: "Monto",
  fecha_gasto: "Fecha del gasto",
  motivo: "Motivo",
  cantidad_perdida: "Cantidad perdida",
  unidad_medida: "Unidad",
  fecha_perdida: "Fecha de la pérdida",
  costo_estimado: "Costo estimado",
  observaciones: "Observaciones",
};

function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function costoInicial() {
  return { lote: "", categoria: "", descripcion: "", monto: "", fecha_gasto: hoyISO(), observaciones: "" };
}

function perdidaInicial() {
  return {
    lote: "",
    motivo: "",
    descripcion: "",
    cantidad_perdida: "",
    unidad_medida: "KG",
    fecha_perdida: hoyISO(),
    costo_estimado: "",
    observaciones: "",
  };
}

function listaDe(datos) {
  return Array.isArray(datos) ? datos : datos?.results || [];
}

// Convierte cualquier forma de error del backend (texto, lista, objetos anidados) en frases.
function aplanar(valor) {
  if (valor === null || valor === undefined) return [];
  if (typeof valor === "string") return [valor];
  if (Array.isArray(valor)) return valor.flatMap(aplanar);
  if (typeof valor === "object") return Object.values(valor).flatMap(aplanar);
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

function numerosDePagina(actual, total) {
  const max = 5;
  let fin = Math.min(total, Math.max(1, actual - 2) + max - 1);
  const inicio = Math.max(1, fin - max + 1);
  fin = Math.min(total, fin);
  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

function BarrasMonto({ datos }) {
  const maximo = Math.max(0, ...datos.map(([, valor]) => valor));
  return (
    <ul className="ec-barras">
      {datos.map(([nombre, valor]) => (
        <li key={nombre}>
          <div className="ec-barra-texto">
            <span>{nombre}</span>
            <strong>{formatearCOP(valor)}</strong>
          </div>
          <div className="ec-barra">
            <div style={{ width: `${maximo ? (valor / maximo) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Economia() {
  const [costos, setCostos] = useState([]);
  const [perdidas, setPerdidas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [ventas, setVentas] = useState([]);

  const [pestana, setPestana] = useState("costos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroFinca, setFiltroFinca] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const [formCosto, setFormCosto] = useState(costoInicial);
  const [costoEditando, setCostoEditando] = useState(null);
  const [mostrarCosto, setMostrarCosto] = useState(false);

  const [formPerdida, setFormPerdida] = useState(perdidaInicial);
  const [perdidaEditando, setPerdidaEditando] = useState(null);
  const [mostrarPerdida, setMostrarPerdida] = useState(false);

  const [detalle, setDetalle] = useState(null);

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

  async function cargarCostos() {
    try {
      setCostos(await pedirLista(API_COSTOS, "No fue posible cargar los costos."));
    } catch (err) {
      setError(`${err.message} Verifica que Django esté funcionando y que la URL de la API sea correcta.`);
    }
  }

  async function cargarPerdidas() {
    try {
      setPerdidas(await pedirLista(API_PERDIDAS, "No fue posible cargar las pérdidas."));
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarLotes() {
    try {
      setLotes(await pedirLista(API_LOTES, "No fue posible cargar los lotes."));
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarVentas() {
    try {
      setVentas(await pedirLista(API_VENTAS, "No fue posible cargar las ventas."));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    Promise.all([cargarCostos(), cargarPerdidas(), cargarLotes(), cargarVentas()]).finally(() => setCargando(false));
  }, []);

  async function enviar(url, metodo, cuerpo) {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(cuerpo),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(textoError(datos, "No fue posible guardar el registro."));
    return datos;
  }

  // ---------- Costos ----------
  function cambiarCosto(evento) {
    const { name, value } = evento.target;
    setFormCosto((actual) => ({ ...actual, [name]: value }));
  }

  function nuevoCosto() {
    setCostoEditando(null);
    setFormCosto(costoInicial());
    setErrorForm("");
    setMensaje("");
    setMostrarCosto(true);
  }

  function editarCosto(costo) {
    setCostoEditando(costo.id);
    setFormCosto({
      lote: String(costo.lote ?? ""),
      categoria: costo.categoria || "",
      descripcion: costo.descripcion || "",
      monto: costo.monto ?? "",
      fecha_gasto: costo.fecha_gasto || "",
      observaciones: costo.observaciones || "",
    });
    setErrorForm("");
    setMensaje("");
    setMostrarCosto(true);
  }

  function cerrarCosto() {
    setMostrarCosto(false);
    setCostoEditando(null);
    setErrorForm("");
  }

  async function guardarCosto(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm("");

    const editando = costoEditando !== null;

    try {
      await enviar(editando ? `${API_COSTOS}${costoEditando}/` : API_COSTOS, editando ? "PUT" : "POST", {
        ...formCosto,
        lote: Number(formCosto.lote),
        descripcion: formCosto.descripcion.trim(),
      });
      cerrarCosto();
      setMensaje(editando ? "Costo actualizado correctamente." : "Costo registrado correctamente.");
      await cargarCostos();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // ---------- Pérdidas ----------
  function cambiarPerdida(evento) {
    const { name, value } = evento.target;
    setFormPerdida((actual) => ({ ...actual, [name]: value }));
  }

  function nuevaPerdida() {
    setPerdidaEditando(null);
    setFormPerdida(perdidaInicial());
    setErrorForm("");
    setMensaje("");
    setMostrarPerdida(true);
  }

  function editarPerdida(perdida) {
    setPerdidaEditando(perdida.id);
    setFormPerdida({
      lote: String(perdida.lote ?? ""),
      motivo: perdida.motivo || "",
      descripcion: perdida.descripcion || "",
      cantidad_perdida: perdida.cantidad_perdida ?? "",
      unidad_medida: perdida.unidad_medida || "KG",
      fecha_perdida: perdida.fecha_perdida || "",
      costo_estimado: perdida.costo_estimado ?? "",
      observaciones: perdida.observaciones || "",
    });
    setErrorForm("");
    setMensaje("");
    setMostrarPerdida(true);
  }

  function cerrarPerdida() {
    setMostrarPerdida(false);
    setPerdidaEditando(null);
    setErrorForm("");
  }

  async function guardarPerdida(evento) {
    evento.preventDefault();
    setGuardando(true);
    setErrorForm("");

    const editando = perdidaEditando !== null;

    try {
      await enviar(editando ? `${API_PERDIDAS}${perdidaEditando}/` : API_PERDIDAS, editando ? "PUT" : "POST", {
        ...formPerdida,
        lote: Number(formPerdida.lote),
        descripcion: formPerdida.descripcion.trim(),
        costo_estimado: formPerdida.costo_estimado === "" ? null : formPerdida.costo_estimado,
      });
      cerrarPerdida();
      setMensaje(editando ? "Pérdida actualizada correctamente." : "Pérdida registrada correctamente.");
      await cargarPerdidas();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // ---------- Datos enriquecidos: finca y cultivo salen de la lista de lotes ----------
  const lotesPorId = Object.fromEntries(lotes.map((l) => [l.id, l]));
  const conLote = (registro) => {
    const lote = lotesPorId[registro.lote];
    return { ...registro, finca: lote?.nombre_finca || "—", cultivo: lote?.nombre_tipo_cultivo || "—" };
  };
  const costosFilas = costos.map(conLote);
  const perdidasFilas = perdidas.map(conLote);

  // ---------- Periodo (afecta tarjetas, panel lateral y tablas) ----------
  const enPeriodo = (fecha) => (!desde || fecha >= desde) && (!hasta || fecha <= hasta);

  const hoy = hoyISO();
  const inicioMes = `${hoy.slice(0, 8)}01`;
  const inicioAnio = `${hoy.slice(0, 4)}-01-01`;
  const periodoActual =
    !desde && !hasta ? "todo" : desde === inicioMes && hasta === hoy ? "mes" : desde === inicioAnio && hasta === hoy ? "anio" : "";

  function elegirPeriodo(tipo) {
    if (tipo === "todo") {
      setDesde("");
      setHasta("");
    } else if (tipo === "mes") {
      setDesde(inicioMes);
      setHasta(hoy);
    } else {
      setDesde(inicioAnio);
      setHasta(hoy);
    }
    setPagina(1);
  }

  // ---------- Indicadores ----------
  const ventasPeriodo = ventas.filter((v) => v.estado === "REGISTRADA" && enPeriodo(v.fecha_venta));
  const costosPeriodo = costosFilas.filter((c) => enPeriodo(c.fecha_gasto));
  const perdidasPeriodo = perdidasFilas.filter((p) => enPeriodo(p.fecha_perdida));

  const ingresos = ventasPeriodo.reduce((suma, v) => suma + Number(v.total || 0), 0);
  const totalCostos = costosPeriodo.reduce((suma, c) => suma + Number(c.monto || 0), 0);
  const totalPerdidas = perdidasPeriodo.reduce((suma, p) => suma + Number(p.costo_estimado || 0), 0);
  const balance = ingresos - totalCostos;
  const margen = ingresos > 0 ? Math.round((balance * 100) / ingresos) : null;

  // Panel lateral
  const costosPorCategoria = {};
  costosPeriodo.forEach((c) => {
    const nombre = NOMBRE_CATEGORIA[c.categoria] || c.categoria_display || c.categoria;
    costosPorCategoria[nombre] = (costosPorCategoria[nombre] || 0) + Number(c.monto || 0);
  });
  const topCategorias = Object.entries(costosPorCategoria).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const perdidasPorMotivo = {};
  perdidasPeriodo.forEach((p) => {
    const valor = Number(p.costo_estimado || 0);
    if (valor <= 0) return;
    const nombre = NOMBRE_MOTIVO[p.motivo] || p.motivo_display || p.motivo;
    perdidasPorMotivo[nombre] = (perdidasPorMotivo[nombre] || 0) + valor;
  });
  const topMotivos = Object.entries(perdidasPorMotivo).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // ---------- Tabla de la pestaña activa ----------
  const esCostos = pestana === "costos";
  const filasPestana = esCostos ? costosPeriodo : perdidasPeriodo;
  const fincasOpciones = [...new Set((esCostos ? costosFilas : perdidasFilas).map((f) => f.finca))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  const filtradas = filasPestana.filter((f) => {
    const clasificacion = esCostos ? NOMBRE_CATEGORIA[f.categoria] : NOMBRE_MOTIVO[f.motivo];
    const texto = [f.descripcion, clasificacion, f.finca, f.nombre_lote, f.cultivo, f.observaciones]
      .join(" ")
      .toLowerCase();

    return (
      texto.includes(busqueda.toLowerCase()) &&
      (filtroFinca === "todas" || f.finca === filtroFinca) &&
      (filtroTipo === "todos" || (esCostos ? f.categoria : f.motivo) === filtroTipo)
    );
  });

  const hayFiltros = busqueda || filtroFinca !== "todas" || filtroTipo !== "todos";

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroFinca("todas");
    setFiltroTipo("todos");
    setPagina(1);
  }

  function conFiltro(setter) {
    return (valor) => {
      setter(valor);
      setPagina(1);
    };
  }

  function cambiarPestana(nueva) {
    setPestana(nueva);
    limpiarFiltros();
  }

  const total = filtradas.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA);

  const lotesCosto = lotes.filter((l) => l.activo || String(l.id) === String(formCosto.lote));
  const lotesPerdida = lotes.filter((l) => l.activo || String(l.id) === String(formPerdida.lote));

  const opcionLote = (l) => (
    <option key={l.id} value={l.id}>
      {l.nombre} — {l.nombre_finca} ({l.nombre_tipo_cultivo})
    </option>
  );

  return (
    <div className="ec-page">
      <header className="ec-header">
        <div className="ec-titulo">
          <Wallet size={38} strokeWidth={1.6} />
          <div>
            <h1>Economía</h1>
            <p>Controla los costos de producción, las pérdidas y el balance.</p>
          </div>
        </div>

        {esCostos ? (
          <button className="ec-btn-primary" onClick={nuevoCosto}>
            <Plus size={18} /> Nuevo costo
          </button>
        ) : (
          <button className="ec-btn-primary" onClick={nuevaPerdida}>
            <Plus size={18} /> Registrar pérdida
          </button>
        )}
      </header>

      <section className="ec-card ec-periodo">
        <div className="ec-rango">
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

        <div className="ec-presets" role="group" aria-label="Periodos rápidos">
          {[
            ["mes", "Este mes"],
            ["anio", "Este año"],
            ["todo", "Todo"],
          ].map(([clave, nombre]) => (
            <button
              key={clave}
              type="button"
              className={`ec-preset ${periodoActual === clave ? "ec-preset--activo" : ""}`}
              onClick={() => elegirPeriodo(clave)}
            >
              {nombre}
            </button>
          ))}
        </div>
      </section>

      <section className="ec-kpis">
        <article className="ec-card ec-kpi">
          <div className="ec-kpi-icon"><Banknote size={24} /></div>
          <div>
            <span>Ingresos por ventas</span>
            <strong className="ec-kpi-monto">{formatearCOP(ingresos)}</strong>
            <small>{ventasPeriodo.length} {ventasPeriodo.length === 1 ? "venta registrada" : "ventas registradas"}</small>
          </div>
        </article>

        <article className="ec-card ec-kpi">
          <div className="ec-kpi-icon"><Receipt size={24} /></div>
          <div>
            <span>Costos de producción</span>
            <strong className="ec-kpi-monto">{formatearCOP(totalCostos)}</strong>
            <small>{costosPeriodo.length} {costosPeriodo.length === 1 ? "registro" : "registros"}</small>
          </div>
        </article>

        <article className="ec-card ec-kpi">
          <div className="ec-kpi-icon"><TrendingDown size={24} /></div>
          <div>
            <span>Pérdidas estimadas</span>
            <strong className="ec-kpi-monto">{formatearCOP(totalPerdidas)}</strong>
            <small>{perdidasPeriodo.length} {perdidasPeriodo.length === 1 ? "pérdida" : "pérdidas"} · valor estimado</small>
          </div>
        </article>

        <article className="ec-card ec-kpi">
          <div className="ec-kpi-icon"><Scale size={24} /></div>
          <div>
            <span>Balance</span>
            <strong className={`ec-kpi-monto ${balance >= 0 ? "ec-balance--pos" : "ec-balance--neg"}`}>
              {formatearCOP(balance)}
            </strong>
            <small>
              ingresos − costos{margen !== null ? ` · margen ${margen}%` : ""}
            </small>
          </div>
        </article>
      </section>

      {mensaje && (
        <div className="ec-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="ec-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error"><X size={16} /></button>
        </div>
      )}

      <div className="ec-grid">
        <section className="ec-card ec-panel">
          <nav className="ec-tabs" aria-label="Costos y pérdidas">
            <button type="button" className={`ec-tab ${esCostos ? "ec-tab--activa" : ""}`} onClick={() => cambiarPestana("costos")}>
              <Receipt size={17} /> Costos
            </button>
            <button type="button" className={`ec-tab ${!esCostos ? "ec-tab--activa" : ""}`} onClick={() => cambiarPestana("perdidas")}>
              <TrendingDown size={17} /> Pérdidas
            </button>
          </nav>

          <div className="ec-filtros">
            <label className="ec-busqueda">
              <Search size={18} />
              <input
                type="search"
                placeholder={esCostos ? "Buscar por descripción, finca o lote..." : "Buscar por descripción, finca o lote..."}
                value={busqueda}
                onChange={(e) => conFiltro(setBusqueda)(e.target.value)}
              />
            </label>

            <select value={filtroFinca} onChange={(e) => conFiltro(setFiltroFinca)(e.target.value)} aria-label="Filtrar por finca">
              <option value="todas">Todas las fincas</option>
              {fincasOpciones.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => conFiltro(setFiltroTipo)(e.target.value)}
              aria-label={esCostos ? "Filtrar por categoría" : "Filtrar por motivo"}
            >
              <option value="todos">{esCostos ? "Todas las categorías" : "Todos los motivos"}</option>
              {(esCostos ? CATEGORIAS : MOTIVOS).map(([valor, nombre]) => (
                <option key={valor} value={valor}>{nombre}</option>
              ))}
            </select>

            {hayFiltros && (
              <button type="button" className="ec-btn-secundario" onClick={limpiarFiltros}>
                Limpiar
              </button>
            )}
          </div>

          {cargando ? (
            <div className="ec-vacio">Cargando información...</div>
          ) : total === 0 ? (
            <div className="ec-vacio">
              {esCostos ? <Receipt size={38} strokeWidth={1.4} /> : <TrendingDown size={38} strokeWidth={1.4} />}
              <h3>{esCostos ? "No hay costos para mostrar" : "No hay pérdidas para mostrar"}</h3>
              <p>Registra uno nuevo o cambia el periodo y los filtros de búsqueda.</p>
              <button className="ec-btn-primary" onClick={esCostos ? nuevoCosto : nuevaPerdida}>
                {esCostos ? "Registrar costo" : "Registrar pérdida"}
              </button>
            </div>
          ) : (
            <div className="ec-tabla-contenedor">
              <table className="ec-tabla">
                <thead>
                  {esCostos ? (
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Categoría</th>
                      <th>Finca</th>
                      <th>Monto</th>
                      <th>Acciones</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Fecha</th>
                      <th>Finca</th>
                      <th>Motivo</th>
                      <th>Cantidad</th>
                      <th>Costo estimado</th>
                      <th>Acciones</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {visibles.map((f) =>
                    esCostos ? (
                      <tr key={f.id}>
                        <td>{formatearFecha(f.fecha_gasto)}</td>
                        <td className="ec-descripcion" title={f.descripcion}>
                          <strong className="ec-nombre">{f.descripcion}</strong>
                        </td>
                        <td><span className="ec-chip">{NOMBRE_CATEGORIA[f.categoria] || f.categoria}</span></td>
                        <td>
                          {f.finca}
                          <small className="ec-sub">{f.nombre_lote} · {f.cultivo}</small>
                        </td>
                        <td className="ec-monto">{formatearCOP(f.monto)}</td>
                        <td>
                          <div className="ec-acciones">
                            <button className="ec-accion ver" onClick={() => setDetalle({ tipo: "costo", dato: f })} title="Ver detalle" aria-label="Ver detalle">
                              <Eye size={17} />
                            </button>
                            <button className="ec-accion editar" onClick={() => editarCosto(f)} title="Editar costo" aria-label="Editar costo">
                              <Pencil size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={f.id}>
                        <td>{formatearFecha(f.fecha_perdida)}</td>
                        <td>
                          <strong className="ec-nombre">{f.finca}</strong>
                          <small className="ec-sub">{f.nombre_lote} · {f.cultivo}</small>
                        </td>
                        <td><span className="ec-chip ec-chip--alerta">{NOMBRE_MOTIVO[f.motivo] || f.motivo}</span></td>
                        <td>{formatearCantidad(f.cantidad_perdida)} {NOMBRE_UNIDAD[f.unidad_medida] || f.unidad_medida}</td>
                        <td className="ec-monto">
                          {f.costo_estimado !== null && f.costo_estimado !== undefined ? formatearCOP(f.costo_estimado) : "—"}
                        </td>
                        <td>
                          <div className="ec-acciones">
                            <button className="ec-accion ver" onClick={() => setDetalle({ tipo: "perdida", dato: f })} title="Ver detalle" aria-label="Ver detalle">
                              <Eye size={17} />
                            </button>
                            <button className="ec-accion editar" onClick={() => editarPerdida(f)} title="Editar pérdida" aria-label="Editar pérdida">
                              <Pencil size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!cargando && total > 0 && (
            <footer className="ec-paginacion">
              <span>
                Mostrando {inicio + 1} - {inicio + visibles.length} de {total} {esCostos ? "costos" : "pérdidas"}
              </span>
              <div className="ec-paginas">
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

        <aside className="ec-side">
          <section className="ec-card">
            <h3 className="ec-side-titulo"><Receipt size={18} /> Costos por categoría</h3>
            {topCategorias.length === 0 ? (
              <p className="ec-side-vacio">Aún no hay costos en este periodo.</p>
            ) : (
              <BarrasMonto datos={topCategorias} />
            )}
          </section>

          <section className="ec-card">
            <h3 className="ec-side-titulo"><TrendingDown size={18} /> Pérdidas por motivo</h3>
            {topMotivos.length === 0 ? (
              <p className="ec-side-vacio">
                {perdidasPeriodo.length > 0
                  ? "Las pérdidas de este periodo no tienen costo estimado."
                  : "Aún no hay pérdidas en este periodo."}
              </p>
            ) : (
              <BarrasMonto datos={topMotivos} />
            )}
          </section>

          <section className="ec-card ec-nota-balance">
            <h3 className="ec-side-titulo"><Scale size={18} /> ¿Cómo se calcula?</h3>
            <p>
              El balance es <strong>ingresos por ventas − costos de producción</strong>. Las pérdidas se muestran aparte
              como valor estimado, porque ya se reflejan en lo que se dejó de cosechar y vender.
            </p>
          </section>
        </aside>
      </div>

      {/* Modal: detalle */}
      {detalle && (
        <div className="ec-modal-fondo">
          <section className="ec-modal" role="dialog" aria-modal="true">
            <header className="ec-modal-header">
              <div>
                <span className="ec-eyebrow">{detalle.tipo === "costo" ? "DETALLE DEL COSTO" : "DETALLE DE LA PÉRDIDA"}</span>
                <h2>
                  {detalle.tipo === "costo"
                    ? detalle.dato.descripcion
                    : NOMBRE_MOTIVO[detalle.dato.motivo] || detalle.dato.motivo}
                </h2>
              </div>
              <button type="button" className="ec-modal-cerrar" onClick={() => setDetalle(null)} aria-label="Cerrar detalle">
                <X size={18} />
              </button>
            </header>

            {detalle.tipo === "costo" ? (
              <dl className="ec-detalle">
                <div><dt>Fecha del gasto</dt><dd>{formatearFecha(detalle.dato.fecha_gasto)}</dd></div>
                <div><dt>Monto</dt><dd>{formatearCOP(detalle.dato.monto)}</dd></div>
                <div><dt>Categoría</dt><dd>{NOMBRE_CATEGORIA[detalle.dato.categoria] || detalle.dato.categoria}</dd></div>
                <div><dt>Finca</dt><dd>{detalle.dato.finca}</dd></div>
                <div><dt>Lote</dt><dd>{detalle.dato.nombre_lote}</dd></div>
                <div><dt>Cultivo</dt><dd>{detalle.dato.cultivo}</dd></div>
                <div className="ec-campo-completo">
                  <dt>Observaciones</dt>
                  <dd>{detalle.dato.observaciones || "Sin observaciones"}</dd>
                </div>
                <div><dt>Fecha de registro</dt><dd>{formatearFechaHora(detalle.dato.fecha_creacion)}</dd></div>
              </dl>
            ) : (
              <dl className="ec-detalle">
                <div><dt>Fecha de la pérdida</dt><dd>{formatearFecha(detalle.dato.fecha_perdida)}</dd></div>
                <div>
                  <dt>Cantidad perdida</dt>
                  <dd>
                    {formatearCantidad(detalle.dato.cantidad_perdida)}{" "}
                    {NOMBRE_UNIDAD[detalle.dato.unidad_medida] || detalle.dato.unidad_medida}
                  </dd>
                </div>
                <div>
                  <dt>Costo estimado</dt>
                  <dd>
                    {detalle.dato.costo_estimado !== null && detalle.dato.costo_estimado !== undefined
                      ? formatearCOP(detalle.dato.costo_estimado)
                      : "No estimado"}
                  </dd>
                </div>
                <div><dt>Finca</dt><dd>{detalle.dato.finca}</dd></div>
                <div><dt>Lote</dt><dd>{detalle.dato.nombre_lote}</dd></div>
                <div><dt>Cultivo</dt><dd>{detalle.dato.cultivo}</dd></div>
                <div className="ec-campo-completo">
                  <dt>Descripción</dt>
                  <dd>{detalle.dato.descripcion}</dd>
                </div>
                <div className="ec-campo-completo">
                  <dt>Observaciones</dt>
                  <dd>{detalle.dato.observaciones || "Sin observaciones"}</dd>
                </div>
                <div><dt>Fecha de registro</dt><dd>{formatearFechaHora(detalle.dato.fecha_creacion)}</dd></div>
              </dl>
            )}
          </section>
        </div>
      )}

      {/* Modal: costo */}
      {mostrarCosto && (
        <div className="ec-modal-fondo">
          <section className="ec-modal" role="dialog" aria-modal="true" aria-labelledby="ec-costo-titulo">
            <header className="ec-modal-header">
              <div>
                <span className="ec-eyebrow">COSTO DE PRODUCCIÓN</span>
                <h2 id="ec-costo-titulo">{costoEditando !== null ? "Editar costo" : "Nuevo costo"}</h2>
                <p>Registra un gasto asociado a un lote.</p>
              </div>
              <button type="button" className="ec-modal-cerrar" onClick={cerrarCosto} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {lotesCosto.length === 0 && (
              <div className="ec-alerta error">
                No hay lotes activos. <Link to="/cultivos">Registra un lote</Link> antes de crear un costo.
              </div>
            )}

            {errorForm && <div className="ec-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={guardarCosto}>
              <div className="ec-form-grid">
                <label className="ec-campo-completo">
                  Lote *
                  <select name="lote" value={formCosto.lote} onChange={cambiarCosto} required>
                    <option value="">Selecciona un lote</option>
                    {lotesCosto.map(opcionLote)}
                  </select>
                </label>

                <label>
                  Categoría *
                  <select name="categoria" value={formCosto.categoria} onChange={cambiarCosto} required>
                    <option value="">Selecciona una categoría</option>
                    {CATEGORIAS.map(([valor, nombre]) => (
                      <option key={valor} value={valor}>{nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Fecha del gasto *
                  <input name="fecha_gasto" type="date" value={formCosto.fecha_gasto} onChange={cambiarCosto} required />
                </label>

                <label className="ec-campo-completo">
                  Descripción *
                  <input name="descripcion" value={formCosto.descripcion} onChange={cambiarCosto} maxLength={200} placeholder="Ej. Compra de abono orgánico" required />
                </label>

                <label>
                  Monto (COP) *
                  <input name="monto" type="number" min="0.01" step="0.01" value={formCosto.monto} onChange={cambiarCosto} required />
                </label>

                <label>
                  Observaciones
                  <input name="observaciones" value={formCosto.observaciones} onChange={cambiarCosto} placeholder="Opcional" />
                </label>
              </div>

              <footer className="ec-modal-footer">
                <button type="button" className="ec-btn-secundario" onClick={cerrarCosto} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="ec-btn-primary" disabled={guardando || lotesCosto.length === 0}>
                  {guardando ? "Guardando..." : costoEditando !== null ? "Guardar cambios" : "Registrar costo"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Modal: pérdida */}
      {mostrarPerdida && (
        <div className="ec-modal-fondo">
          <section className="ec-modal" role="dialog" aria-modal="true" aria-labelledby="ec-perdida-titulo">
            <header className="ec-modal-header">
              <div>
                <span className="ec-eyebrow">PÉRDIDA AGRÍCOLA</span>
                <h2 id="ec-perdida-titulo">{perdidaEditando !== null ? "Editar pérdida" : "Registrar pérdida"}</h2>
                <p>Registra la producción que se perdió en un lote.</p>
              </div>
              <button type="button" className="ec-modal-cerrar" onClick={cerrarPerdida} aria-label="Cerrar formulario">
                <X size={18} />
              </button>
            </header>

            {lotesPerdida.length === 0 && (
              <div className="ec-alerta error">
                No hay lotes activos. <Link to="/cultivos">Registra un lote</Link> antes de registrar una pérdida.
              </div>
            )}

            {errorForm && <div className="ec-alerta error" role="alert">{errorForm}</div>}

            <form onSubmit={guardarPerdida}>
              <div className="ec-form-grid">
                <label className="ec-campo-completo">
                  Lote *
                  <select name="lote" value={formPerdida.lote} onChange={cambiarPerdida} required>
                    <option value="">Selecciona un lote</option>
                    {lotesPerdida.map(opcionLote)}
                  </select>
                </label>

                <label>
                  Motivo *
                  <select name="motivo" value={formPerdida.motivo} onChange={cambiarPerdida} required>
                    <option value="">Selecciona un motivo</option>
                    {MOTIVOS.map(([valor, nombre]) => (
                      <option key={valor} value={valor}>{nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Fecha de la pérdida *
                  <input name="fecha_perdida" type="date" value={formPerdida.fecha_perdida} onChange={cambiarPerdida} required />
                </label>

                <label className="ec-campo-completo">
                  Descripción *
                  <textarea
                    name="descripcion"
                    value={formPerdida.descripcion}
                    onChange={cambiarPerdida}
                    rows={3}
                    placeholder="¿Qué pasó y qué se perdió?"
                    required
                  />
                </label>

                <label>
                  Cantidad perdida *
                  <input name="cantidad_perdida" type="number" min="0.01" step="0.01" value={formPerdida.cantidad_perdida} onChange={cambiarPerdida} required />
                </label>

                <label>
                  Unidad *
                  <select name="unidad_medida" value={formPerdida.unidad_medida} onChange={cambiarPerdida} required>
                    {UNIDADES.map(([valor, nombre]) => (
                      <option key={valor} value={valor}>{nombre}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Costo estimado (COP)
                  <input name="costo_estimado" type="number" min="0" step="0.01" value={formPerdida.costo_estimado} onChange={cambiarPerdida} />
                  <span className="ec-ayuda">Opcional. Cuánto habría valido lo perdido.</span>
                </label>

                <label>
                  Observaciones
                  <input name="observaciones" value={formPerdida.observaciones} onChange={cambiarPerdida} placeholder="Opcional" />
                </label>
              </div>

              <footer className="ec-modal-footer">
                <button type="button" className="ec-btn-secundario" onClick={cerrarPerdida} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="ec-btn-primary" disabled={guardando || lotesPerdida.length === 0}>
                  {guardando ? "Guardando..." : perdidaEditando !== null ? "Guardar cambios" : "Registrar pérdida"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Economia;