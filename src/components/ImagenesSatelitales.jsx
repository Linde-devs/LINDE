import { useState } from 'react'
import { Satellite } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

// Pasa una coordenada al sistema de la imagen (0 a 100 en cada eje), según el recuadro oeste, sur, este y norte.
function puntos(vertices, [oeste, sur, este, norte]) {
  return vertices
    .map((v) => `${((v.lon - oeste) / (este - oeste)) * 100},${((norte - v.lat) / (norte - sur)) * 100}`)
    .join(' ')
}

function Imagen({ titulo, imagen, vertices }) {
  return (
    <figure className="imagen-satelital">
      <div className="imagen-satelital-marco">
        <img src={imagen.datosUrl} alt={`${titulo}: ${imagen.periodo}`} />
        {/* El contorno del predio se dibuja encima con las mismas coordenadas que cubre la imagen. */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {vertices.length === 1 ? (
            <circle cx={((vertices[0].lon - imagen.limites[0]) / (imagen.limites[2] - imagen.limites[0])) * 100}
              cy={((imagen.limites[3] - vertices[0].lat) / (imagen.limites[3] - imagen.limites[1])) * 100} r="1.5" />
          ) : (
            <polygon points={puntos(vertices, imagen.limites)} />
          )}
        </svg>
      </div>
      <figcaption><strong>{titulo}</strong> · {imagen.periodo}</figcaption>
    </figure>
  )
}

// RF-08. Imágenes en color natural de Sentinel-2 del predio antes de la fecha de corte y ahora, para que el técnico
// vea a simple vista lo que la capa de cobertura resume en porcentajes. Se piden solo cuando se pulsa el botón,
// porque cada una tarda unos segundos y gasta cuota de Earth Engine (la API las guarda en caché).
export default function ImagenesSatelitales({ predioId, vertices }) {
  const { api } = useAuth()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    setCargando(true)
    setError('')
    try {
      setDatos(await api(`/predios/${predioId}/imagenes-satelitales`))
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-cabecera">
        <h2 className="panel-titulo"><Satellite size={18} />Imágenes satelitales</h2>
        {vertices?.length > 0 && (
          <button type="button" className="btn btn-secundario no-imprimir" onClick={cargar} disabled={cargando}>
            {cargando ? 'Pidiendo a Earth Engine…' : datos?.disponible ? 'Volver a cargar' : 'Ver imágenes'}
          </button>
        )}
      </div>
      {!vertices?.length && <p className="panel-texto">El predio todavía no tiene polígono ni punto.</p>}
      {vertices?.length > 0 && !datos && !error && (
        <p className="panel-texto">
          Compara el predio en 2020, antes de la fecha de corte, con la imagen más reciente. El contorno del predio
          aparece en amarillo.
        </p>
      )}
      {error && <div className="mensaje mensaje-error">{error}</div>}
      {datos && !datos.disponible && <div className="mensaje mensaje-info">{datos.mensaje}</div>}
      {datos?.disponible && (
        <>
          <div className="imagenes-satelitales">
            <Imagen titulo="Antes de la fecha de corte" imagen={datos.referencia} vertices={vertices} />
            <Imagen titulo="Ahora" imagen={datos.actual} vertices={vertices} />
          </div>
          <p className="nota">{datos.referencia.fuente}. Las imágenes son para comparar a simple vista; el porcentaje de bosque lo calcula la capa de cobertura.</p>
        </>
      )}
    </section>
  )
}
