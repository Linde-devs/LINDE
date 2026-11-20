import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileUp, MapPin, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import { validarPunto } from '../data/validaciones.js'
import Encabezado from '../components/Encabezado.jsx'
import Campo from '../components/Campo.jsx'
import SelectorPredio from '../components/SelectorPredio.jsx'
import MapaPredio from '../components/MapaPredio.jsx'

// Un predio con alertas se puede corregir y volver a enviar; uno aprobado ya no se modifica.
const editable = (p) => p.estado === 'Registrado' || p.estado === 'ConAlertas'

// Centroide del polígono (fórmula del área con signo, en grados). Sirve como coordenada de referencia del predio.
function centroide(vertices) {
  if (vertices.length === 1) return vertices[0]
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < vertices.length - 1; i++) {
    const a = vertices[i]
    const b = vertices[i + 1]
    const f = a.lon * b.lat - b.lon * a.lat
    area += f
    cx += (a.lon + b.lon) * f
    cy += (a.lat + b.lat) * f
  }
  area /= 2
  return { lon: cx / (6 * area), lat: cy / (6 * area) }
}

const seis = (n) => n.toFixed(6)

// CU-04. RF-03: carga del polígono desde un archivo GeoJSON o KML. RF-05: un punto basta hasta 4 ha.
// La API rechaza la geometría inválida en el momento de cargarla e indica el tipo de error.
// La superposición con otros predios (RF-06) se revisa al enviar el predio a revisión.
export default function Poligonos({ cu }) {
  const { api, usuarioActual } = useAuth()
  const [parametros, setParametros] = useSearchParams()

  const [predios, setPredios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [poligono, setPoligono] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [punto, setPunto] = useState({ lat: '', lon: '' })
  const [erroresPunto, setErroresPunto] = useState({})
  const [enviando, setEnviando] = useState(false)
  // Solo en predios de 4 ha o menos: el usuario elige entre cargar el polígono o registrar un punto.
  const [modo, setModo] = useState('poligono')

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

  const cargarPoligono = useCallback(async (id) => {
    try {
      setPoligono(await api(`/predios/${id}/poligono`))
    } catch (e) {
      if (e.estado === 404) setPoligono(null)
      else setError(e.message)
    }
  }, [api])

  useEffect(() => {
    cargarPredios()
  }, [cargarPredios])

  useEffect(() => {
    if (seleccionado) cargarPoligono(seleccionado)
  }, [seleccionado, cargarPoligono])

  function elegir(id) {
    setParametros({ predio: String(id) })
    setError('')
    setAviso('')
    setErroresPunto({})
    setPunto({ lat: '', lon: '' })
    setModo('poligono')
  }

  async function despues(guardado, origen) {
    setAviso(
      guardado.esPunto
        ? `Punto guardado (${origen}).`
        : `Polígono guardado (${origen}): ${guardado.areaHa?.toLocaleString('es-BO')} ha, versión ${guardado.version}.`,
    )
    setPoligono(guardado)
    await cargarPredios()
  }

  async function subirArchivo(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    if (!archivo) {
      setError('Selecciona un archivo .geojson, .json o .kml.')
      return
    }
    const formulario = new FormData()
    formulario.append('archivo', archivo)
    setEnviando(true)
    try {
      const guardado = await api(`/predios/${seleccionado}/poligono/importar`, { metodo: 'POST', cuerpo: formulario })
      await despues(guardado, archivo.name)
      setArchivo(null)
      e.target.reset()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function guardarPunto(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    const encontrados = validarPunto(punto.lat, punto.lon)
    setErroresPunto(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true)
    try {
      const guardado = await api(`/predios/${seleccionado}/poligono`, {
        metodo: 'PUT',
        cuerpo: { vertices: [{ lon: Number(punto.lon), lat: Number(punto.lat) }], motivo: null },
      })
      await despues(guardado, 'coordenadas')
      setPunto({ lat: '', lon: '' })
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
          <h2>Primero registra un predio</h2>
          <p>El polígono se registra para un predio ya creado.</p>
          <Link to="/app/predios" state={{ nuevo: true }} className="btn btn-primario espacio-arriba">Registrar predio</Link>
        </div>
      </>
    )
  }

  const requierePoligono = predio && predio.superficieDeclaradaHa > 4
  const sePuedeEditar = predio && editable(predio)
  const centro = poligono ? centroide(poligono.vertices) : null
  // RF-05: con más de 4 ha el punto nunca se acepta, así que solo se ofrece cargar el polígono.
  const formulario = requierePoligono ? 'poligono' : modo

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion}>
        {poligono && sePuedeEditar && (
          <Link to={`/app/validacion?predio=${seleccionado}`} className="btn btn-primario">
            <ShieldCheck size={16} />
            Validar predio
          </Link>
        )}
      </Encabezado>

      <SelectorPredio predios={predios} valor={seleccionado} onChange={elegir} mostrarProductor={usuarioActual.rol === ADMIN} />

      {aviso && <div className="mensaje mensaje-exito">{aviso}</div>}
      {error && <div className="mensaje mensaje-error">{error}</div>}

      <div className="dos-columnas">
        <section className="panel">
          <h2 className="panel-titulo">Geometría vigente</h2>
          <MapaPredio vertices={poligono?.vertices} />
          {!poligono && <p className="panel-texto centrado">Este predio todavía no tiene polígono ni punto registrado.</p>}
          {poligono && (
            <>
              <dl className="datos">
                <dt>Tipo</dt>
                <dd>{poligono.esPunto ? 'Punto' : `Polígono de ${poligono.vertices.length - 1} vértices`}</dd>
                <dt>{poligono.esPunto ? 'Coordenadas' : 'Centro del predio'}</dt>
                <dd>Lat. {seis(centro.lat)}, long. {seis(centro.lon)}</dd>
                {!poligono.esPunto && (<><dt>Superficie calculada</dt><dd>{poligono.areaHa?.toLocaleString('es-BO')} ha</dd></>)}
                <dt>Superficie declarada</dt>
                <dd>{predio?.superficieDeclaradaHa.toLocaleString('es-BO')} ha</dd>
                <dt>Versión</dt>
                <dd>{poligono.version} · {poligono.motivo}</dd>
              </dl>
              {!poligono.esPunto && (
                <details className="vertices">
                  <summary>Ver los {poligono.vertices.length - 1} vértices</summary>
                  <table className="tabla">
                    <thead>
                      <tr><th>N.º</th><th className="numero">Latitud</th><th className="numero">Longitud</th></tr>
                    </thead>
                    <tbody>
                      {poligono.vertices.slice(0, -1).map((v, i) => (
                        <tr key={i}><td>{i + 1}</td><td className="numero">{seis(v.lat)}</td><td className="numero">{seis(v.lon)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </>
          )}
        </section>

        <div className="columna">
          {!sePuedeEditar && (
            <div className="mensaje mensaje-info">
              El predio está en revisión o aprobado: su polígono ya no se puede cambiar.
            </div>
          )}

          <section className="panel">
            {requierePoligono ? (
              <p className="nota sin-margen">
                Este predio declara {predio.superficieDeclaradaHa.toLocaleString('es-BO')} ha. Con más de 4 ha se exige el
                polígono completo del predio: carga el archivo con su contorno.
              </p>
            ) : (
              <>
                <p className="panel-texto">
                  Este predio declara 4 ha o menos. Puedes registrar su ubicación de una de estas dos formas:
                </p>
                <div className="selector-modo" role="tablist">
                  <button type="button" role="tab" aria-selected={modo === 'poligono'}
                    className={modo === 'poligono' ? 'activo' : ''} onClick={() => setModo('poligono')}>
                    <FileUp size={16} />Polígono (archivo)
                  </button>
                  <button type="button" role="tab" aria-selected={modo === 'punto'}
                    className={modo === 'punto' ? 'activo' : ''} onClick={() => setModo('punto')}>
                    <MapPin size={16} />Un punto
                  </button>
                </div>
              </>
            )}

            {formulario === 'poligono' ? (
              <form onSubmit={subirArchivo}>
                <h2 className="panel-titulo"><FileUp size={18} />Cargar el polígono</h2>
                <p className="panel-texto">
                  Archivo GeoJSON (.geojson o .json) o KML (.kml) en WGS84 (EPSG:4326). Se rechazan el anillo no cerrado, los
                  lados que se cruzan y los polígonos de menos de 4 vértices.
                </p>
                <input type="file" accept=".geojson,.json,.kml" className="archivo"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} disabled={!sePuedeEditar} />
                <button type="submit" className="btn btn-primario" disabled={enviando || !sePuedeEditar}>
                  {enviando ? 'Cargando…' : poligono && !poligono.esPunto ? 'Reemplazar polígono' : 'Cargar polígono'}
                </button>
              </form>
            ) : (
              <form onSubmit={guardarPunto} noValidate>
                <h2 className="panel-titulo"><MapPin size={18} />Registrar un punto</h2>
                <p className="panel-texto">Latitud y longitud de un punto dentro del predio, con 6 decimales.</p>
                <div className="fila">
                  <Campo name="lat" etiqueta="Latitud" valor={punto.lat} error={erroresPunto.lat} placeholder="Ej.: -17.456789"
                    onChange={(e) => setPunto({ ...punto, lat: e.target.value })} inputMode="decimal" disabled={!sePuedeEditar} />
                  <Campo name="lon" etiqueta="Longitud" valor={punto.lon} error={erroresPunto.lon} placeholder="Ej.: -63.123456"
                    onChange={(e) => setPunto({ ...punto, lon: e.target.value })} inputMode="decimal" disabled={!sePuedeEditar} />
                </div>
                <button type="submit" className="btn btn-primario" disabled={enviando || !sePuedeEditar}>Guardar punto</button>
              </form>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
