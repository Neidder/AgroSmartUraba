import { api } from "./api";

function encabezadosAutenticacion() {
  const token = localStorage.getItem("token");

  return token ? { Authorization: `Token ${token}` } : {};
}

function obtenerLista(data, nombreRecurso) {
  const lista = Array.isArray(data) ? data : data?.results;

  if (!Array.isArray(lista)) {
    throw new Error(`El servidor devolvió una lista de ${nombreRecurso} no válida.`);
  }

  return lista;
}

export async function listarTiposCultivo(filtros = {}) {
  const respuesta = await api.get("/api_cultivos/tipos-cultivo/", {
    params: filtros,
    headers: encabezadosAutenticacion(),
  });

  return obtenerLista(respuesta.data, "tipos de cultivo");
}

export async function listarLotes(filtros = {}) {
  const respuesta = await api.get("/api_cultivos/lotes/", {
    params: filtros,
    headers: encabezadosAutenticacion(),
  });

  return obtenerLista(respuesta.data, "lotes");
}

export async function crearTipoCultivo(datos) {
  const respuesta = await api.post(
    "/api_cultivos/tipos-cultivo/",
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function actualizarTipoCultivo(id, datos) {
  const respuesta = await api.put(
    `/api_cultivos/tipos-cultivo/${id}/`,
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function actualizarEstadoTipoCultivo(id, activo) {
  const respuesta = await api.patch(
    `/api_cultivos/tipos-cultivo/${id}/`,
    { activo },
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function crearLote(datos) {
  const respuesta = await api.post(
    "/api_cultivos/lotes/",
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function actualizarLote(id, datos) {
  const respuesta = await api.put(
    `/api_cultivos/lotes/${id}/`,
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function actualizarEstadoLote(id, activo) {
  const respuesta = await api.patch(
    `/api_cultivos/lotes/${id}/`,
    { activo },
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}
