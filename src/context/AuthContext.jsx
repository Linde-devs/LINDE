import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { solicitud } from '../api/cliente.js'

// La sesión ahora la maneja la API: aquí solo se guarda el token que devuelve el login.
// sessionStorage conserva la sesión al recargar la página y la borra al cerrar la pestaña.
const CLAVE_TOKEN = 'linde.token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(CLAVE_TOKEN))
  const [usuarioActual, setUsuarioActual] = useState(null)
  const [cargando, setCargando] = useState(() => Boolean(sessionStorage.getItem(CLAVE_TOKEN)))

  const cerrarSesion = useCallback(() => {
    sessionStorage.removeItem(CLAVE_TOKEN)
    setToken(null)
    setUsuarioActual(null)
  }, [])

  // Al abrir o recargar la página, si hay un token guardado, se le pide a la API el usuario de esa sesión.
  useEffect(() => {
    if (!token || usuarioActual) {
      setCargando(false)
      return
    }
    let vigente = true
    solicitud('/auth/yo', { token })
      .then((usuario) => vigente && setUsuarioActual(usuario))
      .catch(() => vigente && cerrarSesion())
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [token, usuarioActual, cerrarSesion])

  // RF-01: el registro público crea un productor con su cuenta. La API devuelve su código único.
  async function registrar(datos) {
    try {
      const productor = await solicitud('/auth/registro', {
        metodo: 'POST',
        cuerpo: {
          nombre: datos.nombre,
          apellido: datos.apellido,
          ci: datos.ci,
          runpa: datos.runpa || null,
          telefono: datos.telefono,
          municipio: datos.municipio,
          correo: datos.correo,
          contrasena: datos.contrasena,
        },
      })
      return { ok: true, codigo: productor.codigo }
    } catch (error) {
      return { ok: false, campo: error.campo, mensaje: error.message }
    }
  }

  async function iniciarSesion(correo, contrasena) {
    try {
      const respuesta = await solicitud('/auth/login', { metodo: 'POST', cuerpo: { correo, contrasena } })
      sessionStorage.setItem(CLAVE_TOKEN, respuesta.token)
      setToken(respuesta.token)
      setUsuarioActual(respuesta.usuario)
      return { ok: true }
    } catch (error) {
      return { ok: false, mensaje: error.message }
    }
  }

  // Para los módulos: llama a la API con el token de la sesión. Si la sesión expiró, la cierra.
  const api = useCallback(
    async (ruta, opciones = {}) => {
      try {
        return await solicitud(ruta, { ...opciones, token })
      } catch (error) {
        if (error.estado === 401) cerrarSesion()
        throw error
      }
    },
    [token, cerrarSesion],
  )

  return (
    <AuthContext.Provider value={{ usuarioActual, cargando, registrar, iniciarSesion, cerrarSesion, api }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
