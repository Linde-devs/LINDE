import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Campo from './Campo.jsx'

const vacio = { nombre: '', apellido: '', ci: '', correo: '', contrasena: '' }
const CI = /^\d{5,10}$/
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Formulario para que un administrador cree otra cuenta de administrador (POST /api/auth/administradores).
export default function NuevoAdministrador({ onCerrar, onCreado }) {
  const { api } = useAuth()
  const [datos, setDatos] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  function cambiar(e) {
    const { name, value } = e.target
    setDatos({ ...datos, [name]: value })
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  function validar() {
    const e = {}
    if (!datos.nombre.trim()) e.nombre = 'Ingresa el nombre.'
    if (!datos.apellido.trim()) e.apellido = 'Ingresa el apellido.'
    if (!CI.test(datos.ci.trim())) e.ci = 'El CI debe tener entre 5 y 10 dígitos.'
    if (!CORREO.test(datos.correo.trim())) e.correo = 'El correo no es válido.'
    if (datos.contrasena.length < 8) e.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
    return e
  }

  async function guardar(e) {
    e.preventDefault()
    const encontrados = validar()
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      return
    }
    setGuardando(true)
    try {
      const creado = await api('/auth/administradores', { metodo: 'POST', cuerpo: datos })
      onCreado(creado)
    } catch (err) {
      setErrores({ [err.campo && err.campo in vacio ? err.campo : 'general']: err.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="panel" onSubmit={guardar} noValidate>
      <div className="panel-cabecera">
        <h2>Nuevo administrador</h2>
        <button type="button" className="btn-icono" onClick={onCerrar} aria-label="Cerrar">
          <X size={18} />
        </button>
      </div>

      {errores.general && <div className="mensaje mensaje-error">{errores.general}</div>}

      <div className="fila">
        <Campo name="nombre" etiqueta="Nombres" valor={datos.nombre} error={errores.nombre} onChange={cambiar} />
        <Campo name="apellido" etiqueta="Apellidos" valor={datos.apellido} error={errores.apellido} onChange={cambiar} />
        <Campo name="ci" etiqueta="CI" valor={datos.ci} error={errores.ci} onChange={cambiar} inputMode="numeric" />
      </div>
      <div className="fila">
        <Campo name="correo" etiqueta="Correo de acceso" valor={datos.correo} error={errores.correo} onChange={cambiar} type="email" />
        <Campo name="contrasena" etiqueta="Contraseña inicial" valor={datos.contrasena} error={errores.contrasena} onChange={cambiar}
          type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
      </div>

      <div className="panel-pie">
        <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button type="submit" className="btn btn-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Crear administrador'}
        </button>
      </div>
    </form>
  )
}
