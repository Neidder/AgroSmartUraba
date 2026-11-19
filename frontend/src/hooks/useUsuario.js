import { useEffect, useState } from "react";

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "{}");
  } catch {
    return {};
  }
}

// Avisa a todos los componentes que el usuario guardado cambió (por ejemplo, al editar el perfil).
export function notificarUsuarioActualizado() {
  window.dispatchEvent(new Event("usuario-actualizado"));
}

export function useUsuario() {
  const [usuario, setUsuario] = useState(leerUsuario);

  useEffect(() => {
    const alCambiar = () => setUsuario(leerUsuario());
    window.addEventListener("usuario-actualizado", alCambiar);
    window.addEventListener("storage", alCambiar);
    return () => {
      window.removeEventListener("usuario-actualizado", alCambiar);
      window.removeEventListener("storage", alCambiar);
    };
  }, []);

  const nombre = usuario.nombre || usuario.first_name || usuario.username || "Usuario";
  const esAdministrador = usuario.rol === "ADMINISTRADOR";

  return {
    id: usuario.id ?? null,
    nombre,
    esAdministrador,
    rol: esAdministrador ? "Administrador" : "Trabajador",
    inicial: nombre.charAt(0).toUpperCase(),
  };
}