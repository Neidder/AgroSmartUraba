
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { iniciarSesion } from "../services/auth";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarInicioSesion(event) {
    event.preventDefault();
    setError("");
    setCargando(true);

    try {
      const data = await iniciarSesion(username, password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));

      navigate("/dashboard");

    } catch (err) {
      console.error(
        "Error al iniciar sesión:",
        err.response?.data || err.message
      );

      const datos = err.response?.data;

      setError(
        datos?.detail ||
        datos?.non_field_errors?.[0] ||
        datos?.username?.[0] ||
        datos?.password?.[0] ||
        (typeof datos === "string" ? datos : "") ||
        "No fue posible iniciar sesión. Verifica tus credenciales o la conexión."
      );
    } finally {
      setCargando(false);
    }

  }

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="brand">
          <div className="brand-icon">🌿</div>
          <div>
            <h1>AgroSmart Urabá</h1>
            <span>Tecnología que impulsa el campo</span>
          </div>
        </div>

        <div className="hero-content">
          <h2>Gestión inteligente para el sector agrícola</h2>
          <p>
            Administra productores, fincas, cultivos, cosechas y
            actividades desde una plataforma moderna, segura y centralizada.
          </p>
        </div>

        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">👨‍🌾</div>
            <div>
              <h3>Productores</h3>
              <p>Registro y administración de productores.</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌱</div>
            <div>
              <h3>Cultivos</h3>
              <p>Seguimiento completo de cultivos.</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <div>
              <h3>Indicadores</h3>
              <p>Visualización y análisis de información.</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <div>
              <h3>Seguridad</h3>
              <p>Información protegida y confiable.</p>
            </div>
          </div>
        </div>

        <div className="location">📍 Urabá, Antioquia - Colombia</div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-logo">🌿</div>

          <h2>Bienvenido</h2>

          <p className="login-subtitle">
            Inicia sesión para acceder al sistema AgroSmart.
          </p>

          <form onSubmit={manejarInicioSesion}>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Ingrese su usuario"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Ingrese su contraseña"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={cargando}>
              {cargando ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

          <div className="footer-logo">AgroSmart Urabá</div>
        </div>
      </div>
    </div>
  );
}

export default Login;
