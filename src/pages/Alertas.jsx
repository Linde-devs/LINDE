import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Encabezado from '../components/Encabezado.jsx'
import Etiqueta from '../components/Etiqueta.jsx'
import { nombresCapa } from '../components/VistaExpediente.jsx'

// CU-08. Alertas pendientes que generaron las validaciones, de mayor a menor prioridad (RF-13).
// El productor ve las de sus predios; el administrador, las de todos. Se cierran solas al corregir y reenviar el predio.
export default function Alertas({ cu }) {
  const { api } = useAuth()
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/alertas')
      .then(setAlertas)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [api])

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
      {error && <div className="mensaje mensaje-error">{error}</div>}

      <section className="panel">
        {cargando ? (
          <p className="panel-vacio">Cargando…</p>
        ) : alertas.length === 0 ? (
          <p className="panel-vacio">No hay alertas pendientes.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Prioridad</th>
                  <th>Predio</th>
                  <th>Capa</th>
                  <th>Detalle</th>
                  <th>Fecha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {alertas.map((a) => (
                  <tr key={a.id}>
                    <td><Etiqueta valor={a.prioridad} /></td>
                    <td>{a.predio}</td>
                    <td>{nombresCapa[a.capa] ?? a.capa}</td>
                    <td>{a.mensaje}</td>
                    <td>{new Date(a.fecha).toLocaleDateString('es-BO')}</td>
                    <td className="acciones-fila">
                      <Link to={`/app/revision?predio=${a.predioId}`}>Revisar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="nota">
          Para cerrar una alerta corrige el dato del predio (polígono, documentos o superficie) y vuelve a enviarlo a revisión.
        </p>
      </section>
    </>
  )
}
