
import { Navigate, Outlet } from "react-router-dom";

function RutaProtegida({ rolesPermitidos }) {
  const token = localStorage.getItem("token");
  const usuarioGuardado = localStorage.getItem("usuario");

  // Si no hay sesión, regresar al inicio de sesión.
  if (!token || !usuarioGuardado) {
    return <Navigate to="/" replace />;
  }

  let usuario;

  try {
    usuario = JSON.parse(usuarioGuardado);
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    return <Navigate to="/" replace />;
  }

  // Verificar que el usuario tenga un rol permitido.
  if (
    rolesPermitidos &&
    !rolesPermitidos.includes(usuario.rol)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default RutaProtegida;
