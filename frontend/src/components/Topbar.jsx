import { Search, Bell, ChevronDown } from "lucide-react";
import { useUsuario } from "../hooks/useUsuario";
import "../styles/Topbar.css";

function Topbar({ notificaciones = 0 }) {
  const { nombre, rol, inicial } = useUsuario();

  return (
    <header className="tb">
      <label className="tb-search">
        <Search size={17} />
        <input type="search" placeholder="Buscar en el sistema..." />
      </label>

      <div className="tb-right">
        <button type="button" className="tb-bell" aria-label="Notificaciones">
          <Bell size={20} />
          {notificaciones > 0 && <span className="tb-badge">{notificaciones}</span>}
        </button>

        <div className="tb-user">
          <div className="tb-avatar">{inicial}</div>
          <div className="tb-user-info">
            <strong>{nombre}</strong>
            <span>{rol}</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}

export default Topbar;