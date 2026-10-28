import axios from "axios";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: "application/json",
  },
});

export function getApiErrorMessage(error, fallback) {
  const response = error?.response;

  if (!response) {
    return "No se pudo conectar con el servidor. Verifica la conexión e inténtalo nuevamente.";
  }

  const data = response.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const message = data.detail || data.error;

    if (typeof message === "string") {
      return message;
    }

    const errors = Object.entries(data)
      .map(([field, messages]) => {
        const detail = Array.isArray(messages)
          ? messages.join(", ")
          : typeof messages === "string"
            ? messages
            : JSON.stringify(messages);

        return `${field}: ${detail}`;
      })
      .filter(Boolean)
      .join(" | ");

    if (errors) {
      return errors;
    }
  }

  return fallback;
}
