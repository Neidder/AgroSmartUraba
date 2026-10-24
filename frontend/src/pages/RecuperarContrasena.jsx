
import { useState } from "react";
import { Link } from "react-router-dom";
import { solicitarRecuperacion } from "../services/authService";
import "../styles/RecuperarContrasena.css";


function RecuperarContrasena() {
  const [username, setUsername] = useState("");
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviarSolicitud(e) {
    e.preventDefault();
    setMensaje("");
    setError("");
    setCargando(true);

    try {
      const respuesta = await solicitarRecuperacion(
        username.trim(),
        correo.trim()
      );

      setMensaje(respuesta.mensaje);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "No se pudo procesar la solicitud. Intenta nuevamente."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="recuperacion-container">
      <section className="recuperacion-card">
        <div className="recuperacion-logo">🌿</div>

        <h1>Recuperar contraseña</h1>

        <p className="recuperacion-descripcion">
          Ingresa tu usuario y el correo electrónico asociado
          a tu cuenta. Te enviaremos un enlace para crear una
          contraseña nueva.
        </p>

        <form onSubmit={enviarSolicitud}>
          <label htmlFor="username">Nombre de usuario</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="Ingresa tu usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={cargando}
          />

          <label htmlFor="correo">Correo electrónico registrado</label>
          <input
            id="correo"
            type="email"
            autoComplete="email"
            placeholder="Ingresa tu correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            disabled={cargando}
          />

          {error && (
            <p className="mensaje-error" role="alert">{error}</p>
          )}

          {mensaje && (
            <p className="mensaje-exito" role="status">{mensaje}</p>
          )}

          <button type="submit" disabled={cargando}>
            {cargando ? "Procesando..." : "Enviar enlace de recuperación"}
          </button>
        </form>

        <Link to="/" className="enlace-volver">
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  );
}

export default RecuperarContrasena;
