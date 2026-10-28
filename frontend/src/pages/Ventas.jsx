import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import {
  anularVenta,
  guardarVenta,
  listarVentas,
  obtenerOpcionesVenta,
  obtenerReporteIngresos,
} from "../services/ventasService";
import "../styles/Ventas.css";

const fechaLocal = () => {
  const hoy = new Date();
  const zonaHoraria = hoy.getTimezoneOffset() * 60000;
  return new Date(hoy.getTime() - zonaHoraria).toISOString().slice(0, 10);
};

const detalleVacio = () => ({
  cosecha: "",
  cantidad: "",
  precio_unitario: "",
});

const formularioVacio = () => ({
  productor: "",
  fecha_venta: fechaLocal(),
  comprador_nombre: "",
  comprador_documento: "",
  comprador_contacto: "",
  detalles: [detalleVacio()],
});

const formatoMoneda = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);

function Ventas() {
  const [opciones, setOpciones] = useState({
    productores: [],
    cosechas: [],
  });
  const [ventas, setVentas] = useState([]);
  const [reporte, setReporte] = useState({
    cantidad_ventas: 0,
    total_ingresos: "0.00",
    por_productor: [],
    por_producto: [],
  });
  const [filtros, setFiltros] = useState({ desde: "", hasta: "" });
  const [formulario, setFormulario] = useState(formularioVacio);
  const [ventaEditando, setVentaEditando] = useState(null);
  const [ventaAnulando, setVentaAnulando] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let vigente = true;

    obtenerOpcionesVenta()
      .then((datos) => {
        if (vigente) {
          setOpciones(datos);
        }
      })
      .catch((err) => {
        if (vigente) {
          setError(
            getApiErrorMessage(
              err,
              "No fue posible cargar productores y cosechas disponibles.",
            ),
          );
        }
      });

    Promise.all([listarVentas(), obtenerReporteIngresos()])
      .then(([lista, resumen]) => {
        if (vigente) {
          setVentas(Array.isArray(lista) ? lista : lista.results || []);
          setReporte(resumen);
        }
      })
      .catch((err) => {
        if (vigente) {
          setError(
            getApiErrorMessage(err, "No fue posible cargar las ventas."),
          );
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

  async function actualizarListado(filtrosAplicados = filtros) {
    setCargando(true);
    setError("");

    const parametros = Object.fromEntries(
      Object.entries(filtrosAplicados).filter(([, valor]) => Boolean(valor)),
    );

    try {
      const [lista, resumen] = await Promise.all([
        listarVentas(parametros),
        obtenerReporteIngresos(parametros),
      ]);
      setVentas(Array.isArray(lista) ? lista : lista.results || []);
      setReporte(resumen);
    } catch (err) {
      setError(getApiErrorMessage(err, "No fue posible actualizar las ventas."));
    } finally {
      setCargando(false);
    }
  }

  async function actualizarOpciones(ventaId) {
    try {
      const datos = await obtenerOpcionesVenta(ventaId);
      setOpciones(datos);
      return datos;
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "No fue posible cargar las cosechas disponibles.",
        ),
      );
      return null;
    }
  }

  function abrirNuevaVenta() {
    setError("");
    setMensaje("");
    setVentaEditando(null);
    setFormulario(formularioVacio());
    setMostrarFormulario(true);
  }

  async function abrirEdicion(venta) {
    setError("");
    setMensaje("");
    const datosOpciones = await actualizarOpciones(venta.id);
    if (!datosOpciones) {
      return;
    }

    setVentaEditando(venta.id);
    setFormulario({
      productor: String(venta.productor),
      fecha_venta: venta.fecha_venta,
      comprador_nombre: venta.comprador_nombre || "",
      comprador_documento: venta.comprador_documento || "",
      comprador_contacto: venta.comprador_contacto || "",
      detalles: venta.detalles.map((detalle) => ({
        cosecha: String(detalle.cosecha),
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
      })),
    });
    setMostrarFormulario(true);
  }

  function cerrarFormulario() {
    setMostrarFormulario(false);
    setVentaEditando(null);
    setFormulario(formularioVacio());
  }

  function actualizarProductor(productor) {
    setFormulario((actual) => ({
      ...actual,
      productor,
      detalles: actual.detalles.map(detalleVacio),
    }));
  }

  function actualizarDetalle(indice, campo, valor) {
    setFormulario((actual) => ({
      ...actual,
      detalles: actual.detalles.map((detalle, posicion) =>
        posicion === indice
          ? { ...detalle, [campo]: valor }
          : detalle,
      ),
    }));
  }

  function calcularTotalPreliminar() {
    const centavos = formulario.detalles.reduce((total, detalle) => {
      const cantidad = Number(detalle.cantidad) || 0;
      const precio = Number(detalle.precio_unitario) || 0;
      return total + Math.round(cantidad * precio * 100);
    }, 0);

    return centavos / 100;
  }

  async function guardarFormulario(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);

    const datos = {
      productor: Number(formulario.productor),
      fecha_venta: formulario.fecha_venta,
      comprador_nombre: formulario.comprador_nombre.trim(),
      comprador_documento: formulario.comprador_documento.trim(),
      comprador_contacto: formulario.comprador_contacto.trim(),
      detalles: formulario.detalles.map((detalle) => ({
        cosecha: Number(detalle.cosecha),
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
      })),
    };

    try {
      await guardarVenta(datos, ventaEditando);
      setMensaje(
        ventaEditando
          ? "Venta actualizada correctamente."
          : "Venta registrada correctamente.",
      );
      cerrarFormulario();
      await Promise.all([
        actualizarListado(),
        actualizarOpciones(),
      ]);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "No fue posible guardar la venta."),
      );
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarAnulacion(evento) {
    evento.preventDefault();
    if (!ventaAnulando) {
      return;
    }

    setGuardando(true);
    setError("");
    try {
      await anularVenta(ventaAnulando.id, motivoAnulacion.trim());
      setVentaAnulando(null);
      setMotivoAnulacion("");
      setMensaje("La venta se anuló correctamente.");
      await Promise.all([
        actualizarListado(),
        actualizarOpciones(),
      ]);
    } catch (err) {
      setError(getApiErrorMessage(err, "No fue posible anular la venta."));
    } finally {
      setGuardando(false);
    }
  }

  const cosechasProductor = opciones.cosechas.filter(
    (cosecha) => String(cosecha.productor) === formulario.productor,
  );

  return (
    <main className="ventas-page">
      <header className="ventas-header">
        <div>
          <span className="ventas-eyebrow">
            GESTIÓN AGRÍCOLA INTELIGENTE
          </span>
          <h1>Ventas</h1>
          <p>Registra ventas de cosechas y consulta los ingresos.</p>
        </div>
        <button
          className="ventas-btn-principal"
          onClick={abrirNuevaVenta}
          disabled={opciones.productores.length === 0}
        >
          ＋ Nueva venta
        </button>
      </header>

      {mensaje && (
        <div className="ventas-alerta exito" role="status">
          {mensaje}
          <button onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="ventas-alerta error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}

      <section className="ventas-resumen">
        <article className="ventas-resumen-card">
          <span className="ventas-resumen-icon verde">＄</span>
          <div>
            <small>Ingresos registrados</small>
            <strong>{formatoMoneda(reporte.total_ingresos)}</strong>
          </div>
        </article>
        <article className="ventas-resumen-card">
          <span className="ventas-resumen-icon azul">▤</span>
          <div>
            <small>Ventas vigentes</small>
            <strong>{reporte.cantidad_ventas}</strong>
          </div>
        </article>
        <article className="ventas-resumen-card">
          <span className="ventas-resumen-icon naranja">🌱</span>
          <div>
            <small>Productores con ingresos</small>
            <strong>{reporte.por_productor.length}</strong>
          </div>
        </article>
      </section>

      <section className="ventas-panel ventas-filtros-panel">
        <div className="ventas-panel-heading">
          <div>
            <h2>Filtrar por fecha</h2>
            <p>El reporte de ingresos excluye las ventas anuladas.</p>
          </div>
          <div className="ventas-filtros">
            <label>
              Desde
              <input
                type="date"
                value={filtros.desde}
                onChange={(evento) =>
                  setFiltros({ ...filtros, desde: evento.target.value })
                }
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={filtros.hasta}
                onChange={(evento) =>
                  setFiltros({ ...filtros, hasta: evento.target.value })
                }
              />
            </label>
            <button
              className="ventas-btn-secundario"
              onClick={() => actualizarListado()}
              disabled={cargando}
            >
              Aplicar
            </button>
            <button
              className="ventas-btn-limpiar"
              onClick={() => {
                const vacios = { desde: "", hasta: "" };
                setFiltros(vacios);
                actualizarListado(vacios);
              }}
              disabled={cargando}
            >
              Limpiar
            </button>
          </div>
        </div>
      </section>

      <section className="ventas-panel">
        <div className="ventas-panel-heading">
          <div>
            <h2>Historial de ventas</h2>
            <p>Consulta, edita o anula los registros.</p>
          </div>
          <span className="ventas-contador">{ventas.length} registros</span>
        </div>

        {cargando ? (
          <div className="ventas-vacio">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="ventas-vacio">
            <span>＄</span>
            <h3>No hay ventas para mostrar</h3>
            <p>Registra una venta o ajusta el rango de fechas.</p>
          </div>
        ) : (
          <div className="ventas-tabla-contenedor">
            <table className="ventas-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Productor</th>
                  <th>Productos</th>
                  <th>Comprador</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td>{venta.fecha_venta}</td>
                    <td>{venta.nombre_productor}</td>
                    <td>
                      {venta.detalles.map((detalle) => (
                        <div className="ventas-producto-resumen" key={detalle.id}>
                          <strong>{detalle.nombre_producto}</strong>
                          <small>
                            {detalle.cantidad} {detalle.unidad_medida}
                          </small>
                        </div>
                      ))}
                    </td>
                    <td>{venta.comprador_nombre || "No registrado"}</td>
                    <td className="ventas-monto">
                      {formatoMoneda(venta.total)}
                    </td>
                    <td>
                      <span
                        className={`ventas-estado ${
                          venta.estado === "REGISTRADA"
                            ? "vigente"
                            : "anulada"
                        }`}
                      >
                        {venta.estado === "REGISTRADA"
                          ? "Vigente"
                          : "Anulada"}
                      </span>
                    </td>
                    <td>
                      {venta.estado === "REGISTRADA" ? (
                        <div className="ventas-acciones">
                          <button
                            className="ventas-btn-editar"
                            onClick={() => abrirEdicion(venta)}
                          >
                            Editar
                          </button>
                          <button
                            className="ventas-btn-anular"
                            onClick={() => {
                              setVentaAnulando(venta);
                              setMotivoAnulacion("");
                            }}
                          >
                            Anular
                          </button>
                        </div>
                      ) : (
                        <small className="ventas-motivo">
                          {venta.motivo_anulacion || "Sin motivo"}
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ventas-reportes-grid">
        <article className="ventas-panel">
          <div className="ventas-panel-heading">
            <div>
              <h2>Ingresos por producto</h2>
              <p>Solo ventas vigentes dentro del rango seleccionado.</p>
            </div>
          </div>
          {reporte.por_producto.length === 0 ? (
            <div className="ventas-vacio compacto">Sin ingresos en el período.</div>
          ) : (
            <div className="ventas-lista-reporte">
              {reporte.por_producto.map((item) => (
                <div
                  className="ventas-fila-reporte"
                  key={`${item.tipo_cultivo_id}-${item.unidad_medida}`}
                >
                  <div>
                    <strong>{item.producto}</strong>
                    <small>
                      {item.cantidad} {item.unidad_medida}
                    </small>
                  </div>
                  <strong>{formatoMoneda(item.ingresos)}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="ventas-panel">
          <div className="ventas-panel-heading">
            <div>
              <h2>Ingresos por productor</h2>
              <p>Productores con ventas vigentes en el período.</p>
            </div>
          </div>
          {reporte.por_productor.length === 0 ? (
            <div className="ventas-vacio compacto">Sin ingresos en el período.</div>
          ) : (
            <div className="ventas-lista-reporte">
              {reporte.por_productor.map((item) => (
                <div className="ventas-fila-reporte" key={item.productor_id}>
                  <strong>{item.productor}</strong>
                  <strong>{formatoMoneda(item.ingresos)}</strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      {mostrarFormulario && (
        <div className="ventas-modal-fondo">
          <section
            className="ventas-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ventas-modal-titulo"
          >
            <header className="ventas-modal-header">
              <div>
                <span className="ventas-eyebrow">REGISTRO COMERCIAL</span>
                <h2 id="ventas-modal-titulo">
                  {ventaEditando ? "Editar venta" : "Registrar venta"}
                </h2>
              </div>
              <button
                className="ventas-cerrar-modal"
                onClick={cerrarFormulario}
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </header>

            <form onSubmit={guardarFormulario}>
              <div className="ventas-form-grid">
                <label>
                  Productor de origen
                  <select
                    value={formulario.productor}
                    onChange={(evento) => actualizarProductor(evento.target.value)}
                    required
                  >
                    <option value="">Selecciona un productor</option>
                    {opciones.productores.map((productor) => (
                      <option key={productor.id} value={productor.id}>
                        {productor.nombre} · {productor.numero_documento}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha de venta
                  <input
                    type="date"
                    value={formulario.fecha_venta}
                    onChange={(evento) =>
                      setFormulario({
                        ...formulario,
                        fecha_venta: evento.target.value,
                      })
                    }
                    required
                  />
                </label>
              </div>

              <fieldset className="ventas-comprador">
                <legend>Datos del comprador (opcionales)</legend>
                <div className="ventas-form-grid">
                  <label>
                    Nombre
                    <input
                      value={formulario.comprador_nombre}
                      onChange={(evento) =>
                        setFormulario({
                          ...formulario,
                          comprador_nombre: evento.target.value,
                        })
                      }
                      maxLength={150}
                    />
                  </label>
                  <label>
                    Documento
                    <input
                      value={formulario.comprador_documento}
                      onChange={(evento) =>
                        setFormulario({
                          ...formulario,
                          comprador_documento: evento.target.value,
                        })
                      }
                      maxLength={30}
                    />
                  </label>
                  <label className="ventas-campo-completo">
                    Teléfono o correo
                    <input
                      value={formulario.comprador_contacto}
                      onChange={(evento) =>
                        setFormulario({
                          ...formulario,
                          comprador_contacto: evento.target.value,
                        })
                      }
                      maxLength={100}
                    />
                  </label>
                </div>
              </fieldset>

              <div className="ventas-detalles-heading">
                <div>
                  <h3>Productos vendidos</h3>
                  <p>El precio se registra por la unidad de cada cosecha.</p>
                </div>
                <button
                  type="button"
                  className="ventas-btn-secundario"
                  onClick={() =>
                    setFormulario({
                      ...formulario,
                      detalles: [...formulario.detalles, detalleVacio()],
                    })
                  }
                  disabled={!formulario.productor}
                >
                  ＋ Añadir producto
                </button>
              </div>

              {formulario.detalles.map((detalle, indice) => (
                <div className="ventas-detalle-form" key={indice}>
                  <label className="ventas-producto-campo">
                    Cosecha / producto
                    <select
                      value={detalle.cosecha}
                      onChange={(evento) =>
                        actualizarDetalle(indice, "cosecha", evento.target.value)
                      }
                      required
                    >
                      <option value="">
                        {formulario.productor
                          ? "Selecciona un producto disponible"
                          : "Selecciona primero un productor"}
                      </option>
                      {cosechasProductor.map((cosecha) => (
                        <option key={cosecha.id} value={cosecha.id}>
                          {cosecha.nombre_producto} · {cosecha.nombre_lote} ·
                          {" "}disponible: {cosecha.cantidad_disponible}{" "}
                          {cosecha.unidad_medida_display}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cantidad
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={detalle.cantidad}
                      onChange={(evento) =>
                        actualizarDetalle(indice, "cantidad", evento.target.value)
                      }
                      required
                    />
                  </label>
                  <label>
                    Precio unitario (COP)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={detalle.precio_unitario}
                      onChange={(evento) =>
                        actualizarDetalle(
                          indice,
                          "precio_unitario",
                          evento.target.value,
                        )
                      }
                      required
                    />
                  </label>
                  <button
                    type="button"
                    className="ventas-quitar-detalle"
                    onClick={() =>
                      setFormulario({
                        ...formulario,
                        detalles: formulario.detalles.filter(
                          (_, posicion) => posicion !== indice,
                        ),
                      })
                    }
                    disabled={formulario.detalles.length === 1}
                    aria-label="Quitar producto"
                    title="Quitar producto"
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className="ventas-total-preliminar">
                <span>Total calculado</span>
                <strong>{formatoMoneda(calcularTotalPreliminar())}</strong>
              </div>

              <footer className="ventas-modal-footer">
                <button
                  type="button"
                  className="ventas-btn-limpiar"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ventas-btn-principal"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : ventaEditando
                      ? "Guardar cambios"
                      : "Registrar venta"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {ventaAnulando && (
        <div className="ventas-modal-fondo">
          <section
            className="ventas-modal ventas-modal-anulacion"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ventas-anular-titulo"
          >
            <header className="ventas-modal-header">
              <div>
                <span className="ventas-eyebrow">CONFIRMAR ACCIÓN</span>
                <h2 id="ventas-anular-titulo">Anular venta</h2>
              </div>
              <button
                className="ventas-cerrar-modal"
                onClick={() => setVentaAnulando(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </header>
            <p>
              La venta #{ventaAnulando.id} se conservará en el historial, pero
              sus ingresos y cantidades dejarán de contabilizarse.
            </p>
            <form onSubmit={confirmarAnulacion}>
              <label>
                Motivo (opcional)
                <textarea
                  value={motivoAnulacion}
                  onChange={(evento) =>
                    setMotivoAnulacion(evento.target.value)
                  }
                  rows={3}
                />
              </label>
              <footer className="ventas-modal-footer">
                <button
                  type="button"
                  className="ventas-btn-limpiar"
                  onClick={() => setVentaAnulando(null)}
                  disabled={guardando}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className="ventas-btn-confirmar-anulacion"
                  disabled={guardando}
                >
                  {guardando ? "Anulando..." : "Confirmar anulación"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Ventas;
