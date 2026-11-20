import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import Campo from '../components/Campo.jsx'
import Encabezado from '../components/Encabezado.jsx'
import Etiqueta from '../components/Etiqueta.jsx'
import SelectorPredio from '../components/SelectorPredio.jsx'
import { numero } from '../data/validaciones.js'

export const tiposDocumento = {
  TituloPropiedad: 'Título de propiedad (INRA)',
  PlanOrdenamientoPredial: 'Plan de ordenamiento predial (ABT)',
  PlanDesmonte: 'Plan de desmonte (ABT)',
}

const editable = (p) => p.estado === 'Registrado' || p.estado === 'ConAlertas'
const ha = (n) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 2 })} ha`

// CU-05. Gestionar documentos: el productor registra los datos del título del INRA y de las autorizaciones de la ABT.
// La capa de titularidad compara el CI del titular con el del productor y la superficie titulada con el área del polígono;
// la capa de uso de suelo busca el POP o el plan de desmonte cuando el predio no entra en la Ley 741.
// Por ahora se registran los datos del documento; la subida del archivo PDF o imagen (RF-16) queda pendiente.
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
  // El título del INRA se registra con los datos del predio (Gestionar predios); aquí se agregan los documentos de la ABT.
  function abrir(tipo = 'PlanOrdenamientoPredial') {
    setErrores({})
    setAviso('')
    setFormulario({ tipo, numero: '', titularCi: '', superficieHa: '' })
  }

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
    if (f.tipo === 'TituloPropiedad' && !/^\d{5,10}$/.test(f.titularCi.trim()))
      e.titularCi = 'Escribe el CI del titular que figura en el título (5 a 10 dígitos).'
    const sup = numero(f.superficieHa)
    if (!(sup > 0)) e.superficieHa = 'Escribe la superficie en hectáreas, mayor a cero.'
    return e
  }

  async function guardar(e) {
    e.preventDefault()
    const encontrados = validar(formulario)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setGuardando(true)
    try {
      await api(`/predios/${seleccionado}/documentos`, {
        metodo: 'POST',
        cuerpo: {
          tipo: formulario.tipo,
          numero: formulario.numero.trim(),
          titularCi: formulario.tipo === 'TituloPropiedad' ? formulario.titularCi.trim() : null,
          superficieHa: numero(formulario.superficieHa),
        },
      })
      setAviso(`${tiposDocumento[formulario.tipo]} registrado.`)
      setFormulario(null)
      await cargarDocumentos(seleccionado)
    } catch (err) {
      setErrores({ general: err.message })
    } finally {
      setGuardando(false)
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
      </Encabezado>

      <SelectorPredio predios={predios} valor={seleccionado} onChange={elegir} mostrarProductor={esAdmin} />

      {aviso && <div className="mensaje mensaje-exito">{aviso}</div>}
      {error && <div className="mensaje mensaje-error">{error}</div>}

      {predio && !puedeEditar && (
        <p className="nota">El predio está aprobado: sus documentos ya no se modifican.</p>
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

          <div className="fila">
            <Campo name="tipo" etiqueta="Tipo de documento" valor={formulario.tipo} onChange={cambiar}>
              {Object.entries(tiposDocumento).filter(([valor]) => valor !== 'TituloPropiedad').map(([valor, texto]) => (
                <option key={valor} value={valor}>{texto}</option>
              ))}
            </Campo>
            <Campo name="numero" etiqueta="Número del documento" valor={formulario.numero} error={errores.numero}
              onChange={cambiar} placeholder={formulario.tipo === 'TituloPropiedad' ? 'TIT-001' : 'POP-009'} />
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

        {!tieneTitulo && (
          <p className="nota">
            Falta el título de propiedad del INRA. Se registra con los datos del predio:{' '}
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
          en la exención de la Ley 741, necesita el plan de ordenamiento predial y, si declara desmonte, el plan de desmonte. Se registran los datos del documento; la subida del archivo PDF o imagen llegará más adelante.
        </p>
      </section>
    </>
  )
}
