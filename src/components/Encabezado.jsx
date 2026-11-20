import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Encabezado común de las pantallas de los casos de uso: volver, título, descripción y acciones a la derecha.
export default function Encabezado({ titulo, descripcion, children }) {
  return (
    <>
      <Link to="/app" className="volver">
        <ArrowLeft size={16} />
        Volver al inicio
      </Link>
      <div className="pagina-encabezado con-acciones">
        <div>
          <h1>{titulo}</h1>
          {descripcion && <p>{descripcion}</p>}
        </div>
        {children && <div className="acciones">{children}</div>}
      </div>
    </>
  )
}
