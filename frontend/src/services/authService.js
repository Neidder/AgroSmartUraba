import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api_usuarios/login/";

export const login = async (username, password) => {
  const response = await axios.post(API_URL, {
    username,
    password,
  });

  return response.data;
};