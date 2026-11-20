import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Check, ChevronDown } from 'lucide-react'
import Etiqueta from './Etiqueta.jsx'

const nombresEstado = { Registrado: 'registrado', ConAlertas: 'con alertas', Aprobado: 'aprobado' }

// Quita tildes y mayúsculas para que "pailon" encuentre "Pailón".
const normalizar = (texto) =>
  (texto ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const ha = (n) => `${Number(n).toLocaleString('es-BO')} ha`

// Buscador de predios. Cerrado muestra el predio elegido; al hacer clic en él (o entrar con Tab) se abre una lista
// desplazable que se filtra mientras se escribe. Reemplaza a la lista desplegable, incómoda con muchos predios.
// Busca por nombre, municipio, departamento, cultivo, título INRA, estado y, para el administrador, por productor.
// Teclado: flechas para moverse, Enter para elegir y Esc para cerrar.
export default function SelectorPredio({ predios, valor, onChange, mostrarProductor = false }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [activo, setActivo] = useState(-1)
  const entrada = useRef(null)
  const lista = useRef(null)

  const actual = predios.find((p) => p.id === valor)

  const filtrados = useMemo(() => {
    const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
    if (palabras.length === 0) return predios
    return predios.filter((p) => {
      const campos = normalizar(
        [p.nombre, p.municipio, p.departamento, p.cultivo, p.numeroTituloInra, nombresEstado[p.estado], mostrarProductor ? p.productor : '']
          .join(' '),
      )
      return palabras.every((palabra) => campos.includes(palabra))
    })
  }, [predios, texto, mostrarProductor])

  // Al abrir, el predio elegido queda a la vista dentro de la lista.
  useEffect(() => {
    if (abierto) lista.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [abierto])

  useEffect(() => {
    if (activo >= 0) lista.current?.children[activo]?.scrollIntoView({ block: 'nearest' })
  }, [activo])

  function abrir() {
    setTexto('')
    setActivo(-1)
    setAbierto(true)
  }

  function cerrar() {
    setAbierto(false)
    setTexto('')
  }

  function elegir(id) {
    onChange(id)
    cerrar()
    entrada.current?.blur()
  }

  function teclado(e) {
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault()
      abrir()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivo((i) => Math.min(i + 1, filtrados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtrados.length > 0) {
      e.preventDefault()
      elegir(filtrados[Math.max(activo, 0)].id)
    } else if (e.key === 'Escape') {
      cerrar()
      entrada.current?.blur()
    }
  }

  const resumen = actual
    ? `${actual.nombre} · ${actual.municipio} · ${ha(actual.superficieDeclaradaHa)}${mostrarProductor ? ` · ${actual.productor}` : ''}`
    : ''

  return (
    <div className={`buscador-predio${abierto ? ' abierto' : ''}`}>
      <span className="buscador-titulo">Predio</span>
      <div className="buscador-cabecera" onMouseDown={(e) => {
        // Un clic en cualquier parte del recuadro abre el buscador.
        if (e.target !== entrada.current) {
          e.preventDefault()
          entrada.current?.focus()
        }
      }}>
        <Search size={16} aria-hidden="true" className="buscador-icono" />
        <input
          ref={entrada}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls="lista-predios"
          aria-label="Buscar predio"
          value={abierto ? texto : resumen}
          placeholder={mostrarProductor ? 'Buscar por predio, municipio, cultivo o productor' : 'Buscar por predio, municipio o cultivo'}
          onFocus={abrir}
          onBlur={cerrar}
          onChange={(e) => {
            setTexto(e.target.value)
            setActivo(-1)
          }}
          onKeyDown={teclado}
        />
        {abierto ? (
          <span className="buscador-total">
            {texto ? `${filtrados.length} de ${predios.length}` : predios.length} {predios.length === 1 ? 'predio' : 'predios'}
          </span>
        ) : (
          <>
            {actual && <Etiqueta valor={actual.estado} />}
            <ChevronDown size={16} aria-hidden="true" className="buscador-icono" />
          </>
        )}
      </div>

      {abierto && (
        <ul className="buscador-lista" id="lista-predios" role="listbox" aria-label="Predios" ref={lista}>
          {filtrados.map((p, i) => {
            const elegido = p.id === valor
            return (
              <li
                key={p.id}
                role="option"
                aria-selected={elegido}
                className={`buscador-opcion${elegido ? ' elegido' : ''}${i === activo ? ' activo' : ''}`}
                // mousedown en lugar de click: así se elige antes de que el campo pierda el foco y cierre la lista.
                onMouseDown={(e) => {
                  e.preventDefault()
                  elegir(p.id)
                }}
                onMouseEnter={() => setActivo(i)}
              >
                <span className="buscador-marca">{elegido && <Check size={16} />}</span>
                <span className="buscador-texto">
                  <strong>{p.nombre}</strong>
                  <small>
                    {p.municipio}{p.departamento ? `, ${p.departamento}` : ''} · {ha(p.superficieDeclaradaHa)}
                    {p.cultivo ? ` · ${p.cultivo}` : ''}
                    {mostrarProductor ? ` · ${p.productor}` : ''}
                  </small>
                </span>
                <Etiqueta valor={p.estado} />
              </li>
            )
          })}
          {filtrados.length === 0 && <li className="buscador-vacio">Ningún predio coincide con «{texto}».</li>}
        </ul>
      )}
    </div>
  )
}
