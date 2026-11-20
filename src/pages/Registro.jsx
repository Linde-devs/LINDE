import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import logo from '../assets/logo.png'
import AuthLayout from '../components/AuthLayout.jsx'
import ListaMunicipios from '../components/ListaMunicipios.jsx'
import { validarProductor } from '../data/validaciones.js'

const vacio = {
  nombre: '',
  apellido: '',
  ci: '',
  runpa: '',
  telefono: '',
  municipio: '',
  correo: '',
  contrasena: '',
  confirmar: '',
}

// RF-01: el registro público es para productores. Los administradores los crea otro administrador.
// El técnico verificador y el SENASAG no tienen cuenta: consultan el expediente por su código.
export default function Registro() {
  const { registrar } = useAuth()
  const navigate = useNavigate()
  const [datos, setDatos] = useState(vacio)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)

  function cambiar(e) {
    const { name, value } = e.target
    setDatos({ ...datos, [name]: value })
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  async function enviar(e) {
    e.preventDefault()
    const nuevos = validarProductor(datos, { conCuenta: true })
    if (Object.keys(nuevos).length > 0) {
      setErrores(nuevos)
      return
    }
    setEnviando(true)
    const resultado = await registrar(datos)
    setEnviando(false)
    if (!resultado.ok) {
      // Si la API indica el campo, el error se muestra bajo ese campo; si no, arriba del formulario.
      const campo = resultado.campo && resultado.campo in vacio ? resultado.campo : 'general'
      setErrores({ [campo]: resultado.mensaje })
      return
    }
    navigate('/login', { state: { registrado: true, codigo: resultado.codigo, correo: datos.correo.trim() } })
  }

  function campo(name, etiqueta, props = {}) {
    return (
      <label className="campo">
        <span>{etiqueta}</span>
        <input
          name={name}
          value={datos[name]}
          onChange={cambiar}
          className={errores[name] ? 'invalido' : ''}
          {...props}
        />
        {errores[name] && <small className="error-campo">{errores[name]}</small>}
      </label>
    )
  }

  return (
    <AuthLayout>
      <form className="auth-card auth-card-ancha" onSubmit={enviar} noValidate>
        <img src={logo} alt="LINDE" className="auth-logo" />
        <h1>Registro de productor</h1>
        <p className="auth-sub">Crea tu cuenta para registrar tus predios y sus polígonos</p>

        {errores.general && <div className="mensaje mensaje-error">{errores.general}</div>}

        <div className="fila">
          {campo('nombre', 'Nombres', { placeholder: 'Juan Carlos', autoComplete: 'given-name' })}
          {campo('apellido', 'Apellidos', { placeholder: 'Pérez Rojas', autoComplete: 'family-name' })}
        </div>
        <div className="fila">
          {campo('ci', 'CI o NIT', { placeholder: '7845123', autoComplete: 'off' })}
          {campo('runpa', 'Código RUNPA (opcional)', { placeholder: 'Si lo tienes', autoComplete: 'off' })}
        </div>
        <div className="fila">
          {campo('telefono', 'Teléfono', { placeholder: '70012345', inputMode: 'tel', autoComplete: 'tel' })}
          {campo('municipio', 'Municipio', { placeholder: 'San Julián', list: 'municipios', autoComplete: 'off' })}
        </div>
        {campo('correo', 'Correo electrónico', { type: 'email', placeholder: 'productor@correo.bo', autoComplete: 'email' })}
        <div className="fila">
          {campo('contrasena', 'Contraseña', { type: 'password', placeholder: 'Mínimo 8 caracteres', autoComplete: 'new-password' })}
          {campo('confirmar', 'Confirmar contraseña', { type: 'password', placeholder: 'Repite la contraseña', autoComplete: 'new-password' })}
        </div>

        <button type="submit" className="btn btn-primario btn-bloque" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        <ListaMunicipios />

        <p className="auth-pie">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
