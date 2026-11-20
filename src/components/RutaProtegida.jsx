import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RutaProtegida({ children }) {
  const { usuarioActual, cargando } = useAuth()

  // Mientras se recupera la sesión desde la API, no se redirige todavía.
  if (cargando) return <div className="cargando">Cargando…</div>
  if (!usuarioActual) return <Navigate to="/login" replace />
  return children
}
