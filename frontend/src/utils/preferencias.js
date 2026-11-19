// Preferencias de apariencia: se guardan en el navegador y se aplican
// sobre <html> mediante atributos data-* que lee styles/Tema.css.

const CLAVE = "agrosmart_preferencias";

export const PREFERENCIAS_INICIALES = {
  tema: "claro", // claro | oscuro | auto
  tamano: "normal", // pequena | normal | grande | muygrande
  fuente: "predeterminada", // predeterminada | clasica | legible | monoespaciada
  acento: "verde", // verde | azul | morado | naranja
  contraste: "normal", // normal | alto
  animaciones: "normales", // normales | reducidas
  densidad: "comoda", // comoda | compacta
};

export const TAMANOS = {
  pequena: "87.5%",
  normal: "100%",
  grande: "112.5%",
  muygrande: "125%",
};

export function leerPreferencias() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE) || "{}");
    return { ...PREFERENCIAS_INICIALES, ...guardadas };
  } catch {
    return { ...PREFERENCIAS_INICIALES };
  }
}

export function temaResuelto(tema) {
  if (tema === "auto") {
    const oscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return oscuro ? "oscuro" : "claro";
  }
  return tema;
}

export function aplicarPreferencias(preferencias) {
  const raiz = document.documentElement;
  raiz.dataset.tema = temaResuelto(preferencias.tema);
  raiz.dataset.fuente = preferencias.fuente;
  raiz.dataset.acento = preferencias.acento;
  raiz.dataset.contraste = preferencias.contraste;
  raiz.dataset.animaciones = preferencias.animaciones;
  raiz.dataset.densidad = preferencias.densidad;
  raiz.style.fontSize = TAMANOS[preferencias.tamano] || TAMANOS.normal;
}

export function guardarPreferencias(preferencias) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(preferencias));
  } catch {
    // sin almacenamiento disponible: se aplican igual durante la sesión
  }
  aplicarPreferencias(preferencias);
}

export function restablecerPreferencias() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
  aplicarPreferencias(PREFERENCIAS_INICIALES);
  return { ...PREFERENCIAS_INICIALES };
}

// Se aplican apenas se carga la aplicación, antes de pintar las pantallas.
aplicarPreferencias(leerPreferencias());

// Con el tema "automático", acompaña los cambios del sistema operativo.
if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const actuales = leerPreferencias();
    if (actuales.tema === "auto") aplicarPreferencias(actuales);
  });
}