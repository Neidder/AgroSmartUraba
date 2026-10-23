import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    console.log("=== LOGIN ===");
    console.log("username:", username);
    console.log("password:", password);

    try {
      const data = await login(username, password);

      console.log("LOGIN EXITOSO");
      console.log(data);

      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "usuario",
        JSON.stringify(data.usuario)
      );

      navigate("/dashboard");

    } catch (error) {

      console.error("ERROR LOGIN");
      console.error(error);

      if (error.response) {
        console.error(
          "RESPUESTA SERVIDOR:",
          error.response.data
        );
      }

      setError(
        "Usuario o contraseña incorrectos"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      <div className="login-left">

        <div className="brand">
          <div className="brand-icon">
            🌿
          </div>

          <div>
            <h1>AgroSmart Urabá</h1>
            <span>Tecnología que impulsa el campo</span>
          </div>
        </div>

        <div className="hero-content">
          <h2>
            Gestión inteligente para el sector agrícola
          </h2>

          <p>
            Administra productores, fincas,
            cultivos, cosechas y actividades
            desde una plataforma moderna,
            segura y centralizada.
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

        <div className="location">
          📍 Urabá, Antioquia - Colombia
        </div>

      </div>

      <div className="login-right">

        <div className="login-card">

          <div className="login-logo">
            🌿
          </div>

          <h2>Bienvenido</h2>

          <p className="login-subtitle">
            Inicia sesión para acceder al sistema.
          </p>

          <form onSubmit={handleSubmit}>

            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            {error && (
              <p
                style={{
                  color: "red",
                  fontSize: "14px",
                  marginBottom: "10px",
                }}
              >
                {error}
              </p>
            )}

            <button type="submit">

              {loading
                ? "Validando..."
                : "Iniciar sesión"}

            </button>

          </form>

          <a href="#">
            ¿Olvidaste tu contraseña?
          </a>

          <div className="separator">
            <span>o</span>
          </div>

          <button
            type="button"
            className="secondary-btn"
          >
            Solicitar acceso
          </button>

        </div>

      </div>

    </div>
  );
}

export default Login;