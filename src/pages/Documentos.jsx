import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import Campo from '../components/Campo.jsx'
import Encabezado from '../components/Encabezado.jsx'
import Etiqueta from '../components/Etiqueta.jsx'
import SelectorPredio from '../components/SelectorPredio.jsx'
import BotonArchivo from '../components/BotonArchivo.jsx'
import { MENSAJE_TITULO, numero, tituloValido } from '../data/validaciones.js'

export const tiposDocumento = {
  TituloPropiedad: 'Título de propiedad (INRA)',
  PlanOrdenamientoPredial: 'Plan de ordenamiento predial (ABT)',
  PlanDesmonte: 'Plan de desmonte (ABT)',
}

// Los documentos se pueden cambiar en cualquier estado; si el predio ya se envió, vuelve a "Registrado" (patrón State).
const editable = (p) => Boolean(p)
const ha = (n) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 2 })} ha`

// CU-05. Gestionar documentos: el productor registra los datos del título del INRA y de las autorizaciones de la ABT.
// La capa de titularidad compara el CI del titular con el del productor y la superficie titulada con el área del polígono;
// la capa de uso de suelo busca el POP o el plan de desmonte cuando el predio no entra en la Ley 741.
// RF-16: cada documento lleva además su archivo (PDF, JPG o PNG, hasta 10 MB), que es requisito para enviar el predio.

const TIPOS_ARCHIVO = '.pdf,.jpg,.jpeg,.png'
const MAXIMO_BYTES = 10 * 1024 * 1024

// Revisión rápida en el navegador; la API vuelve a revisar el tipo (por su contenido) y el tamaño.
export function errorArchivo(archivo) {
  if (!archivo) return null
  if (!/\.(pdf|jpe?g|png)$/i.test(archivo.name)) return 'Solo se aceptan archivos PDF, JPG o PNG.'
  if (archivo.size > MAXIMO_BYTES) return 'El archivo supera los 10 MB.'
  return null
}
export default function Documentos({ cu }) {
  const { api, usuarioActual } = useAuth()
  const [parametros, setParametros] = useSearchParams()
  const esAdmin = usuarioActual.rol === ADMIN

  const [predios, setPredios] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [formulario, setFormulario] = useState(null)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [archivoNuevo, setArchivoNuevo] = useState(null)
  const [subiendo, setSubiendo] = useState(null)

  const seleccionado = Number(parametros.get('predio')) || predios[0]?.id
  const predio = predios.find((p) => p.id === seleccionado)

  useEffect(() => {
    api('/predios')
      .then(setPredios)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [api])

  const cargarDocumentos = useCallback(
    async (id) => {
      try {
        setDocumentos(await api(`/predios/${id}/documentos`))
      } catch (e) {
        setError(e.message)
      }
    },
    [api],
  )

  useEffect(() => {
    if (seleccionado) cargarDocumentos(seleccionado)
  }, [seleccionado, cargarDocumentos])

  function elegir(id) {
    setParametros({ predio: String(id) })
    setFormulario(null)
    setError('')
    setAviso('')
  }

  // El formulario se precarga con lo que ya se sabe: el número de título declarado en el predio y el CI del productor.
  // El título del INRA se puede registrar aquí o con los datos del predio; si el predio ya lo tiene, se edita allá.
  function abrir() {
    setErrores({})
    setAviso('')
    if (tieneTitulo) {
      setFormulario({ tipo: 'PlanOrdenamientoPredial', numero: '', titularCi: '', superficieHa: '' })
      return
    }
    setFormulario({
      tipo: 'TituloPropiedad',
      numero: predio?.numeroTituloInra ?? '',
      titularCi: esAdmin ? '' : (usuarioActual.ci ?? ''),
      superficieHa: '',
    })
  }

  // El número de título también queda en el predio: se recargan los predios para que el resto de la pantalla lo vea.
  const recargarPredios = () => api('/predios').then(setPredios).catch(() => {})

  function cambiar(e) {
    const { name, value } = e.target
    setFormulario((f) => {
      const nuevo = { ...f, [name]: value }
      if (name === 'tipo') {
        nuevo.titularCi = value === 'TituloPropiedad' && !esAdmin ? (usuarioActual.ci ?? '') : ''
        nuevo.numero = value === 'TituloPropiedad' ? (predio?.numeroTituloInra ?? '') : ''
      }
      return nuevo
    })
  }

  function validar(f) {
    const e = {}
    if (!f.numero.trim()) e.numero = 'Escribe el número del documento.'
    else if (f.tipo === 'TituloPropiedad' && !tituloValido(f.numero)) e.numero = MENSAJE_TITULO
    if (f.tipo === 'TituloPropiedad' && !/^\d{5,10}$/.test(f.titularCi.trim()))
      e.titularCi = 'Escribe el CI del titular que figura en el título (5 a 10 dígitos).'
    const sup = numero(f.superficieHa)
    if (!(sup > 0)) e.superficieHa = 'Escribe la superficie en hectáreas, mayor a cero.'
    const problema = errorArchivo(archivoNuevo)
    if (problema) e.archivo = problema
    return e
  }

  async function guardar(e) {
    e.preventDefault()
    const encontrados = validar(formulario)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setGuardando(true)
    try {
      const creado = await api(`/predios/${seleccionado}/documentos`, {
        metodo: 'POST',
        cuerpo: {
          tipo: formulario.tipo,
          numero: formulario.numero.trim(),
          titularCi: formulario.tipo === 'TituloPropiedad' ? formulario.titularCi.trim() : null,
          superficieHa: numero(formulario.superficieHa),
        },
      })
      if (archivoNuevo) await subirArchivo(creado, archivoNuevo)
      setAviso(`${tiposDocumento[formulario.tipo]} registrado${archivoNuevo ? ' con su archivo' : ''}.`)
      setArchivoNuevo(null)
      setFormulario(null)
      await cargarDocumentos(seleccionado)
      if (formulario.tipo === 'TituloPropiedad') await recargarPredios()
    } catch (err) {
      setErrores({ general: err.message })
    } finally {
      setGuardando(false)
    }
  }

  // RF-16. Sube o reemplaza el archivo de un documento ya registrado.
  async function subirArchivo(doc, archivo) {
    const cuerpo = new FormData()
    cuerpo.append('archivo', archivo)
    return api(`/documentos/${doc.id}/archivo`, { metodo: 'POST', cuerpo })
  }

  async function elegirArchivo(doc, e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setAviso('')
    setError('')
    const problema = errorArchivo(archivo)
    if (problema) {
      setError(problema)
      return
    }
    setSubiendo(doc.id)
    try {
      await subirArchivo(doc, archivo)
      setAviso(`Archivo de ${tiposDocumento[doc.tipo]} ${doc.archivoClave ? 'reemplazado' : 'subido'}.`)
      await cargarDocumentos(seleccionado)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendo(null)
    }
  }

  async function eliminar(doc) {
    if (!window.confirm(`¿Eliminar ${tiposDocumento[doc.tipo]} ${doc.numero ?? ''}?`)) return
    setError('')
    try {
      await api(`/documentos/${doc.id}`, { metodo: 'DELETE' })
      setAviso('Documento eliminado.')
      await cargarDocumentos(seleccionado)
    } catch (err) {
      setError(err.message)
    }
  }

  if (cargando) return <p className="panel-vacio">Cargando…</p>

  if (predios.length === 0) {
    return (
      <>
        <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
        <div className="vacio">
          <h2>No tienes predios</h2>
          <p>Registra un predio primero para adjuntar sus documentos.</p>
          <Link to="/app/predios" state={{ nuevo: true }} className="btn btn-primario espacio-arriba">Registrar predio</Link>
        </div>
      </>
    )
  }

  const puedeEditar = predio && editable(predio)
  const tieneTitulo = documentos.some((d) => d.tipo === 'TituloPropiedad')
  const titulo = documentos.find((d) => d.tipo === 'TituloPropiedad')
  const areaPoligono = predio?.areaPoligonoHa

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion}>
        {puedeEditar && !formulario && (
          <button className="btn btn-primario" onClick={() => abrir()}>
            <Plus size={16} />
            Agregar documento
          </button>
        )}
        {/* Siguiente paso del registro: polígono, documentos y después revisar que no falte nada (CU-07). */}
        {puedeEditar && (
          <Link to={`/app/validacion?predio=${seleccionado}`} className="btn btn-secundario">
            <ShieldCheck size={16} />
            Validar predio
          </Link>
        )}
      </Encabezado>

      <SelectorPredio predios={predios} valor={seleccionado} onChange={elegir} mostrarProductor={esAdmin} />

      {aviso && <div className="mensaje mensaje-exito">{aviso}</div>}
      {error && <div className="mensaje mensaje-error">{error}</div>}

      {predio && predio.estado !== 'Registrado' && (
        <div className="mensaje mensaje-aviso">
          El predio ya se envió a revisión ({predio.estado === 'Aprobado' ? 'aprobado' : 'con alertas'}). Si agregas, quitas o
          cambias un documento, vuelve a «Registrado» y tendrás que enviarlo de nuevo.
        </div>
      )}

      {formulario && (
        <form className="panel" onSubmit={guardar} noValidate>
          <div className="panel-cabecera">
            <h2>Agregar documento</h2>
            <button type="button" className="btn-icono" onClick={() => setFormulario(null)} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
          {errores.general && <div className="mensaje mensaje-error">{errores.general}</div>}
          {tieneTitulo && (
            <p className="nota">
              Este predio ya tiene su título de propiedad ({titulo.numero}), por eso no aparece en la lista: cada predio tiene
              uno solo. Para corregirlo,{' '}
              <Link to="/app/predios" state={{ editar: predio.id }}>edítalo en el predio</Link>.
            </p>
          )}

          <div className="fila">
            <Campo name="tipo" etiqueta="Tipo de documento" valor={formulario.tipo} onChange={cambiar}>
              {Object.entries(tiposDocumento).filter(([valor]) => valor !== 'TituloPropiedad' || !tieneTitulo).map(([valor, texto]) => (
                <option key={valor} value={valor}>{texto}</option>
              ))}
            </Campo>
            <Campo name="numero" etiqueta="Número del documento" valor={formulario.numero} error={errores.numero}
              onChange={cambiar} placeholder={formulario.tipo === 'TituloPropiedad' ? 'SPP-NAL-070167' : 'POP-009'} />
          </div>
          <div className="fila">
            {formulario.tipo === 'TituloPropiedad' && (
              <Campo name="titularCi" etiqueta="CI del titular" valor={formulario.titularCi} error={errores.titularCi}
                onChange={cambiar} inputMode="numeric" placeholder="7845123" />
            )}
            <Campo name="superficieHa"
              etiqueta={formulario.tipo === 'TituloPropiedad' ? 'Superficie titulada (ha)' : 'Superficie autorizada (ha)'}
              valor={formulario.superficieHa} error={errores.superficieHa} onChange={cambiar} inputMode="decimal" placeholder="120.50" />
          </div>
          <label className="campo">
            <span>Archivo del documento (PDF, JPG o PNG, hasta 10 MB)</span>
            <input type="file" accept={TIPOS_ARCHIVO} className="archivo"
              onChange={(e) => { setArchivoNuevo(e.target.files?.[0] ?? null); setErrores({ ...errores, archivo: undefined }) }} />
            {errores.archivo && <small className="error-campo">{errores.archivo}</small>}
          </label>
          {formulario.tipo === 'TituloPropiedad' && (
            <p className="nota">
              La validación compara el CI del titular con el del productor y la superficie titulada con el área del polígono
              {areaPoligono != null ? ` (${ha(areaPoligono)})` : ''}. Si el título es de otra persona o cubre menos superficie,
              el predio queda con alertas.
            </p>
          )}

          <div className="panel-pie">
            <button type="button" className="btn btn-secundario" onClick={() => setFormulario(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Registrar documento'}
            </button>
          </div>
        </form>
      )}

      <section className="panel">
        <div className="panel-cabecera">
          <h2>{predio?.nombre}</h2>
          {predio && <Etiqueta valor={predio.estado} />}
        </div>

        {documentos.length === 0 ? (
          <p className="panel-vacio">Este predio todavía no tiene documentos.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Número</th>
                  <th>CI del titular</th>
                  <th className="numero">Superficie</th>
                  <th>Registrado</th>
                  <th>Archivo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => (
                  <tr key={d.id}>
                    <td>{tiposDocumento[d.tipo] ?? d.tipo}</td>
                    <td>{d.numero ?? '-'}</td>
                    <td>{d.titularCi ?? '-'}</td>
                    <td className="numero">{d.superficieHa != null ? ha(d.superficieHa) : '-'}</td>
                    <td>{new Date(d.fechaRegistro).toLocaleDateString('es-BO')}</td>
                    <td>
                      {d.archivoClave ? <BotonArchivo documento={d} texto="Ver" /> : <span className="texto-aviso">Falta</span>}
                      {puedeEditar && (
                        <label className="enlace-chico boton-enlace" title="PDF, JPG o PNG, hasta 10 MB">
                          <Upload size={14} />
                          {subiendo === d.id ? 'Subiendo…' : d.archivoClave ? 'Reemplazar' : 'Subir'}
                          <input type="file" accept={TIPOS_ARCHIVO} hidden disabled={subiendo !== null}
                            onChange={(e) => elegirArchivo(d, e)} />
                        </label>
                      )}
                    </td>
                    <td className="acciones-fila">
                      {d.tipo === 'TituloPropiedad' ? (
                        <Link to="/app/predios" state={{ editar: predio.id }} className="enlace-chico">Editar en el predio</Link>
                      ) : puedeEditar && (
                        <button className="btn-icono peligro" onClick={() => eliminar(d)} aria-label="Eliminar" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {documentos.some((d) => !d.archivoClave) && (
          <p className="nota">
            Sube el archivo escaneado de cada documento (columna Archivo): sin él, el documento no cuenta como requisito para
            enviar el predio a revisión.
          </p>
        )}
        {!tieneTitulo && (
          <p className="nota">
            Falta el título de propiedad del INRA. Agrégalo con el botón Agregar documento o con los datos del predio:{' '}
            <Link to="/app/predios" state={{ editar: predio?.id }}>completar el título</Link>.
          </p>
        )}
        {titulo && areaPoligono != null && titulo.superficieHa != null && areaPoligono > titulo.superficieHa && (
          <p className="nota">
            El polígono mide {ha(areaPoligono)} y el título cubre {ha(titulo.superficieHa)}: al enviarlo, la capa de titularidad
            generará una alerta.
          </p>
        )}
        <p className="panel-texto">
          El título del INRA se registra junto con el predio. Aquí se agregan los documentos de la ABT: si el predio no entra
          en la exención de la Ley 741, necesita el plan de ordenamiento predial y, si declara desmonte, el plan de desmonte. Cada documento lleva sus datos y su archivo escaneado (PDF, JPG o PNG).
        </p>
      </section>
    </>
  )
}
