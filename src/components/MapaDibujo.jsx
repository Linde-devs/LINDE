import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const SANTA_CRUZ = [-17.78, -63.18]

const icono = (n, primero) =>
  L.divIcon({ className: `vertice-dibujo${primero ? ' primero' : ''}`, html: String(n), iconSize: [22, 22] })

// RF-04. Mapa para dibujar el contorno del predio: cada clic agrega un vértice y los vértices se arrastran para
// ajustarlos. El polígono vigente, si lo hay, se muestra en gris como referencia.
// Es un componente controlado: los vértices ({ lon, lat, precisionM? }, sin repetir el primero) los guarda la pantalla.
// precisionM solo la tienen los vértices tomados del GPS (RF-04).
export default function MapaDibujo({ vertices, onChange, referencia, habilitado = true }) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capaDibujo = useRef(null)
  const capaReferencia = useRef(null)
  // El manejador del clic se crea una sola vez; con estas referencias siempre usa los valores actuales.
  const actual = useRef({ vertices, onChange, habilitado })
  actual.current = { vertices, onChange, habilitado }

  useEffect(() => {
    const m = L.map(contenedor.current, { doubleClickZoom: false }).setView(SANTA_CRUZ, 8)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    capaReferencia.current = L.layerGroup().addTo(m)
    capaDibujo.current = L.layerGroup().addTo(m)

    const Coordenadas = L.Control.extend({
      onAdd() {
        return L.DomUtil.create('div', 'mapa-coordenadas')
      },
    })
    const caja = new Coordenadas({ position: 'bottomleft' }).addTo(m).getContainer()
    caja.textContent = 'Haz clic para marcar cada vértice'
    m.on('mousemove', (e) => {
      caja.textContent = `Lat. ${e.latlng.lat.toFixed(6)} · Long. ${e.latlng.lng.toFixed(6)}`
    })

    m.on('click', (e) => {
      const { vertices: v, onChange: cambiar, habilitado: h } = actual.current
      if (!h) return
      cambiar([...v, { lat: Number(e.latlng.lat.toFixed(6)), lon: Number(e.latlng.lng.toFixed(6)) }])
    })

    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
    }
  }, [])

  // Polígono vigente como referencia; el mapa se encuadra en él mientras no se haya dibujado nada.
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    capaReferencia.current.clearLayers()
    if (!referencia || referencia.length < 2) return
    const forma = L.polygon(referencia.map((v) => [v.lat, v.lon]), {
      color: '#6B7280', weight: 2, dashArray: '6 6', fillOpacity: 0.05, interactive: false,
    }).addTo(capaReferencia.current)
    if (actual.current.vertices.length === 0) m.fitBounds(forma.getBounds(), { padding: [24, 24] })
  }, [referencia])

  // Dibujo en curso: contorno y un marcador numerado y arrastrable por vértice.
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    capaDibujo.current.clearLayers()
    const puntos = vertices.map((v) => [v.lat, v.lon])
    if (puntos.length >= 3) {
      L.polygon(puntos, { color: '#15524A', weight: 3, fillColor: '#2E7D32', fillOpacity: 0.25, interactive: false })
        .addTo(capaDibujo.current)
    } else if (puntos.length === 2) {
      L.polyline(puntos, { color: '#15524A', weight: 3, interactive: false }).addTo(capaDibujo.current)
    }
    vertices.forEach((v, i) => {
      const marcador = L.marker([v.lat, v.lon], { icon: icono(i + 1, i === 0), draggable: habilitado })
      // RF-04: los vértices del GPS muestran su precisión. Al arrastrarlo, el vértice pasa a ser manual y la pierde.
      marcador.bindTooltip(v.precisionM != null ? `Vértice ${i + 1} · GPS ±${v.precisionM} m` : `Vértice ${i + 1}`)
      marcador.on('dragend', () => {
        const p = marcador.getLatLng()
        const copia = [...actual.current.vertices]
        copia[i] = { lat: Number(p.lat.toFixed(6)), lon: Number(p.lng.toFixed(6)) }
        actual.current.onChange(copia)
      })
      marcador.addTo(capaDibujo.current)
    })
  }, [vertices, habilitado])

  // Cuando llega un vértice desde el GPS o se cargan los del polígono vigente, se encuadra todo el dibujo.
  const cantidad = vertices.length
  const ultimo = vertices[cantidad - 1]
  useEffect(() => {
    const m = mapa.current
    if (!m || cantidad === 0) return
    const limites = L.latLngBounds(actual.current.vertices.map((v) => [v.lat, v.lon]))
    if (!m.getBounds().contains(limites)) {
      if (cantidad === 1) m.setView([ultimo.lat, ultimo.lon], 17)
      else m.fitBounds(limites, { padding: [24, 24] })
    }
  }, [cantidad, ultimo])

  return <div ref={contenedor} className="mapa-predio mapa-dibujo" role="region" aria-label="Mapa para dibujar el predio" />
}
