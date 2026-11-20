import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import Principal from './pages/Principal.jsx'
import CasoUso from './pages/CasoUso.jsx'
import Consulta from './pages/Consulta.jsx'
import Layout from './components/Layout.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      {/* RF-15: consulta pública del expediente, sin iniciar sesión. */}
      <Route path="/consulta" element={<Consulta />} />
      <Route path="/consulta/:codigo" element={<Consulta />} />

      <Route
        path="/app"
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Principal />} />
        <Route path=":ruta" element={<CasoUso />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
