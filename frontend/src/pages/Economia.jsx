import { useEffect, useState } from "react";
import {
  CircleDollarSign,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { getApiErrorMessage } from "../services/api";
import {
  eliminarCostoProduccion,
  eliminarPerdidaAgricola,
  guardarCostoProduccion,
  guardarPerdidaAgricola,
  listarCostosProduccion,
  listarPerdidasAgricolas,
} from "../services/economiaService";
import { listarLotes } from "../services/cultivosService";
import "../styles/Economia.css";

const categoriasCosto = [
  ["SEMILLAS", "Semillas"],
  ["FERTILIZANTES", "Fertilizantes"],
  ["PLAGUICIDAS", "Plaguicidas"],
  ["MANO_OBRA", "Mano de obra"],
  ["TRANSPORTE", "Transporte"],
  ["RIEGO", "Riego"],
  ["HERRAMIENTAS", "Herramientas"],
  ["OTRO", "Otro"],
];

const motivosPerdida = [
  ["PLAGAS", "Plagas"],
  ["ENFERMEDAD", "Enfermedad"],
  ["CLIMA", "Condiciones climáticas"],
  ["SEQUIA", "Sequía"],
  ["INUNDACION", "Inundación"],
  ["DANIO_MANUAL", "Daño durante labores"],
  ["OTRO", "Otro"],
];

const fechaLocal = () => {
  const hoy = new Date();
  hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
  return hoy.toISOString().slice(0, 10);
};

const formularioVacio = (tipo) =>
  tipo === "costos"
    ? {
        lote: "",
        categoria: "",
        descripcion: "",
        monto: "",
        fecha_gasto: fechaLocal(),
        observaciones: "",
      }
    : {
        lote: "",
        motivo: "",
        descripcion: "",
        cantidad_perdida: "",
        unidad_medida: "KG",
        fecha_perdida: fechaLocal(),
        costo_estimado: "",
        observaciones: "",
      };

const formatoMoneda = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);

function formatearFecha(fecha) {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

function Economia() {
  const [lotes, setLotes] = useState([]);
  const [costos, setCostos] = useState([]);
  const [perdidas, setPerdidas] = useState([]);
  const [tipoRegistro, setTipoRegistro] = useState("costos");
  const [filtros, setFiltros] = useState({
    lote: "",
    desde: "",
    hasta: "",
    categoria: "",
    motivo: "",
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState({});
  const [modalAbierto, setModalAbierto] = useState(false);
  const [registroEditando, setRegistroEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio("costos"));
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarDatos(aplicados = filtrosAplicados) {
    setCargando(true);
    setError("");

    try {
      const filtrosCostos = {
        lote: aplicados.lote,
        desde: aplicados.desde,
        hasta: aplicados.hasta,
        categoria: aplicados.categoria,
      };
      const filtrosPerdidas = {
        lote: aplicados.lote,
        desde: aplicados.desde,
        hasta: aplicados.hasta,
        motivo: aplicados.motivo,
      };
      const [listaCostos, listaPerdidas] = await Promise.all([
        listarCostosProduccion(filtrosCostos),
        listarPerdidasAgricolas(filtrosPerdidas),
      ]);
      setCostos(listaCostos);
      setPerdidas(listaPerdidas);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "No fue posible cargar la información económica."),
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vigente = true;

    Promise.all([
      listarLotes(),
      listarCostosProduccion(),
      listarPerdidasAgricolas(),
    ])
      .then(([listaLotes, listaCostos, listaPerdidas]) => {
        if (!vigente) return;
        setLotes(listaLotes);
        setCostos(listaCostos);
        setPerdidas(listaPerdidas);
      })
      .catch((err) => {
        if (vigente) {
          setError(
            getApiErrorMessage(
              err,
              "No fue posible cargar la información económica.",
            ),
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

  function abrirNuevoRegistro() {
    setRegistroEditando(null);
    setFormulario(formularioVacio(tipoRegistro));
    setError("");
    setMensaje("");
    setModalAbierto(true);
  }

  function abrirEdicion(registro) {
    setRegistroEditando(registro.id);
    setFormulario(
      tipoRegistro === "costos"
        ? {
            lote: String(registro.lote),
            categoria: registro.categoria,
            descripcion: registro.descripcion || "",
            monto: registro.monto,
            fecha_gasto: registro.fecha_gasto,
            observaciones: registro.observaciones || "",
          }
        : {
            lote: String(registro.lote),
            motivo: registro.motivo,
            descripcion: registro.descripcion || "",
            cantidad_perdida: registro.cantidad_perdida,
            unidad_medida: registro.unidad_medida || "KG",
            fecha_perdida: registro.fecha_perdida,
            costo_estimado: registro.costo_estimado ?? "",
            observaciones: registro.observaciones || "",
          },
    );
    setError("");
    setMensaje("");
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setRegistroEditando(null);
  }

  function cambiarFiltro(evento) {
    const { name, value } = evento.target;
    setFiltros((actuales) => ({ ...actuales, [name]: value }));
  }

  async function aplicarFiltros(evento) {
    evento.preventDefault();
    const aplicados = { ...filtros };
    setFiltrosAplicados(aplicados);
    await cargarDatos(aplicados);
  }

  async function limpiarFiltros() {
    const vacios = {
      lote: "",
      desde: "",
      hasta: "",
      categoria: "",
      motivo: "",
    };
    setFiltros(vacios);
    setFiltrosAplicados({});
    await cargarDatos({});
  }

  async function guardarRegistro(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    const datos = {
      ...formulario,
      lote: Number(formulario.lote),
    };
    if (tipoRegistro === "perdidas" && !datos.costo_estimado) {
      delete datos.costo_estimado;
    }

    try {
      if (tipoRegistro === "costos") {
        await guardarCostoProduccion(datos, registroEditando);
      } else {
        await guardarPerdidaAgricola(datos, registroEditando);
      }
      setMensaje(
        registroEditando
          ? "El registro se actualizó correctamente."
          : "El registro se guardó correctamente.",
      );
      cerrarModal();
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err, "No fue posible guardar el registro."));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarRegistro(registro) {
    const descripcion =
      tipoRegistro === "costos"
        ? `el costo "${registro.descripcion}"`
        : `la pérdida "${registro.descripcion}"`;
    if (!window.confirm(`¿Deseas eliminar ${descripcion}?`)) return;

    setError("");
    setMensaje("");
    try {
      if (tipoRegistro === "costos") {
        await eliminarCostoProduccion(registro.id);
      } else {
        await eliminarPerdidaAgricola(registro.id);
      }
      setMensaje("El registro se eliminó correctamente.");
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err, "No fue posible eliminar el registro."));
    }
  }

  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  const totalCostos = costos.reduce(
    (total, costo) => total + Number(costo.monto || 0),
    0,
  );
  const totalPerdidas = perdidas.reduce(
    (total, perdida) => total + Number(perdida.costo_estimado || 0),
    0,
  );
  const totalCantidadPerdida = perdidas.reduce(
    (total, perdida) => total + Number(perdida.cantidad_perdida || 0),
    0,
  );

  return (
    <main className="eco-page">
      <header className="eco-header">
        <div>
          <span className="eco-eyebrow">GESTIÓN AGRÍCOLA INTELIGENTE</span>
          <h1>Economía</h1>
          <p>Controla los costos de producción y las pérdidas agrícolas.</p>
        </div>
        <button
          className="eco-btn-principal"
          onClick={abrirNuevoRegistro}
          disabled={lotes.length === 0}
        >
          <Plus size={18} />
          Nuevo {tipoRegistro === "costos" ? "costo" : "registro de pérdida"}
        </button>
      </header>

      {mensaje && (
        <div className="eco-alerta eco-exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            <X size={17} />
          </button>
        </div>
      )}
      {error && (
        <div className="eco-alerta eco-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error">
            <X size={17} />
          </button>
        </div>
      )}

      <section className="eco-resumen">
        <article className="eco-resumen-card">
          <span className="eco-resumen-icon verde">
            <CircleDollarSign size={23} />
          </span>
          <div>
            <small>Costos registrados</small>
            <strong>{formatoMoneda(totalCostos)}</strong>
          </div>
        </article>
        <article className="eco-resumen-card">
          <span className="eco-resumen-icon azul">
            <ClipboardList size={22} />
          </span>
          <div>
            <small>Registros de costos</small>
            <strong>{costos.length}</strong>
          </div>
        </article>
        <article className="eco-resumen-card">
          <span className="eco-resumen-icon naranja">
            <TrendingDown size={22} />
          </span>
          <div>
            <small>
              Pérdidas estimadas ({totalCantidadPerdida.toLocaleString("es-CO")}{" "}
              unidades)
            </small>
            <strong>{formatoMoneda(totalPerdidas)}</strong>
          </div>
        </article>
      </section>

      <section className="eco-panel eco-filtros-panel">
        <div className="eco-panel-heading">
          <div>
            <h2>Filtros</h2>
            <p>Consulta los registros por lote, fecha y tipo.</p>
          </div>
        </div>
        <form className="eco-filtros" onSubmit={aplicarFiltros}>
          <label>
            Lote
            <select name="lote" value={filtros.lote} onChange={cambiarFiltro}>
              <option value="">Todos los lotes</option>
              {lotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {lote.nombre} · {lote.nombre_finca}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              name="desde"
              value={filtros.desde}
              onChange={cambiarFiltro}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              name="hasta"
              value={filtros.hasta}
              onChange={cambiarFiltro}
            />
          </label>
          <label>
            Categoría de costo
            <select
              name="categoria"
              value={filtros.categoria}
              onChange={cambiarFiltro}
            >
              <option value="">Todas</option>
              {categoriasCosto.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label>
            Motivo de pérdida
            <select
              name="motivo"
              value={filtros.motivo}
              onChange={cambiarFiltro}
            >
              <option value="">Todos</option>
              {motivosPerdida.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </label>
          <div className="eco-filtros-acciones">
            <button
              className="eco-btn-secundario"
              type="submit"
              disabled={cargando}
            >
              Aplicar
            </button>
            <button
              className="eco-btn-limpiar"
              type="button"
              onClick={limpiarFiltros}
              disabled={cargando}
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <section className="eco-panel eco-registros-panel">
        <div className="eco-panel-heading eco-registros-heading">
          <div>
            <h2>Registros económicos</h2>
            <p>Administra los costos y las pérdidas de tus lotes.</p>
          </div>
          <div className="eco-tabs" role="tablist" aria-label="Tipo de registro">
            <button
              type="button"
              role="tab"
              aria-selected={tipoRegistro === "costos"}
              className={tipoRegistro === "costos" ? "activo" : ""}
              onClick={() => setTipoRegistro("costos")}
            >
              Costos ({costos.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tipoRegistro === "perdidas"}
              className={tipoRegistro === "perdidas" ? "activo" : ""}
              onClick={() => setTipoRegistro("perdidas")}
            >
              Pérdidas ({perdidas.length})
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="eco-vacio">Cargando registros económicos...</div>
        ) : tipoRegistro === "costos" ? (
          costos.length === 0 ? (
            <div className="eco-vacio">
              <CircleDollarSign size={30} />
              <h3>No hay costos para mostrar</h3>
              <p>Registra un costo o ajusta los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="eco-tabla-contenedor">
              <table className="eco-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Lote</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {costos.map((costo) => (
                    <tr key={costo.id}>
                      <td>{formatearFecha(costo.fecha_gasto)}</td>
                      <td>{costo.nombre_lote}</td>
                      <td>{costo.categoria_display}</td>
                      <td>
                        <strong>{costo.descripcion}</strong>
                        {costo.observaciones && (
                          <small className="eco-detalle">
                            {costo.observaciones}
                          </small>
                        )}
                      </td>
                      <td className="eco-monto">{formatoMoneda(costo.monto)}</td>
                      <td>
                        <div className="eco-acciones">
                          <button
                            type="button"
                            aria-label="Editar costo"
                            title="Editar"
                            onClick={() => abrirEdicion(costo)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="eco-eliminar"
                            aria-label="Eliminar costo"
                            title="Eliminar"
                            onClick={() => eliminarRegistro(costo)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : perdidas.length === 0 ? (
          <div className="eco-vacio">
            <TrendingDown size={30} />
            <h3>No hay pérdidas para mostrar</h3>
            <p>Registra una pérdida o ajusta los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="eco-tabla-contenedor">
            <table className="eco-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Lote</th>
                  <th>Motivo</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Costo estimado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {perdidas.map((perdida) => (
                  <tr key={perdida.id}>
                    <td>{formatearFecha(perdida.fecha_perdida)}</td>
                    <td>{perdida.nombre_lote}</td>
                    <td>{perdida.motivo_display}</td>
                    <td>
                      <strong>{perdida.descripcion}</strong>
                      {perdida.observaciones && (
                        <small className="eco-detalle">
                          {perdida.observaciones}
                        </small>
                      )}
                    </td>
                    <td>
                      {Number(perdida.cantidad_perdida).toLocaleString("es-CO")}{" "}
                      {perdida.unidad_medida}
                    </td>
                    <td className="eco-monto">
                      {perdida.costo_estimado == null
                        ? "—"
                        : formatoMoneda(perdida.costo_estimado)}
                    </td>
                    <td>
                      <div className="eco-acciones">
                        <button
                          type="button"
                          aria-label="Editar pérdida"
                          title="Editar"
                          onClick={() => abrirEdicion(perdida)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="eco-eliminar"
                          aria-label="Eliminar pérdida"
                          title="Eliminar"
                          onClick={() => eliminarRegistro(perdida)}
                        >
                          <Trash2 size={16} />
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

      {modalAbierto && (
        <div
          className="eco-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) cerrarModal();
          }}
        >
          <section
            className="eco-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eco-modal-titulo"
          >
            <header className="eco-modal-header">
              <div>
                <h2 id="eco-modal-titulo">
                  {registroEditando ? "Editar" : "Registrar"}{" "}
                  {tipoRegistro === "costos" ? "costo" : "pérdida"}
                </h2>
                <p>Completa la información del lote y del registro.</p>
              </div>
              <button
                type="button"
                className="eco-cerrar-modal"
                onClick={cerrarModal}
                aria-label="Cerrar formulario"
              >
                <X size={20} />
              </button>
            </header>

            <form className="eco-formulario" onSubmit={guardarRegistro}>
              <label>
                Lote
                <select
                  name="lote"
                  value={formulario.lote}
                  onChange={cambiarCampo}
                  required
                >
                  <option value="">Selecciona un lote</option>
                  {lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.nombre} · {lote.nombre_finca}
                      {!lote.activo ? " (inactivo)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              {tipoRegistro === "costos" ? (
                <>
                  <label>
                    Categoría
                    <select
                      name="categoria"
                      value={formulario.categoria}
                      onChange={cambiarCampo}
                      required
                    >
                      <option value="">Selecciona una categoría</option>
                      {categoriasCosto.map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>
                          {etiqueta}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Descripción
                    <input
                      name="descripcion"
                      value={formulario.descripcion}
                      onChange={cambiarCampo}
                      maxLength={200}
                      required
                    />
                  </label>
                  <label>
                    Monto (COP)
                    <input
                      type="number"
                      name="monto"
                      value={formulario.monto}
                      onChange={cambiarCampo}
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </label>
                  <label>
                    Fecha del gasto
                    <input
                      type="date"
                      name="fecha_gasto"
                      value={formulario.fecha_gasto}
                      onChange={cambiarCampo}
                      required
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Motivo
                    <select
                      name="motivo"
                      value={formulario.motivo}
                      onChange={cambiarCampo}
                      required
                    >
                      <option value="">Selecciona un motivo</option>
                      {motivosPerdida.map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>
                          {etiqueta}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
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
                    Cantidad perdida
                    <input
                      type="number"
                      name="cantidad_perdida"
                      value={formulario.cantidad_perdida}
                      onChange={cambiarCampo}
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </label>
                  <label>
                    Unidad de medida
                    <input
                      name="unidad_medida"
                      value={formulario.unidad_medida}
                      onChange={cambiarCampo}
                      maxLength={20}
                      required
                    />
                  </label>
                  <label>
                    Costo estimado (COP)
                    <input
                      type="number"
                      name="costo_estimado"
                      value={formulario.costo_estimado}
                      onChange={cambiarCampo}
                      min="0"
                      step="0.01"
                    />
                  </label>
                  <label>
                    Fecha de la pérdida
                    <input
                      type="date"
                      name="fecha_perdida"
                      value={formulario.fecha_perdida}
                      onChange={cambiarCampo}
                      required
                    />
                  </label>
                </>
              )}

              <label className="eco-campo-completo">
                Observaciones
                <textarea
                  name="observaciones"
                  value={formulario.observaciones}
                  onChange={cambiarCampo}
                  rows="3"
                />
              </label>
              <footer className="eco-modal-footer">
                <button
                  type="button"
                  className="eco-btn-limpiar"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="eco-btn-principal"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Guardar registro"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Economia;
