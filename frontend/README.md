# Frontend de AgroSmart Urabá

Interfaz web construida con React, React Router y Vite. Los estilos se
implementan con CSS propio; Tailwind CSS no forma parte de las dependencias.

## Requisitos

- Node.js `^20.19.0` o `>=22.12.0`.
- npm.

## Desarrollo local

Desde esta carpeta instala las dependencias:

```powershell
npm install
```

Configura la dirección del backend copiando `.env.example` a `.env` y
ajustando el valor según tu entorno:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

En PowerShell puedes crear el archivo local con:

```powershell
Copy-Item .env.example .env
```

`.env` está excluido de Git; `.env.example` sí se conserva versionado.

Inicia la aplicación:

```powershell
npm run dev
```

Otros comandos disponibles:

```powershell
npm run build
npm run preview
npm run lint
```

La URL del backend se configura en `src/services/api.js`. En desarrollo,
Django debe permitir CORS para el origen de Vite.
