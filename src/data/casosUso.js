import {
  Users,
  LandPlot,
  Hexagon,
  FileText,
  Send,
  ShieldCheck,
  Bell,
  Eye,
  FolderOpen,
  Layers,
  SlidersHorizontal,
  KeyRound,
  ScrollText,
} from 'lucide-react'

// Roles tal como los envía la API (RolUsuario).
export const ADMIN = 'Administrador'
export const PRODUCTOR = 'Productor'

// Casos de uso del diagrama general (versión corregida por el docente).
// roles: quién ve la opción en el menú (RF-11). En LINDE solo hay dos roles: Productor y Administrador.
// El técnico verificador y el SENASAG no tienen cuenta: reciben el expediente o lo consultan por su código.
export const casosUso = [
  // CU-01 lo cubre la pantalla de login, por eso no aparece en el menú.
  { codigo: 'CU-01', nombre: 'Iniciar sesión', ruta: null, grupo: null, icono: KeyRound, roles: [],
    descripcion: 'Acceso al sistema según el rol del usuario.' },
  { codigo: 'CU-02', nombre: 'Gestionar productores', ruta: 'productores', grupo: 'Registro', icono: Users,
    roles: [ADMIN],
    descripcion: 'Registrar, consultar, editar y eliminar productores.' },
  { codigo: 'CU-03', nombre: 'Gestionar predios', ruta: 'predios', grupo: 'Registro', icono: LandPlot,
    roles: [ADMIN, PRODUCTOR],
    descripcion: 'Datos del predio y su superficie declarada.' },
  { codigo: 'CU-04', nombre: 'Gestionar polígonos', ruta: 'poligonos', grupo: 'Registro', icono: Hexagon,
    roles: [ADMIN, PRODUCTOR],
    descripcion: 'Dibujar, importar GeoJSON o KML y ver versiones.' },
  { codigo: 'CU-05', nombre: 'Gestionar documentos', ruta: 'documentos', grupo: 'Registro', icono: FileText,
    roles: [ADMIN, PRODUCTOR],
    descripcion: 'Título de propiedad y autorización de uso de suelo.' },
  // En el menú, Validar predio va antes que Enviar a revisión: primero se completa, después se envía.
  { codigo: 'CU-07', nombre: 'Validar predio', ruta: 'validacion', grupo: 'Validación', icono: ShieldCheck,
    roles: [ADMIN, PRODUCTOR],
    descripcion: 'Revisa que el predio tenga todos los datos y documentos necesarios para enviarlo.' },
  { codigo: 'CU-06', nombre: 'Enviar predio a revisión', ruta: 'envio', grupo: 'Validación', icono: Send,
    roles: [ADMIN, PRODUCTOR],
    descripcion: 'Envía el predio a las cuatro validaciones.' },
  { codigo: 'CU-08', nombre: 'Gestionar alertas', ruta: 'alertas', grupo: 'Validación', icono: Bell,
    roles: [ADMIN, PRODUCTOR],
    descripcion: 'Alertas priorizadas generadas por las validaciones.' },
  { codigo: 'CU-09', nombre: 'Vista para revisión', ruta: 'revision', grupo: 'Validación', icono: Eye,
    roles: [ADMIN, PRODUCTOR],
    descripcion: 'Lo que vería un técnico verificador: alertas, mapa, documentos y capas.' },
  { codigo: 'CU-10', nombre: 'Gestionar expedientes', ruta: 'expedientes', grupo: 'Expedientes', icono: FolderOpen,
    roles: [ADMIN, PRODUCTOR],
    descripcion: 'Expediente del predio, conforme o con alertas, para mostrarlo o imprimirlo.' },
  { codigo: 'CU-11', nombre: 'Gestionar capas de referencia', ruta: 'capas', grupo: 'Administración', icono: Layers,
    roles: [ADMIN],
    descripcion: 'Capas de INRA y ABT usadas en las validaciones.' },
  { codigo: 'CU-12', nombre: 'Gestionar parámetros', ruta: 'parametros', grupo: 'Administración', icono: SlidersHorizontal,
    roles: [ADMIN],
    descripcion: 'Fecha de corte, umbrales y exenciones de la Ley 741.' },
  // No es un caso de uso del diagrama: es la consulta de la bitácora de auditoría (RNF-05).
  { codigo: 'RNF-05', nombre: 'Bitácora de auditoría', ruta: 'bitacora', grupo: 'Administración', icono: ScrollText,
    roles: [ADMIN],
    descripcion: 'Quién hizo cada operación, cuándo, con qué datos anteriores y si salió bien.' },
]

export const grupos = ['Registro', 'Validación', 'Expedientes', 'Administración']

export const nombresRol = {
  [ADMIN]: 'Administrador',
  [PRODUCTOR]: 'Productor',
}

export const descripcionesRol = {
  [ADMIN]: 'Como administrador tienes acceso a todos los módulos del sistema.',
  [PRODUCTOR]: 'Registra tus predios y sus polígonos, adjunta tus documentos y envíalos a revisión para obtener tu expediente.',
}

export function puedeVer(cu, rol) {
  return cu.roles.includes(rol)
}

export function casosUsoDeRol(rol) {
  return casosUso.filter((cu) => cu.ruta && puedeVer(cu, rol))
}
