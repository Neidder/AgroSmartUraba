import { useState } from "react";
import { Link } from "react-router-dom";
import { solicitarAcceso } from "../services/authService";
import { getApiErrorMessage } from "../services/api";
import "../styles/SolicitarAcceso.css";

function SolicitarAcceso() {
  const [datos, setDatos] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    motivo: "",
  });

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  function actualizarCampo(e) {
    setDatos({
      ...datos,
      [e.target.name]: e.target.value,
    });
  }

  async function enviarSolicitud(e) {
    e.preventDefault();
    setMensaje("");
    setError("");
    setCargando(true);

    try {
      const respuesta = await solicitarAcceso(datos);

      setMensaje(respuesta.mensaje);

      setDatos({
        nombre: "",
        apellido: "",
        correo: "",
        motivo: "",
      });
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "No se pudo enviar la solicitud. Intenta nuevamente.",
        ),
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="solicitud-container">
      <section className="solicitud-card">
        <div className="solicitud-logo">🌿</div>

        <h1>Solicitar acceso</h1>

        <p className="solicitud-descripcion">
          Completa tus datos para que el administrador revise tu solicitud
          de acceso a AgroSmart Urabá.
        </p>

        <form onSubmit={enviarSolicitud}>
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Ingresa tu nombre"
            value={datos.nombre}
            onChange={actualizarCampo}
            required
          />

          <label htmlFor="apellido">Apellido</label>
          <input
            id="apellido"
            name="apellido"
            type="text"
            placeholder="Ingresa tu apellido"
            value={datos.apellido}
            onChange={actualizarCampo}
            required
          />

          <label htmlFor="correo">Correo electrónico</label>
          <input
            id="correo"
            name="correo"
            type="email"
            placeholder="ejemplo@correo.com"
            value={datos.correo}
            onChange={actualizarCampo}
            required
          />

          <label htmlFor="motivo">¿Por qué necesitas acceso?</label>
          <textarea
            id="motivo"
            name="motivo"
            placeholder="Cuéntanos para qué necesitas utilizar la plataforma"
            value={datos.motivo}
            onChange={actualizarCampo}
            rows={4}
            required
          />

          {error && (
            <p className="solicitud-error" role="alert">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="solicitud-exito" role="status">
              {mensaje}
            </p>
          )}

          <button
            className="solicitud-boton"
            type="submit"
            disabled={cargando}
          >
            {cargando ? "Enviando solicitud..." : "Enviar solicitud"}
          </button>
        </form>

        <p className="solicitud-regreso">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/" className="solicitud-volver">
            Volver al inicio de sesión
          </Link>
        </p>
      </section>
    </main>
  );
}

export default SolicitarAcceso;
