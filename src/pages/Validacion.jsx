import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import Encabezado from '../components/Encabezado.jsx'
import SelectorPredio from '../components/SelectorPredio.jsx'

const textoBoton = { predios: 'Completar datos', poligonos: 'Ir a polígonos', documentos: 'Ir a documentos' }

// Enlace a la pantalla donde se completa un requisito. Los datos del predio se editan desde Gestionar predios.
export function enlaceRequisito(r, predioId) {
  if (r.ruta === 'predios') return { to: '/app/predios', state: { editar: predioId } }
  return { to: `/app/${r.ruta}?predio=${predioId}` }
}

// CU-07. Validar predio: revisa que el predio tenga todos los datos y documentos necesarios para enviarlo a revisión.
// No juzga si son correctos: eso lo hacen las cuatro capas al enviarlo (CU-06). No guarda nada ni cambia el estado.
// La lista cambia según el predio: con más de 4 ha se exige polígono y fuera de la Ley 741 se piden los documentos de la ABT.
export default function Validacion({ cu }) {
  const { api, usuarioActual } = useAuth()
  const [parametros, setParametros] = useSearchParams()

  const [predios, setPredios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [revision, setRevision] = useState(null)
  const [error, setError] = useState('')

  const seleccionado = Number(parametros.get('predio')) || predios[0]?.id
  const predio = predios.find((p) => p.id === seleccionado)

  useEffect(() => {
    api('/predios')
      .then(setPredios)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [api])

  const revisar = useCallback(
    async (id) => {
      setError('')
      try {
        setRevision(await api(`/predios/${id}/requisitos`))
      } catch (e) {
        setRevision(null)
        setError(e.message)
      }
    },
    [api],
  )

  useEffect(() => {
    if (seleccionado) revisar(seleccionado)
  }, [seleccionado, revisar])

  if (cargando) return <p className="panel-vacio">Cargando…</p>

  if (predios.length === 0) {
    return (
      <>
        <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
        <div className="vacio">
          <h2>No tienes predios para validar</h2>
          <p>Registra un predio primero.</p>
          <Link to="/app/predios" state={{ nuevo: true }} className="btn btn-primario espacio-arriba">Registrar predio</Link>
        </div>
      </>
    )
  }

  const r = revision?.predioId === seleccionado ? revision : null
  const pendientes = r ? r.requisitos.filter((x) => !x.cumplido).length : 0
  const yaEnviado = predio?.estado === 'Aprobado'

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />

      <SelectorPredio predios={predios} valor={seleccionado} onChange={(id) => setParametros({ predio: String(id) })}
        mostrarProductor={usuarioActual.rol === ADMIN} />

      {error && <div className="mensaje mensaje-error">{error}</div>}

      {r && (
        <section className="panel">
          <div className="panel-cabecera">
            <h2>{predio?.nombre}</h2>
            {r.completo && !yaEnviado && (
              <Link to={`/app/envio?predio=${seleccionado}&enviar=1`} className="btn btn-primario">
                <Send size={16} />
                Enviar a revisión
              </Link>
            )}
          </div>

          <div className={`mensaje ${r.completo ? 'mensaje-exito' : 'mensaje-aviso'}`}>
            {yaEnviado
              ? 'El predio ya está aprobado. Si corriges algo, vuelve a «Registrado» y tendrás que enviarlo de nuevo.'
              : r.completo
                ? 'El predio tiene todo lo necesario: ya puedes enviarlo a revisión, donde se comprobará que los datos sean correctos.'
                : `Faltan ${pendientes} ${pendientes === 1 ? 'requisito' : 'requisitos'} para poder enviarlo a revisión.`}
          </div>

          <ul className="requisitos">
            {r.requisitos.map((x) => (
              <li key={x.clave} className={x.cumplido ? 'cumplido' : 'pendiente'}>
                {x.cumplido ? <CheckCircle2 size={20} aria-label="Cumplido" /> : <XCircle size={20} aria-label="Pendiente" />}
                <div className="requisito-texto">
                  <strong>{x.nombre}</strong>
                  <span>{x.detalle}</span>
                </div>
                {!x.cumplido && (
                  <Link {...enlaceRequisito(x, seleccionado)} className="btn btn-secundario btn-chico">
                    {textoBoton[x.ruta] ?? 'Completar'}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <p className="nota">
            Aquí solo se revisa que no falte nada. Al enviar a revisión, las cuatro capas comprueban si los datos son
            correctos: que no se superponga con otro predio, que el título corresponda al productor y cubra el polígono,
            que el uso de suelo esté autorizado y la cobertura satelital.
          </p>
        </section>
      )}
    </>
  )
}
