
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Productores from "../pages/Productores";
import Fincas from "../pages/Fincas";
import Cultivos from "../pages/Cultivos";
import Actividades from "../pages/Actividades";
import Cosechas from "../pages/Cosechas";
import Economia from "../pages/Economia";
import Usuarios from "../pages/Usuarios";

import SolicitarAcceso from "../pages/SolicitarAcceso";
import RecuperarContrasena from "../pages/RecuperarContrasena";
import RestablecerContrasena from "../pages/RestablecerContrasena";

import RutaProtegida from "../components/RutaProtegida";
import MainLayout from "../layouts/MainLayout";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Login />} />
        <Route
          path="/solicitar-acceso"
          element={<SolicitarAcceso />}
        />
        <Route
          path="/recuperar-contrasena"
          element={<RecuperarContrasena />}
        />
        <Route
          path="/restablecer-contrasena"
          element={<RestablecerContrasena />}
        />

        {/* Módulos para usuarios autenticados */}
        <Route element={<RutaProtegida />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/productores" element={<Productores />} />
            <Route path="/fincas" element={<Fincas />} />
            <Route path="/cultivos" element={<Cultivos />} />
            <Route path="/actividades" element={<Actividades />} />
            <Route path="/cosechas" element={<Cosechas />} />
            <Route path="/economia" element={<Economia />} />
          </Route>
        </Route>

        {/* Usuarios: solo administradores, con la misma barra lateral */}
        <Route
          element={
            <RutaProtegida rolesPermitidos={["ADMINISTRADOR"]} />
          }
        >
          <Route element={<MainLayout />}>
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
