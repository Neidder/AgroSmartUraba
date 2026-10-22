import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Productores from "../pages/Productores";
import Fincas from "../pages/Fincas";
import Cultivos from "../pages/Cultivos";
import Actividades from "../pages/Actividades";
import Cosechas from "../pages/Cosechas";
import Economia from "../pages/Economia";
import Usuarios from "../pages/Usuarios";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/productores" element={<Productores />} />
        <Route path="/fincas" element={<Fincas />} />
        <Route path="/cultivos" element={<Cultivos />} />
        <Route path="/actividades" element={<Actividades />} />
        <Route path="/cosechas" element={<Cosechas />} />
        <Route path="/economia" element={<Economia />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;