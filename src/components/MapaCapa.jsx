import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const SANTA_CRUZ = [-17.78, -63.18]
const colores = {
  TitulosInra: { color: '#1D5A73', fillColor: '#2F8FB0' },
  AutorizacionesAbt: { color: '#8A5A00', fillColor: '#E0A526' },
}

// CU-11. Muestra los polígonos de una capa de referencia (GeoJSON) con su número de título o de autorización.
export default function MapaCapa({ geojson, tipo }) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)

  useEffect(() => {
    const m = L.map(contenedor.current, { scrollWheelZoom: false }).setView(SANTA_CRUZ, 8)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
    }
  }, [])

  useEffect(() => {
    const m = mapa.current
    if (!m) return
    capa.current?.remove()
    if (!geojson?.features?.length) {
      m.setView(SANTA_CRUZ, 8)
      return
    }
    const estilo = colores[tipo] ?? colores.TitulosInra
    capa.current = L.geoJSON(geojson, {
      style: { ...estilo, weight: 2, fillOpacity: 0.25 },
      onEachFeature: (f, l) => {
        const sup = f.properties.superficie_ha != null ? ` · ${f.properties.superficie_ha} ha` : ''
        l.bindTooltip(`${f.properties.codigo}${sup}`)
      },
    }).addTo(m)
    m.fitBounds(capa.current.getBounds(), { padding: [24, 24] })
  }, [geojson, tipo])

  return <div ref={contenedor} className="mapa-predio" role="region" aria-label="Mapa de la capa" />
}
