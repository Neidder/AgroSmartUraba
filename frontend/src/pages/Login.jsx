import "./Login.css";

function Login() {
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
            Administra productores, fincas, cultivos, cosechas
            y actividades desde una plataforma moderna,
            segura y centralizada.
          </p>
        </div>

        <div className="features">

          <div className="feature-card">
            <div className="feature-icon">👨‍🌾</div>

            <div>
              <h3>Productores</h3>
              <p>
                Registro y administración de productores.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌱</div>

            <div>
              <h3>Cultivos</h3>
              <p>
                Seguimiento completo de cultivos.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>

            <div>
              <h3>Indicadores</h3>
              <p>
                Visualización y análisis de información.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>

            <div>
              <h3>Seguridad</h3>
              <p>
                Información protegida y confiable.
              </p>
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
            Inicia sesión para acceder al sistema AgroSmart.
          </p>

          <form>

            <input
              type="text"
              placeholder="Ingrese su usuario"
            />

            <input
              type="password"
              placeholder="Ingrese su contraseña"
            />

            <button type="submit">
              Iniciar sesión
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

          <div className="footer-logo">
            AgroSmart Urabá
          </div>

        </div>

      </div>
    </div>
  );
}

export default Login;