import { useState } from "react";
import {
  leerPreferencias,
  guardarPreferencias,
  restablecerPreferencias,
} from "../utils/preferencias";

export function usePreferencias() {
  const [preferencias, setPreferencias] = useState(leerPreferencias);

  function cambiar(clave, valor) {
    const nuevas = { ...preferencias, [clave]: valor };
    setPreferencias(nuevas);
    guardarPreferencias(nuevas);
  }

  function restablecer() {
    setPreferencias(restablecerPreferencias());
  }

  return { preferencias, cambiar, restablecer };
}