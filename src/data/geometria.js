// Cálculos aproximados para mostrar mientras se dibuja. La API vuelve a validar y calcula el área exacta.

// Área en hectáreas con una proyección local de áreas iguales (sirve para predios, no para países enteros).
export function areaHa(vertices) {
  if (vertices.length < 3) return 0
  const lat0 = (vertices.reduce((s, v) => s + v.lat, 0) / vertices.length) * (Math.PI / 180)
  const x = (v) => v.lon * 111320 * Math.cos(lat0)
  const y = (v) => v.lat * 110574
  let suma = 0
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    suma += x(a) * y(b) - x(b) * y(a)
  }
  return Math.abs(suma) / 2 / 10000
}

function cruzan(p1, p2, p3, p4) {
  const d = (a, b, c) => (c.lon - a.lon) * (b.lat - a.lat) - (b.lon - a.lon) * (c.lat - a.lat)
  const d1 = d(p3, p4, p1)
  const d2 = d(p3, p4, p2)
  const d3 = d(p1, p2, p3)
  const d4 = d(p1, p2, p4)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

// Revisa el contorno abierto (sin repetir el primer vértice). Devuelve el problema o null.
export function problemaContorno(vertices) {
  if (vertices.length < 3) return 'Marca al menos 3 vértices para cerrar el polígono.'
  const n = vertices.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const vecinos = j === i + 1 || (i === 0 && j === n - 1)
      if (vecinos) continue
      if (cruzan(vertices[i], vertices[(i + 1) % n], vertices[j], vertices[(j + 1) % n]))
        return `Los lados ${i + 1} y ${j + 1} se cruzan. Mueve o borra un vértice.`
    }
  }
  return null
}

// RF-04. Pide la ubicación al GPS del dispositivo (o la que estime el navegador en una computadora).
export function ubicacionActual() {
  return new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) {
      rechazar(new Error('Este navegador no permite obtener la ubicación.'))
      return
    }
    if (!window.isSecureContext) {
      rechazar(new Error('El navegador solo da la ubicación en páginas seguras (https o localhost).'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lon: p.coords.longitude, precisionM: p.coords.accuracy }),
      (e) => {
        const mensajes = {
          1: 'No diste permiso para usar tu ubicación. Actívalo en el navegador.',
          2: 'No se pudo obtener la ubicación. Revisa que el GPS esté encendido.',
          3: 'El GPS tardó demasiado en responder. Vuelve a intentarlo.',
        }
        rechazar(new Error(mensajes[e.code] ?? 'No se pudo obtener la ubicación.'))
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  })
}
