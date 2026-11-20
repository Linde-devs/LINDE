# LINDE

Frontend del Sistema de gestión de polígonos (React + Vite).

## Cómo ejecutarlo

Requisito: Node.js 20 o superior.

```
npm install
npm run dev
```

Luego abre http://localhost:5173 en el navegador.

## Qué incluye por ahora

- **Iniciar sesión** (`/login`) y **Registro de productor** (`/registro`), en pantalla dividida: formulario a la izquierda e imagen a la derecha. El registro pide nombres, apellidos, CI o NIT, RUNPA (opcional), teléfono, municipio, correo y contraseña, y muestra el código asignado.
- La cuenta del administrador viene cargada en la API (ver `backend/README.md`). LINDE tiene solo dos roles: Productor y Administrador.
- **Consulta pública** (`/consulta`): sin iniciar sesión, cualquiera escribe el código de un expediente y lo ve en modo lectura, con el CI enmascarado. Es lo que usan el técnico o el SENASAG, que no tienen cuenta. El login tiene un enlace.
- **Ventana principal** (`/app`), protegida: solo se entra con sesión iniciada.
  - Bienvenida con el nombre y lo que puede hacer su rol.
  - Descripción de en qué consiste LINDE, con una ilustración de parcelas.
  - Para el productor y el administrador: historial de predios con su estado y botón **Empezar** (o **Nuevo predio**), que abre el registro de predio.
- **Menú lateral por rol** (RF-11): cada usuario ve solo los casos de uso de su rol; el administrador ve todos. Si alguien escribe la dirección de una opción que no le corresponde, ve "Acceso denegado".
- **Gestionar productores** (CU-02): solo el administrador; registra, edita y elimina.
- **Gestionar predios** (CU-03): listado y formulario con nombre, municipio, cultivo, superficie (2 decimales), título INRA y desmonte.
- **Gestionar polígonos** (CU-04): el polígono o el punto sobre el mapa de OpenStreetMap (Leaflet; el dibujo con clics llega con el RF-04), carga de archivos GeoJSON o KML y registro de un punto con 6 decimales. Si el archivo no es válido, se muestra el tipo de error.
- **Enviar predio a revisión** (CU-06): ejecuta las cuatro validaciones y muestra el resultado de cada capa. Si hay alertas el predio queda "Con alertas" y se puede corregir y reenviar; si las cuatro capas están conformes queda "Aprobado".
- **Gestionar alertas** (CU-08): alertas pendientes de los predios del usuario, de mayor a menor prioridad.
- **Vista para revisión** (CU-09): en una sola pantalla, lo que vería un técnico verificador: alertas, mapa, datos declarados, documentos, resultado de cada capa y margen de error. Se puede imprimir.
- **Gestionar expedientes** (CU-10): genera el expediente del predio aprobado o con alertas, lo muestra, lo imprime o lo guarda como PDF (con el diálogo de impresión del navegador) y da el enlace a la consulta pública.
- Los demás casos de uso abren una pantalla "en construcción".

## Conexión con la API

Todas las pantallas usan la API de `backend/` (ASP.NET Core). Antes de abrir el frontend, ejecuta la API (`http://localhost:5080`).

- `src/api/cliente.js`: hace las peticiones a la API y convierte los errores en mensajes.
- `src/context/AuthContext.jsx`: registra, inicia y cierra sesión. Guarda el token en `sessionStorage`, así que la sesión se mantiene al recargar y se borra al cerrar la pestaña. También expone `api(ruta, opciones)`, que las pantallas usan para llamar a la API con el token.
- Si la API está en otra dirección, crea un archivo `.env` con `VITE_API_URL=http://otra-direccion/api`.

## Imagen del login

La foto de la derecha se lee de `public/login.jpg` (foto de Unsplash).
Para cambiarla, reemplaza ese archivo por otro con el mismo nombre.
Si el archivo no existe, se muestra la ilustración de `IlustracionPredios.jsx`.

## Estructura

```
public/
  login.jpg                        foto del login y el registro
src/
  assets/logo.png                  logo de LINDE
  components/
    AuthLayout.jsx                 pantalla dividida del login y el registro
    Campo.jsx                      campo de formulario con su error
    Encabezado.jsx                 título y acciones de cada pantalla
    Etiqueta.jsx                   estado del predio o de una validación
    IlustracionPredios.jsx         ilustración de parcelas en SVG
    Layout.jsx                     menú lateral (por rol) y barra superior
    ListaMunicipios.jsx            sugerencias de municipios
    RutaProtegida.jsx              bloquea /app sin sesión
    SelectorPredio.jsx             lista de predios del usuario
    MapaPredio.jsx                 polígono o punto sobre OpenStreetMap (Leaflet)
  api/cliente.js                   peticiones a la API
  context/AuthContext.jsx          registro, login y sesión (con la API)
  data/
    casosUso.js                    casos de uso del menú y roles
    validaciones.js                validaciones de los formularios
  pages/
    Login.jsx
    Registro.jsx                   registro de productor
    Principal.jsx                  ventana de inicio
    CasoUso.jsx                    elige la pantalla según el menú y el rol
    Productores.jsx                CU-02
    Predios.jsx                    CU-03
    Poligonos.jsx                  CU-04
    Envio.jsx                      CU-06
    Modulo.jsx                     pantalla genérica de los módulos pendientes
  styles/theme.css                 paleta Satelital y estilos
```
