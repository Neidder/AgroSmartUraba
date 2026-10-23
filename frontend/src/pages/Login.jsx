import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación básica antes de llamar al servidor
    if (!username.trim() || !password) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await login(username.trim(), password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));

      navigate("/dashboard");
    } catch (err) {
      console.error("ERROR LOGIN:", err);

      if (err.response) {
        // El servidor respondió: credenciales inválidas u otro error
        if (err.response.status === 400 || err.response.status === 401) {
          setError("Usuario o contraseña incorrectos.");
        } else {
          setError("Error del servidor. Intenta de nuevo más tarde.");
        }
      } else {
        // Sin respuesta: backend apagado, CORS o sin conexión
        setError("No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.");
      }
    } finally {
      setLoading(false);
    }
  };

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
            Administra productores, fincas, cultivos, cosechas y actividades
            desde una plataforma moderna, segura y centralizada.
          </p>
        </div>

        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">👨‍🌾</div>
            <div>
              <h3>Productores</h3>
              <p>Registro y administración agrícola.</p>
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
              <p>Análisis y control de datos.</p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <div>
              <h3>Seguridad</h3>
              <p>Información protegida.</p>
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
            Inicia sesión para acceder al sistema.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Usuario"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                style={{ width: "auto", margin: 0 }}
              />
              Mostrar contraseña
            </label>

            {error && (
              <p
                role="alert"
                style={{
                  color: "red",
                  fontSize: "14px",
                  marginBottom: "10px",
                }}
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Validando..." : "Iniciar sesión"}
            </button>
          </form>

          <a href="#">¿Olvidaste tu contraseña?</a>

          <div className="separator">
            <span>o</span>
          </div>

          <button type="button" className="secondary-btn">
            Solicitar acceso
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;