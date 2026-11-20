import { municipiosPorDepartamento } from '../data/divisionPolitica.js'

// Sugerencias para el campo Municipio: los del departamento elegido o, sin departamento, los 340 de Bolivia.
const todos = [...new Set(Object.values(municipiosPorDepartamento).flat())].sort((a, b) => a.localeCompare(b, 'es'))

export default function ListaMunicipios({ departamento }) {
  const lista = (departamento && municipiosPorDepartamento[departamento]) || todos
  return (
    <datalist id="municipios">
      {lista.map((m) => (
        <option key={m} value={m} />
      ))}
    </datalist>
  )
}
