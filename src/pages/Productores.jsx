import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, ShieldPlus, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import { validarProductor } from '../data/validaciones.js'
import Encabezado from '../components/Encabezado.jsx'
import Campo from '../components/Campo.jsx'
import ListaMunicipios from '../components/ListaMunicipios.jsx'
import NuevoAdministrador from '../components/NuevoAdministrador.jsx'

const vacio = { nombre: '', apellido: '', ci: '', runpa: '', telefono: '', municipio: '', correo: '', contrasena: '' }

// CU-02 y RF-01. Solo el administrador registra, consulta, edita y elimina productores.
// Al registrar un productor se crea también su cuenta para que pueda iniciar sesión.
export default function Productores({ cu }) {
  const { api, usuarioActual } = useAuth()
  const esAdmin = usuarioActual.rol === ADMIN

  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [formulario, setFormulario] = useState(null) // null | { id: number | null }
  const [datos, setDatos] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [nuevoAdmin, setNuevoAdmin] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setLista(await api('/productores'))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [api])

  useEffect(() => {
    cargar()
  }, [cargar])

  function abrir(productor = null) {
    setAviso('')
    setErrores({})
    setFormulario({ id: productor?.id ?? null })
    setDatos(productor ? { ...vacio, ...productor, runpa: productor.runpa ?? '' } : vacio)
  }

  function cambiar(e) {
    const { name, value } = e.target
    setDatos({ ...datos, [name]: value })
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  async function guardar(e) {
    e.preventDefault()
    const nuevo = formulario.id === null
    const encontrados = validarProductor(datos, { conCuenta: nuevo })
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      return
    }

    const cuerpo = {
      nombre: datos.nombre,
      apellido: datos.apellido,
      ci: datos.ci,
      runpa: datos.runpa || null,
      telefono: datos.telefono,
      municipio: datos.municipio,
      ...(nuevo ? { correo: datos.correo, contrasena: datos.contrasena } : {}),
    }

    setGuardando(true)
    try {
      const guardado = nuevo
        ? await api('/productores', { metodo: 'POST', cuerpo })
        : await api(`/productores/${formulario.id}`, { metodo: 'PUT', cuerpo })
      setFormulario(null)
      setAviso(nuevo ? `Productor registrado con el código ${guardado.codigo}.` : 'Datos del productor actualizados.')
      await cargar()
    } catch (err) {
      setErrores({ [err.campo && err.campo in vacio ? err.campo : 'general']: err.message })
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(productor) {
    if (!window.confirm(`¿Eliminar a ${productor.nombre} ${productor.apellido} y su cuenta de acceso?`)) return
    setAviso('')
    try {
      await api(`/productores/${productor.id}`, { metodo: 'DELETE' })
      setAviso('Productor eliminado.')
      await cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const nuevo = formulario?.id === null

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion}>
        {esAdmin && !formulario && !nuevoAdmin && (
          <div className="acciones">
            <button className="btn btn-secundario" onClick={() => { setAviso(''); setNuevoAdmin(true) }}>
              <ShieldPlus size={16} />
              Nuevo administrador
            </button>
            <button className="btn btn-primario" onClick={() => abrir()}>
              <Plus size={16} />
              Nuevo productor
            </button>
          </div>
        )}
      </Encabezado>

      {aviso && <div className="mensaje mensaje-exito">{aviso}</div>}
      {error && <div className="mensaje mensaje-error">{error}</div>}

      {nuevoAdmin && (
        <NuevoAdministrador
          onCerrar={() => setNuevoAdmin(false)}
          onCreado={(admin) => {
            setNuevoAdmin(false)
            setAviso(`Administrador ${admin.nombre} ${admin.apellido} creado. Ya puede iniciar sesión con ${admin.correo}.`)
          }}
        />
      )}

      {formulario && (
        <form className="panel" onSubmit={guardar} noValidate>
          <div className="panel-cabecera">
            <h2>{nuevo ? 'Registrar productor' : 'Editar productor'}</h2>
            <button type="button" className="btn-icono" onClick={() => setFormulario(null)} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          {errores.general && <div className="mensaje mensaje-error">{errores.general}</div>}

          <div className="fila">
            <Campo name="nombre" etiqueta="Nombres" valor={datos.nombre} error={errores.nombre} onChange={cambiar} />
            <Campo name="apellido" etiqueta="Apellidos" valor={datos.apellido} error={errores.apellido} onChange={cambiar} />
            <Campo name="ci" etiqueta="CI o NIT" valor={datos.ci} error={errores.ci} onChange={cambiar} />
          </div>
          <div className="fila">
            <Campo name="runpa" etiqueta="Código RUNPA (opcional)" valor={datos.runpa} error={errores.runpa} onChange={cambiar} />
            <Campo name="telefono" etiqueta="Teléfono" valor={datos.telefono} error={errores.telefono} onChange={cambiar} inputMode="tel" />
            <Campo name="municipio" etiqueta="Municipio" valor={datos.municipio} error={errores.municipio} onChange={cambiar} list="municipios" />
          </div>
          {nuevo && (
            <div className="fila">
              <Campo name="correo" etiqueta="Correo de acceso" valor={datos.correo} error={errores.correo} onChange={cambiar} type="email" />
              <Campo name="contrasena" etiqueta="Contraseña inicial" valor={datos.contrasena} error={errores.contrasena} onChange={cambiar}
                type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
            </div>
          )}
          <ListaMunicipios />

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
          <p className="panel-vacio">Todavía no hay productores registrados.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Productor</th>
                  <th>CI o NIT</th>
                  <th>RUNPA</th>
                  <th>Teléfono</th>
                  <th>Municipio</th>
                  <th>Correo</th>
                  <th className="numero">Predios</th>
                  {esAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.codigo}</td>
                    <td>{p.nombre} {p.apellido}</td>
                    <td>{p.ci}</td>
                    <td>{p.runpa ?? '-'}</td>
                    <td>{p.telefono}</td>
                    <td>{p.municipio}</td>
                    <td>{p.correo}</td>
                    <td className="numero">{p.cantidadPredios}</td>
                    {esAdmin && (
                      <td className="acciones-fila">
                        <button className="btn-icono" onClick={() => abrir(p)} aria-label="Editar" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-icono peligro" onClick={() => eliminar(p)} aria-label="Eliminar" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
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
