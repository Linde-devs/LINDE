import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Hexagon, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import { municipioDe, numero, validarPredio } from '../data/validaciones.js'
import Encabezado from '../components/Encabezado.jsx'
import Campo from '../components/Campo.jsx'
import Etiqueta from '../components/Etiqueta.jsx'
import ListaMunicipios from '../components/ListaMunicipios.jsx'
import { departamentos } from '../data/divisionPolitica.js'

const vacio = {
  productorId: '',
  nombre: '',
  departamento: 'Santa Cruz',
  municipio: '',
  cultivo: '',
  superficieDeclaradaHa: '',
  numeroTituloInra: '',
  titularCi: '',
  superficieTituladaHa: '',
  desmonteDeclaradoHa: '',
}

const cultivos = ['Soya', 'Maíz', 'Girasol', 'Sorgo', 'Trigo', 'Arroz', 'Caña de azúcar', 'Café', 'Cacao', 'Chía', 'Sésamo', 'Frejol']

// Se puede editar o eliminar mientras el predio no está en revisión ni aprobado (patrón State en la API).
// Un predio con alertas se puede corregir y volver a enviar; uno aprobado ya no se modifica.
const editable = (p) => p.estado === 'Registrado' || p.estado === 'ConAlertas'

function textoPoligono(p) {
  if (!p.tienePoligono) return 'Sin registrar'
  if (p.esPunto) return 'Punto'
  return `${p.areaPoligonoHa?.toLocaleString('es-BO')} ha`
}

// CU-03 y RF-02. El productor registra sus predios; el administrador puede registrarlos a nombre de cualquier productor.
export default function Predios({ cu }) {
  const { api, usuarioActual } = useAuth()
  const esAdmin = usuarioActual.rol === ADMIN
  const navigate = useNavigate()
  const location = useLocation()

  const [lista, setLista] = useState([])
  const [productores, setProductores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [formulario, setFormulario] = useState(location.state?.nuevo ? { id: null } : null)
  const [datos, setDatos] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setLista(await api('/predios'))
      if (esAdmin) setProductores(await api('/productores'))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [api, esAdmin])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Desde Validar predio o Enviar a revisión se puede llegar con un predio para completar sus datos.
  const editarId = location.state?.editar
  useEffect(() => {
    if (!editarId || lista.length === 0) return
    const p = lista.find((x) => x.id === editarId)
    if (p) abrir(p)
    navigate(location.pathname, { replace: true, state: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarId, lista])

  function abrir(predio = null) {
    setAviso('')
    setErrores({})
    setFormulario({ id: predio?.id ?? null })
    setDatos(
      predio
        ? {
            productorId: String(predio.productorId),
            nombre: predio.nombre,
            departamento: predio.departamento || 'Santa Cruz',
            municipio: predio.municipio,
            cultivo: predio.cultivo,
            superficieDeclaradaHa: String(predio.superficieDeclaradaHa),
            numeroTituloInra: predio.numeroTituloInra ?? '',
            titularCi: predio.titularCi ?? '',
            superficieTituladaHa: predio.superficieTituladaHa == null ? '' : String(predio.superficieTituladaHa),
            desmonteDeclaradoHa: predio.desmonteDeclaradoHa == null ? '' : String(predio.desmonteDeclaradoHa),
          }
        : { ...vacio, titularCi: esAdmin ? '' : (usuarioActual.ci ?? '') },
    )
  }

  function cambiar(e) {
    const { name, value } = e.target
    const nuevos = { ...datos, [name]: value }
    // Al cambiar de departamento, el municipio escrito solo se conserva si también es de ese departamento.
    if (name === 'departamento') nuevos.municipio = municipioDe(value, datos.municipio) ?? ''
    setDatos(nuevos)
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  async function guardar(e) {
    e.preventDefault()
    const encontrados = validarPredio(datos, { requiereProductor: esAdmin })
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      return
    }

    const cuerpo = {
      productorId: esAdmin ? Number(datos.productorId) : null,
      nombre: datos.nombre,
      departamento: datos.departamento,
      municipio: municipioDe(datos.departamento, datos.municipio) ?? datos.municipio,
      cultivo: datos.cultivo,
      superficieDeclaradaHa: numero(datos.superficieDeclaradaHa),
      numeroTituloInra: datos.numeroTituloInra || null,
      titularCi: datos.titularCi.trim() || null,
      superficieTituladaHa: String(datos.superficieTituladaHa).trim() ? numero(datos.superficieTituladaHa) : null,
      desmonteDeclaradoHa: String(datos.desmonteDeclaradoHa).trim() ? numero(datos.desmonteDeclaradoHa) : null,
    }

    const nuevo = formulario.id === null
    setGuardando(true)
    try {
      const guardado = nuevo
        ? await api('/predios', { metodo: 'POST', cuerpo })
        : await api(`/predios/${formulario.id}`, { metodo: 'PUT', cuerpo })
      setFormulario(null)
      setAviso(nuevo ? `Predio "${guardado.nombre}" registrado. Ahora registra su polígono.` : 'Predio actualizado.')
      await cargar()
    } catch (err) {
      setErrores({ [err.campo && err.campo in vacio ? err.campo : 'general']: err.message })
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(predio) {
    if (!window.confirm(`¿Eliminar el predio "${predio.nombre}" junto con su polígono y sus documentos?`)) return
    setAviso('')
    try {
      await api(`/predios/${predio.id}`, { metodo: 'DELETE' })
      setAviso('Predio eliminado.')
      await cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const nuevo = formulario?.id === null
  const superficie = numero(datos.superficieDeclaradaHa)

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion}>
        {!formulario && (
          <button className="btn btn-primario" onClick={() => abrir()}>
            <Plus size={16} />
            Nuevo predio
          </button>
        )}
      </Encabezado>

      {aviso && <div className="mensaje mensaje-exito">{aviso}</div>}
      {error && <div className="mensaje mensaje-error">{error}</div>}

      {formulario && (
        <form className="panel" onSubmit={guardar} noValidate>
          <div className="panel-cabecera">
            <h2>{nuevo ? 'Registrar predio' : 'Editar predio'}</h2>
            <button type="button" className="btn-icono" onClick={() => setFormulario(null)} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          {errores.general && <div className="mensaje mensaje-error">{errores.general}</div>}

          {esAdmin && (
            <Campo name="productorId" etiqueta="Productor" valor={datos.productorId} error={errores.productorId} onChange={cambiar}>
              <option value="">Selecciona el productor</option>
              {productores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre} {p.apellido} · {p.ci}
                </option>
              ))}
            </Campo>
          )}
          <div className="fila">
            <Campo name="nombre" etiqueta="Nombre del predio" valor={datos.nombre} error={errores.nombre} onChange={cambiar} placeholder="El Algarrobo" />
            <Campo name="cultivo" etiqueta="Cultivo" valor={datos.cultivo} error={errores.cultivo} onChange={cambiar} list="cultivos" />
          </div>
          <div className="fila">
            <Campo name="departamento" etiqueta="Departamento" valor={datos.departamento} error={errores.departamento} onChange={cambiar}>
              <option value="">Selecciona el departamento</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Campo>
            <Campo name="municipio" etiqueta="Municipio" valor={datos.municipio} error={errores.municipio} onChange={cambiar}
              list="municipios" autoComplete="off" placeholder="Escribe y elige de la lista" />
          </div>
          <div className="fila">
            <Campo name="superficieDeclaradaHa" etiqueta="Superficie declarada (ha)" valor={datos.superficieDeclaradaHa}
              error={errores.superficieDeclaradaHa} onChange={cambiar} inputMode="decimal" placeholder="120.50" />
            <Campo name="desmonteDeclaradoHa" etiqueta="Desmonte declarado (ha)" placeholder="0 si no hubo desmonte" valor={datos.desmonteDeclaradoHa}
              error={errores.desmonteDeclaradoHa} onChange={cambiar} inputMode="decimal" />
          </div>

          <h3 className="formulario-seccion">Título de propiedad (INRA)</h3>
          <div className="fila">
            <Campo name="numeroTituloInra" etiqueta="N.º de título" valor={datos.numeroTituloInra}
              error={errores.numeroTituloInra} onChange={cambiar} placeholder="SPP-NAL-070167" />
            <Campo name="titularCi" etiqueta="CI del titular" valor={datos.titularCi} error={errores.titularCi}
              onChange={cambiar} inputMode="numeric" placeholder="7845123" />
            <Campo name="superficieTituladaHa" etiqueta="Superficie titulada (ha)" valor={datos.superficieTituladaHa}
              error={errores.superficieTituladaHa} onChange={cambiar} inputMode="decimal" placeholder="120.50" />
          </div>
          <p className="nota">
            Se pueden completar después, pero son necesarios para enviar el predio a revisión. Al enviarlo se comprueba que
            el titular sea el productor y que la superficie titulada cubra el polígono.
          </p>
          {superficie > 0 && (
            <p className="nota">
              {superficie > 4
                ? 'Con más de 4 ha deberás registrar el polígono completo del predio.'
                : 'Con 4 ha o menos basta registrar un punto (latitud y longitud con 6 decimales).'}
            </p>
          )}
          <ListaMunicipios departamento={datos.departamento} />
          <datalist id="cultivos">
            {cultivos.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <div className="panel-pie">
            <button type="button" className="btn btn-secundario" onClick={() => setFormulario(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : nuevo ? 'Registrar' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      <div className="panel">
        {cargando ? (
          <p className="panel-vacio">Cargando…</p>
        ) : lista.length === 0 ? (
          <p className="panel-vacio">Aún no hay predios registrados.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Predio</th>
                  {esAdmin && <th>Productor</th>}
                  <th>Municipio</th>
                  <th>Cultivo</th>
                  <th className="numero">Superficie (ha)</th>
                  <th>Título INRA</th>
                  <th>Polígono</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    {esAdmin && <td>{p.productor}</td>}
                    <td>{p.departamento ? `${p.municipio}, ${p.departamento}` : p.municipio}</td>
                    <td>{p.cultivo}</td>
                    <td className="numero">{p.superficieDeclaradaHa.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                    <td>{p.numeroTituloInra ?? '-'}</td>
                    <td>{textoPoligono(p)}</td>
                    <td><Etiqueta valor={p.estado} /></td>
                    <td className="acciones-fila">
                      <button className="btn-icono" onClick={() => navigate(`/app/poligonos?predio=${p.id}`)}
                        aria-label="Polígono" title="Polígono">
                        <Hexagon size={16} />
                      </button>
                      {editable(p) && (
                        <>
                          <button className="btn-icono" onClick={() => abrir(p)} aria-label="Editar" title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button className="btn-icono peligro" onClick={() => eliminar(p)} aria-label="Eliminar" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
