import Encabezado from '../components/Encabezado.jsx'

// Pantalla genérica para los módulos que todavía no se implementan.
export default function Modulo({ cu }) {
  const Icono = cu.icono

  return (
    <>
      <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />

      <div className="vacio">
        <div className="tarjeta-icono grande">
          <Icono size={32} />
        </div>
        <h2>Módulo en construcción</h2>
        <p>Esta pantalla se implementará en los próximos sprints.</p>
      </div>
    </>
  )
}
