
import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api_usuarios";

export async function iniciarSesion(username, password) {
  const respuesta = await axios.post(`${API_URL}/login/`, {
    username,
    password,
  });

  return respuesta.data;
}
