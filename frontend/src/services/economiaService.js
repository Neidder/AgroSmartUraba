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

async function listar(ruta, nombreRecurso, filtros = {}) {
  const respuesta = await api.get(ruta, {
    params: Object.fromEntries(
      Object.entries(filtros).filter(([, valor]) => Boolean(valor)),
    ),
    headers: encabezadosAutenticacion(),
  });

  return obtenerLista(respuesta.data, nombreRecurso);
}

export function listarCostosProduccion(filtros = {}) {
  return listar(
    "/api_economia/costos-produccion/",
    "costos de producción",
    filtros,
  );
}

export function listarPerdidasAgricolas(filtros = {}) {
  return listar(
    "/api_economia/perdidas-agricolas/",
    "pérdidas agrícolas",
    filtros,
  );
}

export async function guardarCostoProduccion(datos, id) {
  const respuesta = id
    ? await api.put(`/api_economia/costos-produccion/${id}/`, datos, {
        headers: encabezadosAutenticacion(),
      })
    : await api.post("/api_economia/costos-produccion/", datos, {
        headers: encabezadosAutenticacion(),
      });

  return respuesta.data;
}

export async function guardarPerdidaAgricola(datos, id) {
  const respuesta = id
    ? await api.put(`/api_economia/perdidas-agricolas/${id}/`, datos, {
        headers: encabezadosAutenticacion(),
      })
    : await api.post("/api_economia/perdidas-agricolas/", datos, {
        headers: encabezadosAutenticacion(),
      });

  return respuesta.data;
}

export async function eliminarCostoProduccion(id) {
  await api.delete(`/api_economia/costos-produccion/${id}/`, {
    headers: encabezadosAutenticacion(),
  });
}

export async function eliminarPerdidaAgricola(id) {
  await api.delete(`/api_economia/perdidas-agricolas/${id}/`, {
    headers: encabezadosAutenticacion(),
  });
}
