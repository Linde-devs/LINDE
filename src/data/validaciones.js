import { municipiosPorDepartamento } from './divisionPolitica.js'

// Validaciones del lado del navegador. Son las mismas reglas que aplica la API: aquí solo sirven para
// avisar antes de enviar. La API vuelve a validar todo y es la que decide.

const CI_NIT = /^\d{5,12}(-[0-9A-Za-z]{1,2})?$/
const RUNPA = /^[0-9A-Za-z-]{1,20}$/
const TELEFONO = /^\+?\d{7,12}$/
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// RF-01
export function validarProductor(d, { conCuenta = false } = {}) {
  const errores = {}
  if (!d.nombre.trim()) errores.nombre = 'Ingresa el nombre.'
  if (!d.apellido.trim()) errores.apellido = 'Ingresa el apellido.'
  if (!d.ci.trim()) errores.ci = 'Ingresa el CI o NIT.'
  else if (!CI_NIT.test(d.ci.trim())) errores.ci = 'El CI o NIT debe tener entre 5 y 12 dígitos (complemento opcional, por ejemplo 7845123-1A).'
  if (d.runpa.trim() && !RUNPA.test(d.runpa.trim())) errores.runpa = 'Solo letras, números y guiones (hasta 20).'
  if (!TELEFONO.test(d.telefono.replace(/\s/g, ''))) errores.telefono = 'El teléfono debe tener entre 7 y 12 dígitos.'
  if (!d.municipio.trim()) errores.municipio = 'Ingresa el municipio.'

  if (conCuenta) {
    if (!d.correo.trim()) errores.correo = 'Ingresa el correo.'
    else if (!CORREO.test(d.correo.trim())) errores.correo = 'El correo no es válido.'
    if (d.contrasena.length < 8) errores.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
    if (d.confirmar !== undefined && d.confirmar !== d.contrasena) errores.confirmar = 'Las contraseñas no coinciden.'
  }
  return errores
}

function tieneMasDeDosDecimales(texto) {
  const partes = String(texto).replace(',', '.').split('.')
  return partes.length === 2 && partes[1].length > 2
}

export function numero(texto) {
  return Number(String(texto).replace(',', '.'))
}

// Compara sin mayúsculas ni tildes, igual que la API. Devuelve el nombre oficial del municipio o undefined.
const normalizar = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
export function municipioDe(departamento, municipio) {
  return (municipiosPorDepartamento[departamento] ?? []).find((m) => normalizar(m) === normalizar(municipio))
}

// RF-02: sin productor o sin superficie declarada no se guarda; la superficie acepta 2 decimales.
export function validarPredio(d, { requiereProductor = false } = {}) {
  const errores = {}
  if (requiereProductor && !d.productorId) errores.productorId = 'Selecciona el productor.'
  if (!d.nombre.trim()) errores.nombre = 'Ingresa el nombre del predio.'
  if (!d.departamento) errores.departamento = 'Selecciona el departamento.'
  if (!d.municipio.trim()) errores.municipio = 'Ingresa el municipio.'
  else if (d.departamento && !municipioDe(d.departamento, d.municipio))
    errores.municipio = `No es un municipio de ${d.departamento}. Elige uno de la lista.`
  if (!d.cultivo.trim()) errores.cultivo = 'Ingresa el cultivo.'

  const superficie = numero(d.superficieDeclaradaHa)
  if (!String(d.superficieDeclaradaHa).trim()) errores.superficieDeclaradaHa = 'Ingresa la superficie declarada.'
  else if (!(superficie > 0)) errores.superficieDeclaradaHa = 'La superficie debe ser mayor a cero.'
  else if (tieneMasDeDosDecimales(d.superficieDeclaradaHa)) errores.superficieDeclaradaHa = 'Máximo 2 decimales.'

  if (String(d.desmonteDeclaradoHa).trim()) {
    const desmonte = numero(d.desmonteDeclaradoHa)
    if (!(desmonte >= 0)) errores.desmonteDeclaradoHa = 'El desmonte no puede ser negativo.'
    else if (tieneMasDeDosDecimales(d.desmonteDeclaradoHa)) errores.desmonteDeclaradoHa = 'Máximo 2 decimales.'
    else if (superficie > 0 && desmonte > superficie) errores.desmonteDeclaradoHa = 'No puede ser mayor que la superficie.'
  }
  if (d.numeroTituloInra.trim().length > 30) errores.numeroTituloInra = 'Hasta 30 caracteres.'

  // Título del INRA: se puede completar después, pero si se llena debe ser válido.
  const ci = (d.titularCi ?? '').trim()
  const titulada = String(d.superficieTituladaHa ?? '').trim()
  if (ci && !/^\d{5,10}$/.test(ci)) errores.titularCi = 'El CI debe tener de 5 a 10 dígitos.'
  if (titulada && !(numero(titulada) > 0)) errores.superficieTituladaHa = 'Debe ser mayor a cero.'
  if ((ci || titulada) && !d.numeroTituloInra.trim()) errores.numeroTituloInra = 'Escribe el número de título.'
  return errores
}

// RF-05: un punto se registra con latitud y longitud de 6 decimales.
const SEIS_DECIMALES = /^-?\d{1,3}\.\d{6,}$/

export function validarPunto(lat, lon) {
  const errores = {}
  if (!SEIS_DECIMALES.test(lat.trim())) errores.lat = 'Escribe la latitud con 6 decimales (por ejemplo -17.456789).'
  else if (Math.abs(Number(lat)) > 90) errores.lat = 'La latitud debe estar entre -90 y 90.'
  if (!SEIS_DECIMALES.test(lon.trim())) errores.lon = 'Escribe la longitud con 6 decimales (por ejemplo -63.123456).'
  else if (Math.abs(Number(lon)) > 180) errores.lon = 'La longitud debe estar entre -180 y 180.'

  // Bolivia no tiene mar: fuera de este rango el punto cae en el océano o en otro país. Es un primer filtro rápido;
  // la API revisa además el límite exacto del país (Geometria/LimiteBolivia.cs).
  if (!errores.lat && !errores.lon) {
    const la = Number(lat)
    const lo = Number(lon)
    if (la > 0 || lo > 0) {
      errores.lat = 'En Bolivia la latitud y la longitud son negativas. Revisa que no falte el signo menos.'
    } else if (la < -23 || la > -9.6) {
      errores.lat = Math.abs(la) > 50
        ? 'Parece que la latitud y la longitud están invertidas: la latitud va primero (por ejemplo -17.78).'
        : 'La latitud está fuera de Bolivia (entre -9.6 y -23).'
    } else if (lo < -69.7 || lo > -57.4) {
      errores.lon = 'La longitud está fuera de Bolivia (entre -57.4 y -69.7).'
    }
  }
  return errores
}
