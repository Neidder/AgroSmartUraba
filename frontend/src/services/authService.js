
import { api } from "./api";

export async function login(username, password) {
  const respuesta = await api.post("/api_usuarios/login/", {
    username,
    password,
  });

  return respuesta.data;
}

export async function solicitarAcceso(datos) {
  const respuesta = await api.post("/api_usuarios/solicitar-acceso/", datos);

  return respuesta.data;
}

export async function solicitarRecuperacion(username, correo) {
  const respuesta = await api.post("/api_usuarios/recuperar-contrasena/", {
    username,
    correo,
  });

  return respuesta.data;
}

export async function restablecerContrasena(datos) {
  const respuesta = await api.post(
    "/api_usuarios/restablecer-contrasena/",
    datos,
  );

  return respuesta.data;
}
