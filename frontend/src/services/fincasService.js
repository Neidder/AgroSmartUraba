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

export async function listarFincas(filtros = {}) {
  const respuesta = await api.get("/api_fincas/fincas/", {
    params: filtros,
    headers: encabezadosAutenticacion(),
  });

  return obtenerLista(respuesta.data, "fincas");
}

export async function listarProductores() {
  const respuesta = await api.get("/api_productores/productores/", {
    headers: encabezadosAutenticacion(),
  });

  return obtenerLista(respuesta.data, "productores");
}

export async function crearFinca(datos) {
  const respuesta = await api.post(
    "/api_fincas/fincas/",
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function actualizarFinca(id, datos) {
  const respuesta = await api.put(
    `/api_fincas/fincas/${id}/`,
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function actualizarEstadoFinca(id, activa) {
  const respuesta = await api.patch(
    `/api_fincas/fincas/${id}/`,
    { activa },
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}
