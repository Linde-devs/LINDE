import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FolderOpen, Printer, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import Encabezado from '../components/Encabezado.jsx'
import SelectorPredio from '../components/SelectorPredio.jsx'
import VistaExpediente from '../components/VistaExpediente.jsx'

const enviado = (p) => p.estado === 'Aprobado' || p.estado === 'ConAlertas'

// CU-10. El productor genera el expediente de su predio, aprobado o con alertas (RF-09).
// Puede mostrarlo en pantalla, imprimirlo o guardarlo como PDF, o dar el código para la consulta pública.
export default function Expedientes({ cu }) {
  const { api, usuarioActual } = useAuth()
  const [parametros, setParametros] = useSearchParams()

  const [predios, setPredios] = useState([])
  const [expedientes, setExpedientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  const seleccionado = Number(parametros.get('predio')) || predios[0]?.id
  const predio = predios.find((p) => p.id === seleccionado)
  const expediente = expedientes.find((e) => e.predioId === seleccionado)

  const cargar = useCallback(async () => {
    try {
      const [listaPredios, listaExpedientes] = await Promise.all([api('/predios'), api('/expedientes')])
      setPredios(listaPredios)
      setExpedientes(listaExpedientes)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [api])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function generar() {
    setError('')
    setGenerando(true)
    try {
      await api(`/expedientes/predio/${seleccionado}`, { metodo: 'POST' })
      await cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerando(false)
    }
  }

  if (cargando) return <p className="panel-vacio">Cargando…</p>

  if (predios.length === 0) {
    return (
      <>
        <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
        <div className="vacio">
          <h2>No tienes predios</h2>
          <p>Registra un predio, su polígono y envíalo a revisión para generar su expediente.</p>
          <Link to="/app/predios" state={{ nuevo: true }} className="btn btn-primario espacio-arriba">Registrar predio</Link>
        </div>
      </>
    )
  }

  // Si el predio cambió después de generar el expediente (por ejemplo, se corrigió y volvió a enviar), conviene regenerarlo.
  const desactualizado = expediente && predio && (expediente.estado === 'Conforme') !== (predio.estado === 'Aprobado')

  return (
    <>
      <div className="no-imprimir">
        <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
        <SelectorPredio
          predios={predios}
          valor={seleccionado}
          onChange={(id) => setParametros({ predio: String(id) })}
          mostrarProductor={usuarioActual.rol === ADMIN}
        />
        {error && <div className="mensaje mensaje-error">{error}</div>}

        <section className="panel">
          <div className="panel-cabecera">
            <h2>{predio?.nombre}</h2>
            <div className="acciones">
              {expediente && (
                <>
                  <a href={`/consulta/${expediente.codigo}`} target="_blank" rel="noreferrer" className="btn btn-secundario">
                    <ExternalLink size={16} />
                    Consulta pública
                  </a>
                  <button className="btn btn-secundario" onClick={() => window.print()}>
                    <Printer size={16} />
                    Imprimir o guardar PDF
                  </button>
                </>
              )}
              <button className="btn btn-primario" onClick={generar} disabled={generando || !predio || !enviado(predio)}>
                <FolderOpen size={16} />
                {generando ? 'Generando…' : expediente ? 'Volver a generar' : 'Generar expediente'}
              </button>
            </div>
          </div>
          {predio && !enviado(predio) && (
            <p className="nota">
              Primero envía el predio a revisión. <Link to={`/app/envio?predio=${predio.id}`}>Enviar a revisión</Link>
            </p>
          )}
          {predio && enviado(predio) && !expediente && (
            <p className="panel-texto">
              {predio.estado === 'Aprobado'
                ? 'El predio está aprobado. Genera el expediente para presentarlo.'
                : 'El predio tiene alertas. Puedes corregirlas y volver a enviarlo, o generar el expediente con las alertas para mostrárselo a un técnico.'}
            </p>
          )}
          {desactualizado && (
            <p className="nota">El estado del predio cambió desde que se generó este expediente. Vuelve a generarlo.</p>
          )}
          {expediente && (
            <p className="panel-texto">
              Comparte el código <strong>{expediente.codigo}</strong>: el técnico o el SENASAG pueden comprobarlo en la consulta
              pública sin tener cuenta en LINDE.
            </p>
          )}
        </section>
      </div>

      {expediente && <VistaExpediente expediente={expediente} />}
    </>
  )
}
