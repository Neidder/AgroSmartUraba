
import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api_usuarios";

export async function login(username, password) {
  const respuesta = await axios.post(`${API_URL}/login/`, {
    username,
    password,
  });

  return respuesta.data;
}

export async function solicitarAcceso(datos) {
  const respuesta = await axios.post(
    `${API_URL}/solicitar-acceso/`,
    datos
  );

  return respuesta.data;
}

export async function solicitarRecuperacion(username, correo) {
  const respuesta = await axios.post(
    `${API_URL}/recuperar-contrasena/`,
    { username, correo }
  );

  return respuesta.data;
}

export async function restablecerContrasena(datos) {
  const respuesta = await axios.post(
    `${API_URL}/restablecer-contrasena/`,
    datos
  );

  return respuesta.data;
}
