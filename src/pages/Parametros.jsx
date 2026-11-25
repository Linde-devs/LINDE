import { useCallback, useEffect, useState } from 'react'
import { History, Satellite, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Campo from '../components/Campo.jsx'
import Encabezado from '../components/Encabezado.jsx'
import { numero } from '../data/validaciones.js'

// Cada parámetro con su explicación. mayorACero marca los que no pueden quedar en cero.
const campos = [
  { clave: 'umbralPoligonoObligatorioHa', etiqueta: 'Polígono obligatorio desde (ha)', mayorACero: true,
    ayuda: 'Desde esta superficie el predio debe registrar su polígono; por debajo basta un punto (EUDR).' },
  { clave: 'toleranciaSuperposicionM2', etiqueta: 'Tolerancia de superposición (m²)',
    ayuda: 'Área de superposición que se acepta como error de medición entre dos predios.' },
  { clave: 'toleranciaSuperposicionPorcentaje', etiqueta: 'Tolerancia de superposición (% del área)',
    ayuda: 'Margen relativo; se usa el mayor entre este y el de m². También vale para el cruce con las capas.' },
  { clave: 'ley741PredioMaximoHa', etiqueta: 'Ley 741: predio máximo (ha)',
    ayuda: 'Hasta esta superficie el predio queda exento del plan de ordenamiento predial (POP).' },
  { clave: 'ley741DesmonteMaximoHa', etiqueta: 'Ley 741: desmonte máximo (ha)',
    ayuda: 'Si el desmonte declarado no pasa de este valor, el predio también queda exento del POP.' },
  { clave: 'perdidaCoberturaAlertaPorcentaje', etiqueta: 'Pérdida de cobertura que genera alerta (%)', mayorACero: true,
    ayuda: 'Porcentaje de bosque perdido después de la fecha de corte que se marca como alerta.' },
  { clave: 'bufferMetros', etiqueta: 'Buffer alrededor del polígono (m)',
    ayuda: 'Franja alrededor del polígono para consultar la cobertura de bosque. Se usará con Google Earth Engine.' },
]

const porcentaje = (n) => n.toLocaleString('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const fechaHora = (f) => new Date(f).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })

// CU-12. Gestionar parámetros: el administrador cambia la fecha de corte y los umbrales sin tocar el código.
// La API guarda los valores en un único objeto compartido (Singleton) y anota cada cambio en la bitácora (Decorator);
// aquí solo se muestran y se editan.
export default function Parametros({ cu }) {
  const { api } = useAuth()
  const [datos, setDatos] = useState(null)
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cambios, setCambios] = useState([])
  const [prueba, setPrueba] = useState(null)
  const [probando, setProbando] = useState(false)

  const cargarCambios = useCallback(
    () => api('/bitacora?entidad=Parametros').then((r) => setCambios(r.slice(-5).reverse())).catch(() => setCambios([])),
    [api],
  )

  useEffect(() => {
    api('/parametros')
      .then((p) => setDatos(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === 'number' ? String(v) : v]))))
      .catch((e) => setError(e.message))
    cargarCambios()
  }, [api, cargarCambios])

  function cambiar(e) {
    const { name, value, type, checked } = e.target
    setDatos({ ...datos, [name]: type === 'checkbox' ? checked : value })
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  function validar() {
    const e = {}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaCorte ?? '')) e.fechaCorte = 'Elige la fecha de corte.'
    for (const c of campos) {
      const n = numero(datos[c.clave])
      if (String(datos[c.clave]).trim() === '' || Number.isNaN(n)) e[c.clave] = 'Escribe un número.'
      else if (c.mayorACero && n <= 0) e[c.clave] = 'Debe ser mayor a cero.'
      else if (n < 0) e[c.clave] = 'No puede ser negativo.'
    }
    return e
  }

  async function guardar(e) {
    e.preventDefault()
    setAviso('')
    setError('')
    const encontrados = validar()
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    const cuerpo = { ...datos }
    for (const c of campos) cuerpo[c.clave] = numero(datos[c.clave])
    setGuardando(true)
    try {
      await api('/parametros', { metodo: 'PUT', cuerpo })
      setAviso('Parámetros guardados. Las próximas validaciones ya usan los valores nuevos.')
      await cargarCambios()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  // Comprueba la conexión con Earth Engine con un polígono de prueba (la llave se configura en el servidor).
  async function probarEarthEngine() {
    setProbando(true)
    setPrueba(null)
    try {
      setPrueba(await api('/cobertura/prueba'))
    } catch (err) {
      setPrueba({ conectado: false, error: err.message })
    } finally {
      setProbando(false)
    }
  }

  if (!datos) return error ? <div className="mensaje mensaje-error">{error}</div> : <p className="panel-vacio">Cargando…</p>

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
      {aviso && <div className="mensaje mensaje-exito">{aviso}</div>}
      {error && <div className="mensaje mensaje-error">{error}</div>}

      <form className="panel" onSubmit={guardar} noValidate>
        <h2 className="panel-titulo">Valores vigentes</h2>
        <p className="panel-texto">
          Los cambios no afectan a las validaciones ya hechas: se aplican desde el próximo envío a revisión.
        </p>
        <div className="parametros">
          <div>
            <Campo name="fechaCorte" etiqueta="Fecha de corte de deforestación (EUDR)" type="date" valor={datos.fechaCorte}
              error={errores.fechaCorte} onChange={cambiar} />
            <small className="ayuda">Se considera deforestación la pérdida de bosque posterior a esta fecha.</small>
          </div>
          {campos.map((c) => (
            <div key={c.clave}>
              <Campo name={c.clave} etiqueta={c.etiqueta} valor={datos[c.clave]} error={errores[c.clave]} onChange={cambiar}
                inputMode="decimal" />
              <small className="ayuda">{c.ayuda}</small>
            </div>
          ))}
        </div>
        <label className="casilla">
          <input type="checkbox" name="superposicionBloquea" checked={datos.superposicionBloquea} onChange={cambiar} />
          La superposición con otro predio bloquea el envío (si no, queda solo como alerta)
        </label>
        <div className="panel-pie">
          <button type="submit" className="btn btn-primario" disabled={guardando}>
            <Save size={16} />
            {guardando ? 'Guardando…' : 'Guardar parámetros'}
          </button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-cabecera">
          <h2 className="panel-titulo"><Satellite size={18} />Análisis satelital (Google Earth Engine)</h2>
          <button type="button" className="btn btn-secundario" onClick={probarEarthEngine} disabled={probando}>
            {probando ? 'Consultando…' : 'Probar conexión'}
          </button>
        </div>
        <p className="panel-texto">
          Compara el mapa de bosque del JRC al 31/12/2020 con la cobertura de árboles de Dynamic World de los últimos 180
          días. La llave de la cuenta de servicio se configura en el servidor, nunca en esta pantalla.
        </p>
        {prueba?.conectado && (
          <div className="mensaje mensaje-exito">
            Conectado. Polígono de prueba cerca de San Julián: {porcentaje(prueba.bosquePorcentajeCorte)} % de bosque en 2020
            y {porcentaje(prueba.bosquePorcentajeActual)} % de árboles ahora (imagen del{' '}
            {prueba.fechaImagenActual.split('-').reverse().join('/')}).
            {prueba.aviso && <div className="nota-chica">{prueba.aviso}</div>}
          </div>
        )}
        {prueba && !prueba.conectado && <div className="mensaje mensaje-error">{prueba.error}</div>}
      </div>

      <div className="panel">
        <h2 className="panel-titulo"><History size={18} />Últimos cambios</h2>
        {cambios.length === 0 ? (
          <p className="panel-vacio">Todavía no se cambiaron los parámetros.</p>
        ) : (
          <ul className="lista-simple">
            {cambios.map((r) => (
              <li key={r.id}>{fechaHora(r.fecha)} · {r.usuario} · {r.operacion}: {r.resultado}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
