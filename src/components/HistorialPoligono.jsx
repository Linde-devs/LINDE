import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const fechaHora = (f) => new Date(f).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })

// RNF-05. Todas las versiones del polígono del predio, de la más nueva a la más vieja, con su autor, fecha y motivo.
// La API nunca sobrescribe un polígono: cada cambio clona la versión vigente (Prototype) y la anterior queda guardada.
// "Comparar" dibuja una versión anterior en gris debajo de la vigente.
export default function HistorialPoligono({ predioId, versionVigente, comparada, onComparar }) {
  const { api } = useAuth()
  const [versiones, setVersiones] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api(`/predios/${predioId}/poligono/historial`)
      .then((lista) => setVersiones([...lista].sort((a, b) => b.version - a.version)))
      .catch((e) => setError(e.message))
  }, [api, predioId, versionVigente])

  if (error) return <div className="mensaje mensaje-error">{error}</div>
  if (versiones.length === 0) return null

  return (
    <section className="panel">
      <h2 className="panel-titulo"><History size={18} />Historial del polígono</h2>
      <p className="panel-texto">
        Cada cambio crea una versión nueva y la anterior queda guardada con quién la hizo, cuándo y por qué.
        {versiones.length > 1 && ' Compara una versión anterior para verla en gris debajo de la vigente.'}
      </p>
      <table className="tabla">
        <thead>
          <tr>
            <th>Versión</th>
            <th>Fecha</th>
            <th>Autor</th>
            <th>Motivo</th>
            <th>Geometría</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {versiones.map((v) => (
            <tr key={v.id}>
              <td>{v.version}{v.vigente && <span className="etiqueta etiqueta-exito margen-izq">Vigente</span>}</td>
              <td>{fechaHora(v.fecha)}</td>
              <td>{v.autor}</td>
              <td>{v.motivo}</td>
              <td>{v.esPunto ? 'Punto' : `${v.vertices.length - 1} vértices · ${v.areaHa?.toLocaleString('es-BO')} ha`}</td>
              <td className="acciones-fila">
                {!v.vigente && (
                  <button type="button" className="enlace-chico boton-enlace"
                    onClick={() => onComparar(comparada?.id === v.id ? null : v)}>
                    {comparada?.id === v.id ? 'Quitar del mapa' : 'Comparar'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
