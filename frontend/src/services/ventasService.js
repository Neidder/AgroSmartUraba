import { api } from "./api";

export async function obtenerOpcionesVenta(ventaId, fechaVenta) {
  const respuesta = await api.get("/api_ventas/ventas/opciones/", {
    params: {
      ...(ventaId ? { venta: ventaId } : {}),
      ...(fechaVenta ? { fecha_venta: fechaVenta } : {}),
    },
    headers: encabezadosAutenticacion(),
  });

  return respuesta.data;
}

export async function listarPreciosProducto() {
  const respuesta = await api.get("/api_ventas/precios/", {
    headers: encabezadosAutenticacion(),
  });

  return Array.isArray(respuesta.data)
    ? respuesta.data
    : respuesta.data.results || [];
}

export async function crearPrecioProducto(datos) {
  const respuesta = await api.post("/api_ventas/precios/", datos, {
    headers: encabezadosAutenticacion(),
  });

  return respuesta.data;
}

export async function listarVentas(filtros = {}) {
  const respuesta = await api.get("/api_ventas/ventas/", {
    params: filtros,
    headers: encabezadosAutenticacion(),
  });

  return respuesta.data;
}

export async function guardarVenta(datos, ventaId) {
  const respuesta = ventaId
    ? await api.put(`/api_ventas/ventas/${ventaId}/`, datos, {
        headers: encabezadosAutenticacion(),
      })
    : await api.post("/api_ventas/ventas/", datos, {
        headers: encabezadosAutenticacion(),
      });

  return respuesta.data;
}

export async function anularVenta(ventaId, motivo) {
  const respuesta = await api.post(
    `/api_ventas/ventas/${ventaId}/anular/`,
    { motivo },
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function obtenerReporteIngresos(filtros = {}) {
  const respuesta = await api.get(
    "/api_ventas/ventas/reporte-ingresos/",
    {
      params: filtros,
      headers: encabezadosAutenticacion(),
    },
  );

  return respuesta.data;
}

function encabezadosAutenticacion() {
  const token = localStorage.getItem("token");

  return token ? { Authorization: `Token ${token}` } : {};
}
