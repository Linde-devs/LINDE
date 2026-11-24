// Cliente HTTP de la API de LINDE. Todas las pantallas llaman a la API a través de este archivo.
// La URL se puede cambiar con la variable VITE_API_URL (archivo .env); por defecto apunta a la API local.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5080/api'

export class ErrorApi extends Error {
  constructor(mensaje, estado, campo = null, tipo = null) {
    super(mensaje)
    this.estado = estado
    this.campo = campo
    // Tipo de error geométrico al cargar un polígono (RF-03), por ejemplo "Autointerseccion".
    this.tipo = tipo
  }
}

export async function solicitud(ruta, { metodo = 'GET', cuerpo, token, comoArchivo = false } = {}) {
  // Un archivo (FormData) se envía tal cual: el navegador arma el multipart y su encabezado.
  const esArchivo = cuerpo instanceof FormData
  const encabezados = {}
  if (cuerpo !== undefined && !esArchivo) encabezados['Content-Type'] = 'application/json'
  if (token) encabezados.Authorization = `Bearer ${token}`

  let respuesta
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : esArchivo ? cuerpo : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Verifica que la API esté en ejecución.', 0)
  }

  // RF-16: los archivos de los documentos llegan como binario (PDF o imagen), no como JSON.
  if (comoArchivo && respuesta.ok) return respuesta.blob()

  const texto = await respuesta.text()
  let datos = null
  try {
    datos = texto ? JSON.parse(texto) : null
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    const mensaje =
      datos?.error ??
      datos?.title ??
      (respuesta.status === 401
        ? 'Tu sesión expiró. Inicia sesión de nuevo.'
        : respuesta.status === 403
          ? 'Acceso denegado: tu rol no tiene permiso para esta acción.'
          : 'Ocurrió un error inesperado.')
    throw new ErrorApi(mensaje, respuesta.status, datos?.campo ?? null, datos?.tipo ?? null)
  }

  return datos
}
