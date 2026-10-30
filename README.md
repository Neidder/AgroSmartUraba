# AgroSmart Urabá

Plataforma web para gestionar y hacer seguimiento a información agrícola de
pequeños productores de Urabá.

## Tecnologías

- **Backend:** Django, Django REST Framework y MySQL.
- **Frontend:** React, React Router y Vite.
- **Comunicación:** API REST con JSON; Axios y Fetch en el navegador.

## Estructura

```text
backend/
  config/          Configuración Django y rutas principales de la API
  usuarios/        Usuarios, roles, acceso y recuperación de contraseña
  productores/     Productores
  fincas/          Fincas asociadas a productores
  cultivos/        Tipos de cultivo y lotes
  actividades/     Actividades agrícolas asociadas a lotes
  cosechas/        Producción cosechada por lote
  economia/        Costos de producción y pérdidas agrícolas
  manage.py
frontend/
  src/
    components/    Navegación y protección de rutas
    layouts/       Estructura general de páginas autenticadas
    pages/         Vistas de la aplicación
    routes/        Rutas del frontend
    services/      Llamadas de autenticación a la API
    styles/        Hojas de estilo
    assets/        Imágenes y otros recursos
  vite.config.js
```

Cada aplicación Django contiene sus modelos, serializadores, vistas, rutas y
migraciones.

## Funcionalidades

### Backend

- Inicio de sesión con token.
- Solicitud pública de acceso, guardada para revisión.
- Recuperación de contraseña por correo y cambio de contraseña con enlace
  temporal.
- Endpoints CRUD para productores, fincas, tipos de cultivo, lotes,
  actividades, cosechas, ventas, costos y pérdidas.
- Gestión de tipos de cultivo y lotes con validación de fechas, selección de
  registros activos y control del área total disponible de cada finca.
- Los tipos de cultivo y lotes se desactivan en vez de borrarse físicamente
  para conservar las relaciones y el historial de cosechas.
- Gestión autenticada de actividades por lote, asignación automática del
  responsable, filtros y archivo de registros sin borrarlos físicamente.
- Registro de ventas con varias cosechas por productor, validación de
  disponibilidad, anulación sin borrar el historial y reporte de ingresos.
- Administración de usuarios mediante API, restringida a usuarios autenticados
  cuyo rol sea `ADMINISTRADOR`.
- Filtros en varios recursos, por ejemplo por estado, finca, lote, categoría,
  tipo o fecha.

### Frontend

- Inicio de sesión, solicitud de acceso y flujos de recuperación de contraseña.
- Rutas autenticadas para el panel y los módulos agrícolas; el enlace a
  administración de usuarios se muestra a administradores.
- El módulo **Productores** permite listar, buscar, filtrar, crear, editar y
  activar o desactivar registros.
- El módulo **Ventas** permite registrar, consultar, editar y anular ventas de
  cosechas, con datos opcionales del comprador, totales automáticos e informes
  de ingresos por productor y producto.
- El módulo **Fincas** permite registrar, consultar, editar y activar o
  desactivar fincas.
- El módulo **Cultivos** permite administrar tipos de cultivo y lotes, buscar
  y filtrar registros, y controlar el área disponible de cada finca.
- El módulo **Actividades** permite registrar, consultar, editar y archivar
  labores por lote, con responsable automático, filtros por tipo, fechas y
  estado, y costos informativos que no se duplican en Economía.
- Las páginas de cosechas, economía y usuarios aún no implementan
  la gestión completa de sus datos desde el frontend.
- El panel muestra accesos a módulos y contadores de ejemplo; los contadores
  todavía no se consultan desde la API.

## Rutas principales de la API

Las rutas se sirven desde `http://127.0.0.1:8000`:

| Recurso | Rutas |
| --- | --- |
| Autenticación y acceso | `/api_usuarios/login/`, `/api_usuarios/solicitar-acceso/` |
| Recuperación de contraseña | `/api_usuarios/recuperar-contrasena/`, `/api_usuarios/restablecer-contrasena/` |
| Usuarios | `/api_usuarios/usuarios/` |
| Productores | `/api_productores/productores/` |
| Fincas | `/api_fincas/fincas/` |
| Cultivos y lotes | `/api_cultivos/tipos-cultivo/`, `/api_cultivos/lotes/` |
| Actividades | `/api_actividades/actividades/` |
| Cosechas | `/api_cosechas/cosechas/` |
| Ventas | `/api_ventas/ventas/`, `/api_ventas/ventas/opciones/`, `/api_ventas/ventas/reporte-ingresos/` |
| Economía | `/api_economia/costos-produccion/`, `/api_economia/perdidas-agricolas/` |

Los endpoints de usuarios requieren el encabezado
`Authorization: Token <token>` y el rol `ADMINISTRADOR`. Las API de productores,
fincas, cultivos, actividades y ventas requieren autenticación. Las API de
cosechas y economía todavía permiten acceso sin autenticación; revisa esos
permisos antes de publicar el sistema en un entorno expuesto.

## Requisitos

- Python y pip, compatibles con las dependencias de `backend/requirements.txt`.
- MySQL en ejecución y una base de datos creada para la aplicación.
- Node.js y npm.

## Configuración y ejecución local

### 1. Backend

Desde PowerShell, en la raíz del repositorio:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `backend/.env` con los datos locales de MySQL:

```dotenv
DJANGO_SECRET_KEY=una-clave-local-segura
DB_NAME=agrosmart_uraba
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_contrasena_mysql
DB_HOST=localhost
DB_PORT=3306
```

Crea la base de datos `agrosmart_uraba` en MySQL antes de ejecutar las
migraciones. Después, desde `backend/`:

```powershell
python manage.py migrate
python manage.py runserver
```

El API quedará disponible en `http://127.0.0.1:8000/`. Para enviar correos de
recuperación, configura además `EMAIL_HOST_USER` y `EMAIL_HOST_PASSWORD` en
`.env` con credenciales SMTP válidas.

### 2. Frontend

En una segunda terminal, desde la raíz del repositorio:

```powershell
cd frontend
npm install
npm run dev
```

Vite muestra en la terminal la dirección local de la aplicación (por defecto,
`http://localhost:5173`). Django permite solicitudes CORS desde
`http://localhost:5173` y `http://127.0.0.1:5173`. La dirección del backend se
configura en `frontend/.env` mediante `VITE_API_URL` (ver
`frontend/.env.example`). El frontend utiliza CSS propio; Tailwind CSS no está
instalado ni configurado.
