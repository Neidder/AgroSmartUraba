import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import {
  actualizarCosecha,
  crearCosecha,
  listarCosechas,
  listarLotesCosecha,
} from "../services/cosechasService";
import "../styles/Cosechas.css";

const unidadesMedida = [
  { valor: "KG", etiqueta: "Kilogramos" },
  { valor: "TON", etiqueta: "Toneladas" },
  { valor: "UND", etiqueta: "Unidades" },
  { valor: "CAJAS", etiqueta: "Cajas" },
];

function fechaLocalActual() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

const formularioVacio = () => ({
  lote: "",
  fecha_cosecha: fechaLocalActual(),
  cantidad: "",
  unidad_medida: "KG",
  observaciones: "",
});

const numeroFormato = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function Cosechas() {
  const [cosechas, setCosechas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroUnidad, setFiltroUnidad] = useState("todas");
  const [filtroLote, setFiltroLote] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cosechaEditando, setCosechaEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioVacio);

  async function cargarDatos(mostrarCarga = false) {
    if (mostrarCarga) setCargando(true);
    try {
      const [listaCosechas, listaLotes] = await Promise.all([
        listarCosechas(),
        listarLotesCosecha(),
      ]);
      setCosechas(listaCosechas);
      setLotes(listaLotes);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "No fue posible cargar las cosechas."));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vigente = true;

    Promise.all([listarCosechas(), listarLotesCosecha()])
      .then(([listaCosechas, listaLotes]) => {
        if (vigente) {
          setCosechas(listaCosechas);
          setLotes(listaLotes);
        }
      })
      .catch((err) => {
        if (vigente) {
          setError(
            getApiErrorMessage(err, "No fue posible cargar las cosechas."),
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

  const cosechasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase("es");

    return cosechas.filter((cosecha) => {
      const textoCosecha = [
        cosecha.nombre_lote,
        cosecha.nombre_finca,
        cosecha.nombre_tipo_cultivo,
        cosecha.observaciones,
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      const coincideTexto = textoCosecha.includes(texto);
      const coincideUnidad =
        filtroUnidad === "todas" ||
        cosecha.unidad_medida === filtroUnidad;
      const coincideLote =
        filtroLote === "todos" || String(cosecha.lote) === filtroLote;
      const coincideDesde =
        !fechaDesde || cosecha.fecha_cosecha >= fechaDesde;
      const coincideHasta =
        !fechaHasta || cosecha.fecha_cosecha <= fechaHasta;

      return (
        coincideTexto &&
        coincideUnidad &&
        coincideLote &&
        coincideDesde &&
        coincideHasta
      );
    });
  }, [
    busqueda,
    cosechas,
    fechaDesde,
    fechaHasta,
    filtroLote,
    filtroUnidad,
  ]);

  const resumenPorUnidad = useMemo(
    () =>
      unidadesMedida.map((unidad) => {
        const registros = cosechas.filter(
          (cosecha) => cosecha.unidad_medida === unidad.valor,
        );
        const total = registros.reduce(
          (suma, cosecha) => suma + Number(cosecha.cantidad),
          0,
        );

        return { ...unidad, cantidad: numeroFormato.format(total), registros: registros.length };
      }),
    [cosechas],
  );

  const lotesDisponibles = lotes.filter(
    (lote) => lote.activo || String(lote.id) === formulario.lote,
  );

  function abrirNuevaCosecha() {
    setError("");
    setMensaje("");
    setCosechaEditando(null);
    setFormulario(formularioVacio());
    setMostrarFormulario(true);
  }

  function abrirEdicion(cosecha) {
    setError("");
    setMensaje("");
    setCosechaEditando(cosecha.id);
    setFormulario({
      lote: String(cosecha.lote),
      fecha_cosecha: cosecha.fecha_cosecha,
      cantidad: cosecha.cantidad,
      unidad_medida: cosecha.unidad_medida,
      observaciones: cosecha.observaciones || "",
    });
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setCosechaEditando(null);
    setFormulario(formularioVacio());
    setError("");
  }

  function cambiarCampo(evento) {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  async function guardarCosecha(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);

    const editando = cosechaEditando !== null;
    const datos = {
      ...formulario,
      lote: Number(formulario.lote),
      cantidad: formulario.cantidad,
      observaciones: formulario.observaciones.trim(),
    };

    try {
      if (editando) {
        await actualizarCosecha(cosechaEditando, datos);
      } else {
        await crearCosecha(datos);
      }

      cerrarFormulario();
      setMensaje(
        editando
          ? "Cosecha actualizada correctamente."
          : "Cosecha registrada correctamente.",
      );
      await cargarDatos();
    } catch (err) {
      setError(getApiErrorMessage(err, "No fue posible guardar la cosecha."));
    } finally {
      setGuardando(false);
    }
  }

  const puedeCrearCosecha = lotes.some((lote) => lote.activo);

  return (
    <main className="cosechas-page">
      <header className="cosechas-header">
        <div>
          <span className="cosechas-eyebrow">
            GESTIÓN AGRÍCOLA INTELIGENTE
          </span>
          <h1>Cosechas</h1>
          <p>Registra y consulta la producción recolectada en cada lote.</p>
        </div>
        <button
          className="cosechas-btn-principal"
          onClick={abrirNuevaCosecha}
          disabled={!puedeCrearCosecha}
          title={
            puedeCrearCosecha
              ? "Registrar una cosecha"
              : "Primero registra o activa un lote"
          }
        >
          ＋ Nueva cosecha
        </button>
      </header>

      {mensaje && (
        <div className="cosechas-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="cosechas-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}

      <section className="cosechas-resumen">
        {resumenPorUnidad.map((resumen) => (
          <article className="cosechas-resumen-card" key={resumen.valor}>
            <span className="cosechas-resumen-icon">▤</span>
            <div>
              <small>Total {resumen.etiqueta.toLocaleLowerCase("es")}</small>
              <strong>{cargando ? "…" : resumen.cantidad}</strong>
              <span>{resumen.registros} registros</span>
            </div>
          </article>
        ))}
      </section>

      <section className="cosechas-panel">
        <div className="cosechas-panel-header">
          <div>
            <h2>Registro de cosechas</h2>
            <p>
              Las cantidades se resumen por unidad para no mezclar medidas
              diferentes.
            </p>
          </div>
          <span className="cosechas-contador">
            {cosechasFiltradas.length} registros
          </span>
        </div>

        <div className="cosechas-filtros">
          <label className="cosechas-busqueda">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar por lote, finca, cultivo u observaciones..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              aria-label="Buscar cosechas"
            />
          </label>
          <select
            value={filtroUnidad}
            onChange={(evento) => setFiltroUnidad(evento.target.value)}
            aria-label="Filtrar por unidad de medida"
          >
            <option value="todas">Todas las unidades</option>
            {unidadesMedida.map((unidad) => (
              <option key={unidad.valor} value={unidad.valor}>
                {unidad.etiqueta}
              </option>
            ))}
          </select>
          <select
            value={filtroLote}
            onChange={(evento) => setFiltroLote(evento.target.value)}
            aria-label="Filtrar por lote"
          >
            <option value="todos">Todos los lotes</option>
            {lotes.map((lote) => (
              <option key={lote.id} value={lote.id}>
                {lote.nombre}
              </option>
            ))}
          </select>
          <label className="cosechas-filtro-fecha">
            <span>Desde</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(evento) => setFechaDesde(evento.target.value)}
              aria-label="Fecha inicial de cosecha"
            />
          </label>
          <label className="cosechas-filtro-fecha">
            <span>Hasta</span>
            <input
              type="date"
              min={fechaDesde || undefined}
              value={fechaHasta}
              onChange={(evento) => setFechaHasta(evento.target.value)}
              aria-label="Fecha final de cosecha"
            />
          </label>
        </div>

        {cargando ? (
          <div className="cosechas-vacio">Cargando cosechas...</div>
        ) : cosechasFiltradas.length === 0 ? (
          <div className="cosechas-vacio">
            <span>▤</span>
            <h3>No hay cosechas para mostrar</h3>
            <p>Registra una cosecha o ajusta los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="cosechas-tabla-contenedor">
            <table className="cosechas-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo de cultivo</th>
                  <th>Lote / finca</th>
                  <th>Cantidad</th>
                  <th>Observaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cosechasFiltradas.map((cosecha) => (
                  <tr key={cosecha.id}>
                    <td>{cosecha.fecha_cosecha}</td>
                    <td><strong>{cosecha.nombre_tipo_cultivo}</strong></td>
                    <td>
                      <strong>{cosecha.nombre_lote}</strong>
                      {cosecha.nombre_finca && <small>{cosecha.nombre_finca}</small>}
                    </td>
                    <td className="cosechas-cantidad">
                      {numeroFormato.format(Number(cosecha.cantidad))}
                      <small>{cosecha.unidad_medida_display}</small>
                    </td>
                    <td className="cosechas-observaciones">
                      {cosecha.observaciones || "—"}
                    </td>
                    <td>
                      <button
                        className="cosechas-btn-editar"
                        onClick={() => abrirEdicion(cosecha)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <div className="cosechas-modal-fondo">
          <section
            className="cosechas-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cosechas-modal-titulo"
          >
            <header className="cosechas-modal-header">
              <div>
                <span className="cosechas-eyebrow">REGISTRO DE PRODUCCIÓN</span>
                <h2 id="cosechas-modal-titulo">
                  {cosechaEditando ? "Editar cosecha" : "Registrar cosecha"}
                </h2>
              </div>
              <button
                className="cosechas-cerrar-modal"
                onClick={cerrarFormulario}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form onSubmit={guardarCosecha}>
              <div className="cosechas-form-grid">
                <label className="cosechas-campo-completo">
                  Lote cosechado
                  <select
                    name="lote"
                    value={formulario.lote}
                    onChange={cambiarCampo}
                    required
                  >
                    <option value="">Selecciona un lote</option>
                    {lotesDisponibles.map((lote) => (
                      <option key={lote.id} value={lote.id}>
                        {lote.nombre} · {lote.nombre_tipo_cultivo}
                        {lote.activo ? "" : " (inactivo)"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha de cosecha
                  <input
                    name="fecha_cosecha"
                    type="date"
                    max={fechaLocalActual()}
                    value={formulario.fecha_cosecha}
                    onChange={cambiarCampo}
                    required
                  />
                </label>
                <label>
                  Unidad de medida
                  <select
                    name="unidad_medida"
                    value={formulario.unidad_medida}
                    onChange={cambiarCampo}
                    required
                  >
                    {unidadesMedida.map((unidad) => (
                      <option key={unidad.valor} value={unidad.valor}>
                        {unidad.etiqueta}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad recolectada
                  <input
                    name="cantidad"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formulario.cantidad}
                    onChange={cambiarCampo}
                    required
                  />
                </label>
                <label className="cosechas-campo-completo">
                  Observaciones
                  <textarea
                    name="observaciones"
                    value={formulario.observaciones}
                    onChange={cambiarCampo}
                    rows="3"
                  />
                </label>
              </div>
              <p className="cosechas-ayuda-formulario">
                Si esta cosecha tiene ventas asociadas, no podrás reducir su
                cantidad por debajo de lo vendido ni cambiar el lote o la
                unidad.
              </p>
              <footer className="cosechas-modal-footer">
                <button
                  className="cosechas-btn-secundario"
                  type="button"
                  onClick={cerrarFormulario}
                >
                  Cancelar
                </button>
                <button className="cosechas-btn-principal" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar cosecha"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Cosechas;
