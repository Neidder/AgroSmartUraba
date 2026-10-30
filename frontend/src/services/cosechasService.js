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

export async function listarCosechas(filtros = {}) {
  const respuesta = await api.get("/api_cosechas/cosechas/", {
    params: filtros,
    headers: encabezadosAutenticacion(),
  });

  return obtenerLista(respuesta.data, "cosechas");
}

export async function listarLotesCosecha() {
  const respuesta = await api.get("/api_cultivos/lotes/", {
    headers: encabezadosAutenticacion(),
  });

  return obtenerLista(respuesta.data, "lotes");
}

export async function crearCosecha(datos) {
  const respuesta = await api.post(
    "/api_cosechas/cosechas/",
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}

export async function actualizarCosecha(id, datos) {
  const respuesta = await api.put(
    `/api_cosechas/cosechas/${id}/`,
    datos,
    { headers: encabezadosAutenticacion() },
  );

  return respuesta.data;
}
