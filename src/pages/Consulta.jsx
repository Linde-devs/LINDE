import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, Printer } from 'lucide-react'
import { solicitud } from '../api/cliente.js'
import VistaExpediente from '../components/VistaExpediente.jsx'

// RF-15. Consulta pública del expediente por su código, sin iniciar sesión y solo de lectura.
// La usan el técnico verificador o el SENASAG para comprobar el expediente que les muestra el productor.
export default function Consulta() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const [texto, setTexto] = useState(codigo ?? '')
  const [expediente, setExpediente] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!codigo) {
      setExpediente(null)
      return
    }
    let vigente = true
    setCargando(true)
    setError('')
    solicitud(`/consulta/${encodeURIComponent(codigo)}`)
      .then((e) => vigente && setExpediente(e))
      .catch((e) => {
        if (!vigente) return
        setExpediente(null)
        setError(e.message)
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [codigo])

  function buscar(e) {
    e.preventDefault()
    const limpio = texto.trim().toUpperCase()
    if (limpio) navigate(`/consulta/${limpio}`)
  }

  return (
    <div className="consulta">
      <div className="contenedor">
        <div className="no-imprimir">
          <Link to="/login" className="volver">Ir a LINDE</Link>
          <div className="pagina-encabezado">
            <h1>Consulta de expediente</h1>
            <p>Escribe el código que figura en el expediente, por ejemplo LINDE-2026-000001.</p>
          </div>
          <form className="consulta-buscador" onSubmit={buscar}>
            <label className="campo">
              <span>Código del expediente</span>
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="LINDE-2026-000001" />
            </label>
            <button type="submit" className="btn btn-primario">
              <Search size={16} />
              Consultar
            </button>
            {expediente && (
              <button type="button" className="btn btn-secundario" onClick={() => window.print()}>
                <Printer size={16} />
                Imprimir
              </button>
            )}
          </form>
          {cargando && <p className="panel-vacio">Buscando…</p>}
          {error && <div className="mensaje mensaje-error">{error}</div>}
        </div>

        {expediente && <VistaExpediente expediente={expediente} />}
      </div>
    </div>
  )
}
