import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import Encabezado from '../components/Encabezado.jsx'
import Etiqueta from '../components/Etiqueta.jsx'
import SelectorPredio from '../components/SelectorPredio.jsx'
import { nombresCapa } from '../components/VistaExpediente.jsx'

const plural = (n) => `${n} ${n === 1 ? 'alerta pendiente' : 'alertas pendientes'}`

// CU-08. Alertas pendientes de un predio, de mayor a menor prioridad (RF-13). Se elige el predio arriba; al entrar se
// muestra el primero que tiene alertas. El productor ve sus predios; el administrador, todos. Las alertas se cierran
// solas al corregir y reenviar el predio.
export default function Alertas({ cu }) {
  const { api, usuarioActual } = useAuth()
  const [parametros, setParametros] = useSearchParams()
  const [predios, setPredios] = useState([])
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api('/predios'), api('/alertas')])
      .then(([p, a]) => {
        setPredios(p)
        setAlertas(a)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [api])

  // Cuántas alertas pendientes tiene cada predio, para elegir uno al entrar y para el resumen.
  const porPredio = useMemo(() => {
    const cuenta = new Map()
    alertas.forEach((a) => cuenta.set(a.predioId, (cuenta.get(a.predioId) ?? 0) + 1))
    return cuenta
  }, [alertas])

  const seleccionado = Number(parametros.get('predio')) || predios.find((p) => porPredio.has(p.id))?.id || predios[0]?.id
  const predio = predios.find((p) => p.id === seleccionado)
  const delPredio = alertas.filter((a) => a.predioId === seleccionado)
  const otros = [...porPredio.keys()].filter((id) => id !== seleccionado).length

  if (cargando) return <p className="panel-vacio">Cargando…</p>

  if (predios.length === 0) {
    return (
      <>
        <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
        <div className="vacio">
          <h2>No tienes predios</h2>
          <p>Las alertas aparecen al enviar un predio a revisión.</p>
          <Link to="/app/predios" state={{ nuevo: true }} className="btn btn-primario espacio-arriba">Registrar predio</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />

      <SelectorPredio predios={predios} valor={seleccionado} onChange={(id) => setParametros({ predio: String(id) })}
        mostrarProductor={usuarioActual.rol === ADMIN} />

      {error && <div className="mensaje mensaje-error">{error}</div>}

      <section className="panel">
        <div className="panel-cabecera">
          <h2>{predio?.nombre}</h2>
          {delPredio.length > 0 && (
            <Link to={`/app/revision?predio=${seleccionado}`} className="btn btn-secundario">Ver en la vista para revisión</Link>
          )}
        </div>

        {delPredio.length === 0 ? (
          <p className="panel-vacio">
            {predio?.estado === 'Registrado'
              ? 'Este predio no tiene alertas: todavía no se envió a revisión desde su último cambio.'
              : 'Este predio no tiene alertas pendientes.'}
          </p>
        ) : (
          <>
            <p className="panel-texto">{plural(delPredio.length)}, de mayor a menor prioridad.</p>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Prioridad</th>
                    <th>Capa</th>
                    <th>Detalle</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {delPredio.map((a) => (
                    <tr key={a.id}>
                      <td><Etiqueta valor={a.prioridad} /></td>
                      <td>{nombresCapa[a.capa] ?? a.capa}</td>
                      <td>{a.mensaje}</td>
                      <td>{new Date(a.fecha).toLocaleDateString('es-BO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {otros > 0 && (
          <p className="nota">
            {otros === 1 ? 'Otro predio tiene' : `Otros ${otros} predios tienen`} alertas pendientes: elígelo en el buscador de arriba.
          </p>
        )}
        <p className="nota">
          Para cerrar una alerta corrige el dato del predio (polígono, documentos o superficie) y vuelve a enviarlo a revisión.
        </p>
      </section>
    </>
  )
}
