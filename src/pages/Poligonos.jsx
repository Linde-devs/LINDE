import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Crosshair, FileText, FileUp, MapPin, PenLine, Trash2, Undo2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import { validarPunto } from '../data/validaciones.js'
import { areaHa, problemaContorno, ubicacionActual } from '../data/geometria.js'
import Encabezado from '../components/Encabezado.jsx'
import Campo from '../components/Campo.jsx'
import SelectorPredio from '../components/SelectorPredio.jsx'
import MapaPredio from '../components/MapaPredio.jsx'
import MapaDibujo from '../components/MapaDibujo.jsx'
import HistorialPoligono from '../components/HistorialPoligono.jsx'

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

// CU-04. RF-03: carga del polígono desde un archivo GeoJSON o KML. RF-04: dibujo sobre el mapa, con vértices marcados
// con clics o tomados del GPS del dispositivo recorriendo el lindero. RF-05: un punto basta hasta 4 ha.
// Cada geometría guardada crea una versión nueva y conserva las anteriores (Prototype, en la API).
// La API rechaza la geometría inválida en el momento de cargarla e indica el tipo de error.
// La superposición con otros predios (RF-06) se revisa al enviar el predio a revisión.
const precision = (m) => (m == null ? 'Manual' : `±${m.toLocaleString('es-BO')} m`)

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
  // Forma de registrar la geometría: archivo, dibujo en el mapa o un punto (este último solo hasta 4 ha).
  const [modo, setModo] = useState('poligono')
  const [trazo, setTrazo] = useState([])
  const [motivo, setMotivo] = useState('')
  const [gps, setGps] = useState(null)
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [comparada, setComparada] = useState(null)

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
    setTrazo([])
    setMotivo('')
    setComparada(null)
    setGps(null)
  }

  // RF-04. Ubicación del GPS: en el dibujo agrega un vértice; en el modo punto llena la latitud y la longitud.
  async function usarGps(destino) {
    setError('')
    setBuscandoGps(true)
    try {
      const u = await ubicacionActual()
      // RF-04: la precisión del GPS se guarda con cada vértice, redondeada a 0,1 m.
      const v = { lat: Number(u.lat.toFixed(6)), lon: Number(u.lon.toFixed(6)), precisionM: Math.round(u.precisionM * 10) / 10 }
      setGps(u.precisionM)
      if (destino === 'punto') {
        setPunto({ lat: String(v.lat), lon: String(v.lon), precisionM: v.precisionM })
        setErroresPunto({})
      } else setTrazo((t) => [...t, v])
    } catch (err) {
      setError(err.message)
    } finally {
      setBuscandoGps(false)
    }
  }

  async function guardarDibujo(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    const problema = problemaContorno(trazo)
    if (problema) {
      setError(problema)
      return
    }
    setEnviando(true)
    try {
      const guardado = await api(`/predios/${seleccionado}/poligono`, {
        metodo: 'PUT',
        cuerpo: { vertices: [...trazo, trazo[0]], motivo: motivo.trim() || 'Dibujado en el mapa' },
      })
      await despues(guardado, 'dibujo en el mapa')
      setTrazo([])
      setMotivo('')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
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
        cuerpo: { vertices: [{ lon: Number(punto.lon), lat: Number(punto.lat), precisionM: punto.precisionM ?? null }], motivo: null },
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
  // RF-04: la columna de precisión solo aparece si algún vértice se tomó con el GPS.
  const conGps = poligono?.precisionesM?.some((p) => p != null) ?? false
  // RF-05: con más de 4 ha el punto nunca se acepta, así que no se ofrece.
  const formulario = requierePoligono && modo === 'punto' ? 'poligono' : modo
  const modos = [
    { valor: 'poligono', texto: 'Archivo', icono: FileUp },
    { valor: 'dibujo', texto: 'Dibujar en el mapa', icono: PenLine },
    ...(requierePoligono ? [] : [{ valor: 'punto', texto: 'Un punto', icono: MapPin }]),
  ]
  const problemaTrazo = trazo.length > 0 ? problemaContorno(trazo) : null

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion}>
        {poligono && sePuedeEditar && (
          <Link to={`/app/documentos?predio=${seleccionado}`} className="btn btn-primario">
            <FileText size={16} />
            Gestionar documentos
          </Link>
        )}
      </Encabezado>

      <SelectorPredio predios={predios} valor={seleccionado} onChange={elegir} mostrarProductor={usuarioActual.rol === ADMIN} />

      {aviso && <div className="mensaje mensaje-exito">{aviso}</div>}
      {error && <div className="mensaje mensaje-error">{error}</div>}

      <div className="dos-columnas">
        <section className="panel">
          <h2 className="panel-titulo">Geometría vigente</h2>
          <MapaPredio vertices={poligono?.vertices} referencia={comparada?.vertices} />
          {comparada && (
            <p className="nota">En gris punteado: versión {comparada.version} ({comparada.motivo}).</p>
          )}
          {!poligono && <p className="panel-texto centrado">Este predio todavía no tiene polígono ni punto registrado.</p>}
          {poligono && (
            <>
              <dl className="datos">
                <dt>Tipo</dt>
                <dd>{poligono.esPunto ? 'Punto' : `Polígono de ${poligono.vertices.length - 1} vértices`}</dd>
                <dt>{poligono.esPunto ? 'Coordenadas' : 'Centro del predio'}</dt>
                <dd>
                  Lat. {seis(centro.lat)}, long. {seis(centro.lon)}
                  {poligono.esPunto && conGps ? ` (GPS ${precision(poligono.precisionesM[0])})` : ''}
                </dd>
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
                      <tr>
                        <th>N.º</th><th className="numero">Latitud</th><th className="numero">Longitud</th>
                        {conGps && <th className="numero">Precisión GPS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {poligono.vertices.slice(0, -1).map((v, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td><td className="numero">{seis(v.lat)}</td><td className="numero">{seis(v.lon)}</td>
                          {conGps && <td className="numero">{precision(poligono.precisionesM[i])}</td>}
                        </tr>
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
              <p className="panel-texto">
                Este predio declara {predio.superficieDeclaradaHa.toLocaleString('es-BO')} ha. Con más de 4 ha se exige el
                polígono completo: cárgalo desde un archivo o dibújalo en el mapa.
              </p>
            ) : (
              <p className="panel-texto">
                Este predio declara 4 ha o menos: puedes registrar su polígono o solo un punto dentro del predio.
              </p>
            )}
            <div className="selector-modo" role="tablist">
              {modos.map(({ valor, texto, icono: Icono }) => (
                <button key={valor} type="button" role="tab" aria-selected={formulario === valor}
                  className={formulario === valor ? 'activo' : ''} onClick={() => { setModo(valor); setError('') }}>
                  <Icono size={16} />{texto}
                </button>
              ))}
            </div>

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
            ) : formulario === 'dibujo' ? (
              <form onSubmit={guardarDibujo} noValidate>
                <h2 className="panel-titulo"><PenLine size={18} />Dibujar el polígono</h2>
                <p className="panel-texto">
                  Haz clic en el mapa en cada esquina del predio, en orden. Arrastra un vértice para corregirlo. En el campo,
                  camina el lindero y pulsa «Agregar mi ubicación» en cada esquina para tomarla del GPS.
                </p>
                <MapaDibujo vertices={trazo} onChange={setTrazo} habilitado={sePuedeEditar}
                  referencia={poligono && !poligono.esPunto ? poligono.vertices : null} />
                <div className="barra-dibujo">
                  <button type="button" className="btn btn-secundario" onClick={() => usarGps('dibujo')}
                    disabled={!sePuedeEditar || buscandoGps}>
                    <Crosshair size={16} />{buscandoGps ? 'Buscando…' : 'Agregar mi ubicación'}
                  </button>
                  <button type="button" className="btn btn-secundario" onClick={() => setTrazo(trazo.slice(0, -1))}
                    disabled={trazo.length === 0}>
                    <Undo2 size={16} />Deshacer
                  </button>
                  <button type="button" className="btn btn-secundario" onClick={() => setTrazo([])} disabled={trazo.length === 0}>
                    <Trash2 size={16} />Borrar
                  </button>
                  {poligono && !poligono.esPunto && (
                    <button type="button" className="btn btn-secundario" disabled={!sePuedeEditar}
                      onClick={() => setTrazo(poligono.vertices.slice(0, -1).map((v, i) => ({ ...v, precisionM: poligono.precisionesM?.[i] ?? null })))}>
                      Partir del polígono vigente
                    </button>
                  )}
                </div>
                <p className="nota">
                  {trazo.length} {trazo.length === 1 ? 'vértice' : 'vértices'}
                  {trazo.some((v) => v.precisionM != null) ? ` (${trazo.filter((v) => v.precisionM != null).length} del GPS)` : ''}
                  {trazo.length >= 3 && !problemaTrazo ? ` · ${areaHa(trazo).toLocaleString('es-BO', { maximumFractionDigits: 2 })} ha aproximadas` : ''}
                  {gps != null ? ` · última ubicación del GPS con precisión de ${Math.round(gps)} m` : ''}
                </p>
                {problemaTrazo && trazo.length >= 3 && <p className="error-campo">{problemaTrazo}</p>}
                {poligono && (
                  <Campo name="motivo" etiqueta="Motivo del cambio (opcional)" valor={motivo}
                    onChange={(e) => setMotivo(e.target.value)} placeholder="Corrección del lindero norte" maxLength={200}
                    disabled={!sePuedeEditar} />
                )}
                <button type="submit" className="btn btn-primario" disabled={enviando || !sePuedeEditar || trazo.length < 3}>
                  {enviando ? 'Guardando…' : poligono ? 'Guardar como versión nueva' : 'Guardar polígono'}
                </button>
              </form>
            ) : (
              <form onSubmit={guardarPunto} noValidate>
                <h2 className="panel-titulo"><MapPin size={18} />Registrar un punto</h2>
                <p className="panel-texto">Latitud y longitud de un punto dentro del predio, con 6 decimales.</p>
                <div className="fila">
                  <Campo name="lat" etiqueta="Latitud" valor={punto.lat} error={erroresPunto.lat} placeholder="Ej.: -17.456789"
                    onChange={(e) => setPunto({ lat: e.target.value, lon: punto.lon })} inputMode="decimal" disabled={!sePuedeEditar} />
                  <Campo name="lon" etiqueta="Longitud" valor={punto.lon} error={erroresPunto.lon} placeholder="Ej.: -63.123456"
                    onChange={(e) => setPunto({ lat: punto.lat, lon: e.target.value })} inputMode="decimal" disabled={!sePuedeEditar} />
                </div>
                <div className="barra-dibujo">
                  <button type="button" className="btn btn-secundario" onClick={() => usarGps('punto')}
                    disabled={!sePuedeEditar || buscandoGps}>
                    <Crosshair size={16} />{buscandoGps ? 'Buscando…' : 'Usar mi ubicación'}
                  </button>
                  <button type="submit" className="btn btn-primario" disabled={enviando || !sePuedeEditar}>Guardar punto</button>
                </div>
                {gps != null && <p className="nota">Ubicación del GPS con precisión de {Math.round(gps)} m.</p>}
              </form>
            )}
          </section>
        </div>
      </div>

      {poligono && (
        <HistorialPoligono predioId={seleccionado} versionVigente={poligono.version} comparada={comparada}
          onComparar={setComparada} />
      )}
    </>
  )
}
