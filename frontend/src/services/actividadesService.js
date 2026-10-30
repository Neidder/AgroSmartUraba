import { api } from "./api";

function encabezadosAutenticacion() {
  const token = localStorage.getItem("token");

  return token ? { Authorization: `Token ${token}` } : {};
}

function obtenerLista(data) {
  const lista = Array.isArray(data) ? data : data?.results;

  if (!Array.isArray(lista)) {
    throw new Error("El servidor devolvió una lista de actividades no válida.");
  }

  return lista;
}

export async function listarActividades(filtros = {}) {
  const respuesta = await api.get("/api_actividades/actividades/", {
    params: filtros,
    headers: encabezadosAutenticacion(),
  });

  return obtenerLista(respuesta.data);
}

export async function listarLotesActividad() {
  const respuesta = await api.get("/api_cultivos/lotes/", {
    headers: encabezadosAutenticacion(),
  });

  return obtenerLista(respuesta.data);
}

export async function crearActividad(datos) {
  const respuesta = await api.post(
    "/api_actividades/actividades/",
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function actualizarActividad(id, datos) {
  const respuesta = await api.put(
    `/api_actividades/actividades/${id}/`,
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function actualizarEstadoActividad(id, activo) {
  const respuesta = await api.patch(
    `/api_actividades/actividades/${id}/`,
    { activo },
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}
