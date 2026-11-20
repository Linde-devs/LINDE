// Etiquetas de color para los estados del predio y de cada capa de validación.
const textos = {
  Registrado: 'Registrado',
  ConAlertas: 'Con alertas',
  Aprobado: 'Aprobado',
  Conforme: 'Conforme',
  Alerta: 'Alerta',
  Rechazado: 'Rechazado',
  Alta: 'Prioridad alta',
  Media: 'Prioridad media',
  Baja: 'Prioridad baja',
}

const clases = {
  Registrado: 'neutra',
  ConAlertas: 'aviso',
  Aprobado: 'exito',
  Conforme: 'exito',
  Alerta: 'aviso',
  Rechazado: 'error',
  Alta: 'error',
  Media: 'aviso',
  Baja: 'info',
}

export default function Etiqueta({ valor }) {
  return <span className={`etiqueta etiqueta-${clases[valor] ?? 'neutra'}`}>{textos[valor] ?? valor}</span>
}
