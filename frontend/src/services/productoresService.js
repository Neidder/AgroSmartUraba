import { api } from "./api";

function authConfig() {
  const token = localStorage.getItem("token");

  return token
    ? { headers: { Authorization: `Token ${token}` } }
    : undefined;
}

export async function listarProductores() {
  const respuesta = await api.get(
    "/api_productores/productores/",
    authConfig(),
  );
  const productores = Array.isArray(respuesta.data)
    ? respuesta.data
    : respuesta.data?.results;

  if (!Array.isArray(productores)) {
    throw new Error("El servidor devolvió una lista de productores no válida.");
  }

  return productores;
}

export async function crearProductor(datos) {
  const respuesta = await api.post(
    "/api_productores/productores/",
    datos,
    authConfig(),
  );

  return respuesta.data;
}

export async function actualizarProductor(id, datos) {
  const respuesta = await api.put(
    `/api_productores/productores/${id}/`,
    datos,
    authConfig(),
  );

  return respuesta.data;
}

export async function actualizarEstadoProductor(id, activo) {
  const respuesta = await api.patch(
    `/api_productores/productores/${id}/`,
    { activo },
    authConfig(),
  );

  return respuesta.data;
}
