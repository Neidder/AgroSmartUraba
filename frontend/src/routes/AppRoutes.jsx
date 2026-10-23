
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

import RutaProtegida from "../components/RutaProtegida";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página pública */}
        <Route path="/" element={<Login />} />

        {/* Páginas para usuarios autenticados */}
        <Route element={<RutaProtegida />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/productores" element={<Productores />} />
          <Route path="/fincas" element={<Fincas />} />
          <Route path="/cultivos" element={<Cultivos />} />
          <Route path="/actividades" element={<Actividades />} />
          <Route path="/cosechas" element={<Cosechas />} />
          <Route path="/economia" element={<Economia />} />
        </Route>

        {/* Solo para administradores */}
        <Route
          element={
            <RutaProtegida rolesPermitidos={["ADMINISTRADOR"]} />
          }
        >
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
