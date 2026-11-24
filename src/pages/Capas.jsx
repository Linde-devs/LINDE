import { useCallback, useEffect, useState } from 'react'
import { Eye, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Campo from '../components/Campo.jsx'
import Encabezado from '../components/Encabezado.jsx'
import MapaCapa from '../components/MapaCapa.jsx'

export const tiposCapa = {
  TitulosInra: 'Títulos del INRA',
  AutorizacionesAbt: 'Autorizaciones de la ABT (POP y desmontes)',
}

const vacio = { tipo: 'TitulosInra', nombre: '', fuente: '' }
const fecha = (f) => new Date(f).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })

// CU-11. Gestionar capas de referencia: el administrador carga como archivo la capa de títulos del INRA y la de
// autorizaciones de la ABT. Al enviar un predio a revisión (RF-07), su polígono se cruza con la capa vigente de cada tipo.
// LINDE no se conecta en línea con el INRA ni con la ABT: sus datos entran como archivos GeoJSON.
export default function Capas({ cu }) {
  const { api } = useAuth()
  const [capas, setCapas] = useState([])
  const [datos, setDatos] = useState(vacio)
  const [archivo, setArchivo] = useState(null)
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [vista, setVista] = useState(null)

  const cargar = useCallback(() => api('/capas').then(setCapas).catch((e) => setError(e.message)), [api])
  useEffect(() => {
    cargar()
  }, [cargar])

  function cambiar(e) {
    setDatos({ ...datos, [e.target.name]: e.target.value })
    if (errores[e.target.name]) setErrores({ ...errores, [e.target.name]: undefined })
  }

  async function subir(e) {
    e.preventDefault()
    setAviso('')
    setError('')
    const encontrados = {}
    if (!datos.nombre.trim()) encontrados.nombre = 'Escribe un nombre para la capa.'
    if (!datos.fuente.trim()) encontrados.fuente = 'Indica la fuente (institución y fecha de corte).'
    if (!archivo) encontrados.archivo = 'Selecciona un archivo .geojson.'
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    const formulario = new FormData()
    formulario.append('tipo', datos.tipo)
    formulario.append('nombre', datos.nombre.trim())
    formulario.append('fuente', datos.fuente.trim())
    formulario.append('archivo', archivo)
    setCargando(true)
    try {
      const capa = await api('/capas', { metodo: 'POST', cuerpo: formulario })
      setAviso(`Capa "${capa.nombre}" cargada con ${capa.cantidadElementos} polígonos. Ahora es la vigente de ${tiposCapa[capa.tipo]}.`)
      setDatos(vacio)
      setArchivo(null)
      e.target.reset()
      await cargar()
      await ver(capa)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function ver(capa) {
    try {
      setVista({ capa, geojson: await api(`/capas/${capa.id}/geojson`) })
    } catch (err) {
      setError(err.message)
    }
  }

  async function eliminar(capa) {
    const nota = capa.vigente ? ' Sin capa vigente, el cruce usará solo los datos que declara el productor.' : ''
    if (!window.confirm(`¿Eliminar la capa "${capa.nombre}"?${nota}`)) return
    try {
      await api(`/capas/${capa.id}`, { metodo: 'DELETE' })
      if (vista?.capa.id === capa.id) setVista(null)
      setAviso(`Capa "${capa.nombre}" eliminada.`)
      await cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />

      {aviso && <div className="mensaje mensaje-exito">{aviso}</div>}
      {error && <div className="mensaje mensaje-error">{error}</div>}

      <form className="panel" onSubmit={subir} noValidate>
        <h2 className="panel-titulo"><Upload size={18} />Cargar una capa</h2>
        <p className="panel-texto">
          Archivo GeoJSON (FeatureCollection) en WGS84. Cada polígono necesita su número de título o de autorización
          (atributo <code>codigo</code> o <code>numero</code>); la capa del INRA puede traer además <code>titular_ci</code> y{' '}
          <code>superficie_ha</code>. La capa nueva reemplaza a la vigente del mismo tipo.
        </p>
        <div className="fila">
          <Campo name="tipo" etiqueta="Tipo de capa" valor={datos.tipo} onChange={cambiar}>
            {Object.entries(tiposCapa).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </Campo>
          <Campo name="nombre" etiqueta="Nombre" valor={datos.nombre} error={errores.nombre} onChange={cambiar}
            placeholder="Títulos INRA San Julián" />
        </div>
        <Campo name="fuente" etiqueta="Fuente" valor={datos.fuente} error={errores.fuente} onChange={cambiar}
          placeholder="INRA, base catastral con corte al 31/10/2026" />
        <input type="file" accept=".geojson,.json" className="archivo"
          onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setErrores({ ...errores, archivo: undefined }) }} />
        {errores.archivo && <small className="error-campo">{errores.archivo}</small>}
        <div className="panel-pie">
          <button type="submit" className="btn btn-primario" disabled={cargando}>
            {cargando ? 'Cargando…' : 'Cargar capa'}
          </button>
        </div>
      </form>

      <div className="panel">
        {capas.length === 0 ? (
          <p className="panel-vacio">
            Todavía no hay capas cargadas. Mientras no haya, la titularidad y el uso de suelo se comparan solo con los
            documentos que registra el productor.
          </p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nombre</th>
                  <th>Fuente</th>
                  <th className="numero">Polígonos</th>
                  <th>Cargada</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {capas.map((c) => (
                  <tr key={c.id}>
                    <td>{tiposCapa[c.tipo]}</td>
                    <td>{c.nombre}<br /><small>{c.archivo}</small></td>
                    <td>{c.fuente}</td>
                    <td className="numero">{c.cantidadElementos}</td>
                    <td>{fecha(c.fechaCarga)}<br /><small>{c.cargadaPor}</small></td>
                    <td>
                      <span className={`etiqueta etiqueta-${c.vigente ? 'exito' : 'neutra'}`}>{c.vigente ? 'Vigente' : 'Reemplazada'}</span>
                    </td>
                    <td className="acciones-fila">
                      {c.vigente && (
                        <button className="btn-icono" onClick={() => ver(c)} aria-label="Ver en el mapa" title="Ver en el mapa">
                          <Eye size={16} />
                        </button>
                      )}
                      <button className="btn-icono peligro" onClick={() => eliminar(c)} aria-label="Eliminar" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {vista && (
        <div className="panel">
          <h2 className="panel-titulo">{vista.capa.nombre}</h2>
          <p className="panel-texto">Pasa el cursor sobre un polígono para ver su número.</p>
          <MapaCapa geojson={vista.geojson} tipo={vista.capa.tipo} />
        </div>
      )}
    </>
  )
}
