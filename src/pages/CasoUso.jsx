import { Navigate, useParams } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { casosUso, puedeVer } from '../data/casosUso.js'
import Encabezado from '../components/Encabezado.jsx'
import Modulo from './Modulo.jsx'
import Productores from './Productores.jsx'
import Predios from './Predios.jsx'
import Poligonos from './Poligonos.jsx'
import Envio from './Envio.jsx'
import Documentos from './Documentos.jsx'
import Validacion from './Validacion.jsx'
import Alertas from './Alertas.jsx'
import Revision from './Revision.jsx'
import Expedientes from './Expedientes.jsx'
import Capas from './Capas.jsx'
import Parametros from './Parametros.jsx'
import Bitacora from './Bitacora.jsx'

// Pantallas ya implementadas. Las demás muestran "Módulo en construcción".
const paginas = {
  productores: Productores,
  predios: Predios,
  poligonos: Poligonos,
  envio: Envio,
  documentos: Documentos,
  validacion: Validacion,
  alertas: Alertas,
  revision: Revision,
  expedientes: Expedientes,
  capas: Capas,
  parametros: Parametros,
  bitacora: Bitacora,
}

// RF-11: aunque alguien escriba la dirección a mano, solo entra si su rol tiene ese caso de uso.
export default function CasoUso() {
  const { ruta } = useParams()
  const { usuarioActual } = useAuth()
  const cu = casosUso.find((c) => c.ruta === ruta)
  if (!cu) return <Navigate to="/app" replace />

  if (!puedeVer(cu, usuarioActual.rol)) {
    return (
      <>
        <Encabezado titulo={cu.nombre} />
        <div className="vacio">
          <div className="tarjeta-icono grande">
            <ShieldAlert size={32} />
          </div>
          <h2>Acceso denegado</h2>
          <p>Tu rol no tiene acceso a esta opción.</p>
        </div>
      </>
    )
  }

  const Pagina = paginas[ruta] ?? Modulo
  return <Pagina cu={cu} />
}
