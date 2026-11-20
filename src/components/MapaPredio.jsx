import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Centro de Santa Cruz, para cuando el predio todavía no tiene geometría.
const SANTA_CRUZ = [-17.78, -63.18]

// Muestra el polígono o el punto del predio sobre el mapa base de OpenStreetMap.
// Al pasar el cursor, la esquina inferior izquierda muestra la latitud y la longitud de esa posición.
// Solo es una vista: el dibujo con clics llega con el RF-04.
// Las coordenadas llegan como { lon, lat } (orden GeoJSON); Leaflet usa [lat, lon].
export default function MapaPredio({ vertices }) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)

  // El mapa se crea una sola vez y se destruye al salir de la pantalla.
  useEffect(() => {
    const m = L.map(contenedor.current, { scrollWheelZoom: false }).setView(SANTA_CRUZ, 8)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    capa.current = L.layerGroup().addTo(m)

    // Coordenadas bajo el cursor, con 6 decimales como pide el RF-05.
    const Coordenadas = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', 'mapa-coordenadas')
        div.textContent = 'Pasa el cursor por el mapa para ver las coordenadas'
        return div
      },
    })
    const control = new Coordenadas({ position: 'bottomleft' }).addTo(m)
    const caja = control.getContainer()
    m.on('mousemove', (e) => {
      caja.textContent = `Lat. ${e.latlng.lat.toFixed(6)} · Long. ${e.latlng.lng.toFixed(6)}`
    })
    m.on('mouseout', () => {
      caja.textContent = 'Pasa el cursor por el mapa para ver las coordenadas'
    })

    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
    }
  }, [])

  // Cada vez que cambia la geometría se redibuja y se encuadra.
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    capa.current.clearLayers()

    if (!vertices || vertices.length === 0) {
      m.setView(SANTA_CRUZ, 8)
      return
    }

    const puntos = vertices.map((v) => [v.lat, v.lon])
    if (puntos.length === 1) {
      L.circleMarker(puntos[0], { radius: 8, color: '#1D5A73', weight: 2, fillColor: '#2F8FB0', fillOpacity: 0.6 })
        .bindTooltip(`${vertices[0].lat.toFixed(6)}, ${vertices[0].lon.toFixed(6)}`)
        .addTo(capa.current)
      m.setView(puntos[0], 16)
    } else {
      const poligono = L.polygon(puntos, { color: '#15524A', weight: 3, fillColor: '#2E7D32', fillOpacity: 0.25 })
        .addTo(capa.current)
      m.fitBounds(poligono.getBounds(), { padding: [24, 24] })
    }
  }, [vertices])

  return <div ref={contenedor} className="mapa-predio" role="region" aria-label="Mapa del predio" />
}
