export function useUsuario() {
  let usuario = {};
  try {
    usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  } catch {
    usuario = {};
  }

  const nombre =
    usuario.nombre || usuario.first_name || usuario.username || "Usuario";
  const esAdministrador = usuario.rol === "ADMINISTRADOR";

  return {
    nombre,
    esAdministrador,
    rol: esAdministrador ? "Administrador" : "Trabajador",
    inicial: nombre.charAt(0).toUpperCase(),
  };
}