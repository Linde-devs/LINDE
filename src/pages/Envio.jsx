import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { History, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import Encabezado from '../components/Encabezado.jsx'
import Etiqueta from '../components/Etiqueta.jsx'
import SelectorPredio from '../components/SelectorPredio.jsx'
import { enlaceRequisito } from './Validacion.jsx'

const nombresCapa = {
  Geometrica: 'Geometría y superposición',
  Titularidad: 'Titularidad (INRA)',
  UsoSuelo: 'Uso de suelo (ABT)',
  Cobertura: 'Cobertura satelital',
}

const etiquetasEstadoCapa = { Conforme: 'conforme', Alerta: 'alerta', Rechazado: 'rechazada' }

// Un predio con alertas se puede corregir y volver a enviar; uno aprobado ya no se modifica.
const editable = (p) => p.estado === 'Registrado' || p.estado === 'ConAlertas'

// CU-06. Envía el predio a las cuatro capas de validación. Si la geometría no es válida, el predio declara más de 4 ha
// con solo un punto (RF-05) o se superpone con otro predio sobre la tolerancia (RF-06), vuelve al productor con el motivo.
export default function Envio({ cu }) {
  const { api, usuarioActual } = useAuth()
  const [parametros, setParametros] = useSearchParams()

  const [predios, setPredios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [resultado, setResultado] = useState(null)
  const [envios, setEnvios] = useState([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [requisitos, setRequisitos] = useState(null)

  const seleccionado = Number(parametros.get('predio')) || predios[0]?.id
  const predio = predios.find((p) => p.id === seleccionado)

  const cargarPredios = useCallback(async () => {
    try {
      setPredios(await api('/predios'))
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [api])

  const cargarUltimo = useCallback(async (id) => {
    try {
      const [historial, req] = await Promise.all([api(`/predios/${id}/validaciones`), api(`/predios/${id}/requisitos`)])
      setResultado(historial[0] ?? null)
      setEnvios(historial)
      setRequisitos(req)
    } catch (e) {
      setError(e.message)
    }
  }, [api])

  useEffect(() => {
    cargarPredios()
  }, [cargarPredios])

  useEffect(() => {
    if (seleccionado) cargarUltimo(seleccionado)
  }, [seleccionado, cargarUltimo])

  function elegir(id) {
    setParametros({ predio: String(id) })
    setError('')
  }

  async function enviar() {
    setError('')
    setEnviando(true)
    try {
      setResultado(await api(`/predios/${seleccionado}/enviar`, { metodo: 'POST' }))
      await Promise.all([cargarPredios(), cargarUltimo(seleccionado)])
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) return <p className="panel-vacio">Cargando…</p>

  if (predios.length === 0) {
    return (
      <>
        <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
        <div className="vacio">
          <h2>No tienes predios para enviar</h2>
          <p>Registra un predio y su polígono primero.</p>
          <Link to="/app/predios" state={{ nuevo: true }} className="btn btn-primario espacio-arriba">Registrar predio</Link>
        </div>
      </>
    )
  }

  // CU-07: solo se envía si el predio tiene todos los requisitos.
  const req = requisitos?.predioId === seleccionado ? requisitos : null
  const pendientes = req ? req.requisitos.filter((r) => !r.cumplido) : []
  const puedeEnviar = predio && editable(predio) && req?.completo

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />

      <SelectorPredio predios={predios} valor={seleccionado} onChange={elegir} mostrarProductor={usuarioActual.rol === ADMIN} />

      {error && <div className="mensaje mensaje-error">{error}</div>}

      <section className="panel">
        <div className="panel-cabecera">
          <h2>{predio?.nombre}</h2>
          <button className="btn btn-primario" onClick={enviar} disabled={enviando || !puedeEnviar}>
            <Send size={16} />
            {enviando ? 'Validando…' : 'Enviar a revisión'}
          </button>
        </div>
        {predio && editable(predio) && pendientes.length > 0 && (
          <div className="mensaje mensaje-aviso">
            <p className="requisitos-titulo">
              Para enviarlo faltan {pendientes.length} {pendientes.length === 1 ? 'requisito' : 'requisitos'}
              {' '}(<Link to={`/app/validacion?predio=${predio.id}`}>ver todos en Validar predio</Link>):
            </p>
            <ul className="requisitos-faltantes">
              {pendientes.map((r) => (
                <li key={r.clave}>
                  <Link {...enlaceRequisito(r, predio.id)}>{r.nombre}</Link>: {r.detalle}
                </li>
              ))}
            </ul>
          </div>
        )}
        {predio && !editable(predio) && (
          <p className="nota">El predio está aprobado: las cuatro capas quedaron conformes. Ya puedes generar su expediente.</p>
        )}
        {predio && (predio.estado === 'ConAlertas' || predio.estado === 'Aprobado') && (
          <div className="acciones espacio-arriba">
            {predio.estado === 'ConAlertas' && (
              <Link to={`/app/revision?predio=${predio.id}`} className="btn btn-secundario">Ver en la vista para revisión</Link>
            )}
            <Link to={`/app/expedientes?predio=${predio.id}`} className="btn btn-secundario">Ir a expedientes</Link>
          </div>
        )}

        {resultado ? (
          <>
            <div className={`mensaje ${resultado.cortado ? 'mensaje-error' : 'mensaje-exito'}`}>{resultado.mensaje}</div>
            <ul className="capas">
              {resultado.capas.map((c) => (
                <li key={c.capa}>
                  <div className="capa-cabecera">
                    <strong>{nombresCapa[c.capa] ?? c.capa}</strong>
                    <Etiqueta valor={c.estado} />
                  </div>
                  <p>{c.mensaje}</p>
                </li>
              ))}
            </ul>
            <p className="nota">
              Validado el {new Date(resultado.fecha).toLocaleString('es-BO')} con la versión {resultado.versionPoligono} del polígono.
              El análisis satelital es informativo; LINDE no emite la certificación.
            </p>
          </>
        ) : (
          <p className="panel-vacio">Este predio todavía no se envió a revisión.</p>
        )}
      </section>

      {envios.length > 1 && (
        <section className="panel">
          <h2 className="panel-titulo"><History size={18} />Envíos anteriores</h2>
          <p className="panel-texto">
            Cada envío queda guardado con la versión del polígono que se revisó. Así se ve el ciclo de corregir y reenviar.
          </p>
          <table className="tabla">
            <thead>
              <tr>
                <th>N.º</th>
                <th>Fecha</th>
                <th>Polígono</th>
                <th>Resultado</th>
                <th>Capas</th>
              </tr>
            </thead>
            <tbody>
              {envios.map((e, i) => (
                <tr key={e.id}>
                  <td>{envios.length - i}</td>
                  <td className="sin-salto">{new Date(e.fecha).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>Versión {e.versionPoligono}</td>
                  <td>
                    {e.cortado
                      ? <span className="etiqueta etiqueta-error">Devuelto por la geometría</span>
                      : <Etiqueta valor={e.estadoResultante} />}
                  </td>
                  <td>
                    {e.capas.map((c) => `${nombresCapa[c.capa] ?? c.capa}: ${etiquetasEstadoCapa[c.estado] ?? c.estado}`).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
