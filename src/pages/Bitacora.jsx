import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Encabezado from '../components/Encabezado.jsx'
import Campo from '../components/Campo.jsx'
import Etiqueta from '../components/Etiqueta.jsx'

const fechaHora = (f) => new Date(f).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'medium' })
const POR_PAGINA = 50

// Nombres legibles de las entidades que audita la API.
const entidades = {
  Predio: 'Predios',
  Poligono: 'Polígonos',
  Documento: 'Documentos',
  CapaReferencia: 'Capas de referencia',
  InspeccionCampo: 'Inspecciones de campo',
  Parametros: 'Parámetros',
}

// El resultado es "Correcto", "Rechazado: motivo" o, en un envío a revisión, "EstadoResultante: mensaje".
function Resultado({ texto }) {
  if (texto === 'Correcto') return <span className="etiqueta etiqueta-exito">Correcto</span>
  const separador = texto.indexOf(':')
  const inicio = separador > 0 ? texto.slice(0, separador) : texto
  const detalle = separador > 0 ? texto.slice(separador + 1).trim() : ''
  const insignia = inicio === 'Rechazado'
    ? <span className="etiqueta etiqueta-error">Rechazado</span>
    : inicio === 'Registrado'
      ? <span className="etiqueta etiqueta-error">Devuelto</span>
      : <Etiqueta valor={inicio} />
  return <>{insignia}{detalle && <div className="nota-chica">{detalle}</div>}</>
}

// Los valores anteriores se guardan como JSON en una línea; aquí se muestran ordenados para leerlos.
function formatear(json) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

// RNF-05. Bitácora de auditoría: la llenan los decoradores ...Auditado de la API (patrón Decorator) cada vez que
// alguien crea, cambia o borra algo, y también cuando la operación se rechaza. Solo la ve el administrador.
export default function Bitacora({ cu }) {
  const { api } = useAuth()
  const [registros, setRegistros] = useState(null)
  const [error, setError] = useState('')
  const [entidad, setEntidad] = useState('')
  const [texto, setTexto] = useState('')
  const [soloRechazados, setSoloRechazados] = useState(false)
  const [mostrar, setMostrar] = useState(POR_PAGINA)

  useEffect(() => {
    api('/bitacora').then(setRegistros).catch((e) => setError(e.message))
  }, [api])

  const presentes = useMemo(() => [...new Set((registros ?? []).map((r) => r.entidad))].sort(), [registros])

  const filtrados = useMemo(() => {
    const t = texto.trim().toLowerCase()
    return (registros ?? []).filter((r) =>
      (!entidad || r.entidad === entidad) &&
      (!soloRechazados || r.resultado.startsWith('Rechazado')) &&
      (!t || `${r.usuario} ${r.operacion} ${r.entidadId ?? ''} ${r.resultado}`.toLowerCase().includes(t)))
  }, [registros, entidad, texto, soloRechazados])

  useEffect(() => setMostrar(POR_PAGINA), [entidad, texto, soloRechazados])

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
      {error && <div className="mensaje mensaje-error">{error}</div>}

      <section className="panel">
        <div className="fila">
          <Campo name="busqueda" etiqueta="Buscar" valor={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder="Usuario, operación o resultado" autoComplete="off" />
          <Campo name="entidad" etiqueta="Entidad" valor={entidad} onChange={(e) => setEntidad(e.target.value)}>
            <option value="">Todas</option>
            {presentes.map((e) => <option key={e} value={e}>{entidades[e] ?? e}</option>)}
          </Campo>
        </div>
        <div>
          <label className="casilla">
            <input type="checkbox" checked={soloRechazados} onChange={(e) => setSoloRechazados(e.target.checked)} />
            Solo rechazados
          </label>
        </div>

        {!registros && !error && <p className="panel-vacio">Cargando…</p>}
        {registros && (
          <p className="nota">
            Mostrando {Math.min(mostrar, filtrados.length)} de {filtrados.length} registros
            {filtrados.length !== registros.length ? ` (${registros.length} en total)` : ''}, del más reciente al más antiguo.
          </p>
        )}

        {filtrados.length > 0 && (
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Operación</th>
                <th>Entidad</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, mostrar).map((r) => (
                <tr key={r.id}>
                  <td className="sin-salto">{fechaHora(r.fecha)}</td>
                  <td>{r.usuario}</td>
                  <td>
                    {r.operacion}
                    {r.valoresAnteriores && (
                      <details className="valores-anteriores">
                        <summary>Valores anteriores</summary>
                        <pre>{formatear(r.valoresAnteriores)}</pre>
                      </details>
                    )}
                  </td>
                  <td>{entidades[r.entidad] ?? r.entidad}{r.entidadId ? ` · ${r.entidadId}` : ''}</td>
                  <td><Resultado texto={r.resultado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {registros && filtrados.length === 0 && <p className="panel-vacio">No hay registros con esos filtros.</p>}
        {mostrar < filtrados.length && (
          <div className="panel-pie">
            <button type="button" className="btn btn-secundario" onClick={() => setMostrar(mostrar + POR_PAGINA)}>Ver más</button>
          </div>
        )}
      </section>
    </>
  )
}
