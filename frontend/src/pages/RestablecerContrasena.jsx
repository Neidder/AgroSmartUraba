
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { restablecerContrasena } from "../services/authService";
import "../styles/RecuperarContrasena.css";

function RestablecerContrasena() {
  const [parametros] = useSearchParams();
  const navigate = useNavigate();

  const uid = parametros.get("uid");
  const token = parametros.get("token");

  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function cambiarContrasena(e) {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!uid || !token) {
      setError("El enlace está incompleto. Solicita uno nuevo.");
      return;
    }

    if (contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (contrasena !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    try {
      const respuesta = await restablecerContrasena({
        uid,
        token,
        nueva_contrasena: contrasena,
      });

      setMensaje(respuesta.mensaje);

      setTimeout(() => {
        navigate("/");
      }, 2500);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "No se pudo cambiar la contraseña. Solicita un enlace nuevo."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="recuperacion-container">
      <section className="recuperacion-card">
        <div className="recuperacion-logo">🌿</div>

        <h1>Crear nueva contraseña</h1>

        <p className="recuperacion-descripcion">
          Ingresa tu nueva contraseña y confírmala para recuperar
          el acceso a AgroSmart Urabá.
        </p>

        <form onSubmit={cambiarContrasena}>
          <label htmlFor="contrasena">Nueva contraseña</label>
          <input
            id="contrasena"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
            minLength={8}
            disabled={cargando || Boolean(mensaje)}
          />

          <label htmlFor="confirmacion">Confirmar contraseña</label>
          <input
            id="confirmacion"
            type="password"
            autoComplete="new-password"
            placeholder="Repite la nueva contraseña"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            required
            disabled={cargando || Boolean(mensaje)}
          />

          {error && (
            <p className="mensaje-error" role="alert">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="mensaje-exito" role="status">
              {mensaje} Serás redirigido al inicio de sesión.
            </p>
          )}

          <button
            type="submit"
            disabled={cargando || Boolean(mensaje)}
          >
            {cargando ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </form>

        <Link to="/" className="enlace-volver">
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}

export default RestablecerContrasena;
