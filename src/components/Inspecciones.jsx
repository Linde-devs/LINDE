import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Campo from './Campo.jsx'
import Etiqueta from './Etiqueta.jsx'

export const resultadosInspeccion = {
  Conforme: 'Conforme',
  ConObservaciones: 'Con observaciones',
  NoConforme: 'No conforme',
}

// "2026-11-20" se muestra como 20/11/2026 sin pasar por Date, para que la zona horaria no cambie el día.
export const fechaCorta = (iso) => iso.split('-').reverse().join('/')

// Hoy en Bolivia (UTC-4), en el formato del campo de fecha.
const hoy = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10)
const vacio = () => ({ fecha: hoy(), tecnico: '', resultado: 'Conforme', comentario: '' })

// RF-14 (CU-09). Inspecciones de campo del predio: el productor registra lo que anotó el técnico en su visita.
// LINDE no las valida; quedan en la Vista para revisión y en el expediente que se genere después.
export default function Inspecciones({ predioId }) {
  const { api } = useAuth()
  const [lista, setLista] = useState(null)
  const [formulario, setFormulario] = useState(null)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(
    () => api(`/predios/${predioId}/inspecciones`).then(setLista).catch((e) => setMensaje(e.message)),
    [api, predioId],
  )
  useEffect(() => {
    setFormulario(null)
    setMensaje('')
    cargar()
  }, [cargar])

  function cambiar(e) {
    setFormulario({ ...formulario, [e.target.name]: e.target.value })
    if (errores[e.target.name]) setErrores({ ...errores, [e.target.name]: undefined })
  }

  function validar(f) {
    const e = {}
    if (!f.fecha) e.fecha = 'Indica la fecha de la inspección.'
    else if (f.fecha > hoy()) e.fecha = 'La fecha no puede ser posterior a hoy.'
    if (!f.tecnico.trim()) e.tecnico = 'Escribe el nombre del técnico.'
    if (f.resultado !== 'Conforme' && !f.comentario.trim()) e.comentario = 'Anota lo que observó el técnico.'
    return e
  }

  async function guardar(e) {
    e.preventDefault()
    setMensaje('')
    const encontrados = validar(formulario)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return
    setGuardando(true)
    try {
      await api(`/predios/${predioId}/inspecciones`, { metodo: 'POST', cuerpo: formulario })
      setFormulario(null)
      await cargar()
    } catch (err) {
      if (err.campo) setErrores({ [err.campo]: err.message })
      else setMensaje(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(i) {
    if (!window.confirm(`¿Eliminar la inspección del ${fechaCorta(i.fecha)} (${i.tecnico})?`)) return
    try {
      await api(`/inspecciones/${i.id}`, { metodo: 'DELETE' })
      await cargar()
    } catch (err) {
      setMensaje(err.message)
    }
  }

  return (
    <section className="panel">
      <div className="panel-cabecera">
        <h2 className="panel-titulo"><ClipboardCheck size={18} />Inspecciones de campo</h2>
        {!formulario && (
          <button type="button" className="btn btn-secundario no-imprimir" onClick={() => { setFormulario(vacio()); setErrores({}) }}>
            <Plus size={16} />Registrar inspección
          </button>
        )}
      </div>
      {mensaje && <div className="mensaje mensaje-error">{mensaje}</div>}

      {formulario && (
        <form className="no-imprimir" onSubmit={guardar} noValidate>
          <p className="panel-texto">
            Registra lo que anotó el técnico que visitó el predio. Después vuelve a generar el expediente para que la incluya.
          </p>
          <div className="fila">
            <Campo name="fecha" etiqueta="Fecha de la visita" type="date" max={hoy()} valor={formulario.fecha}
              error={errores.fecha} onChange={cambiar} />
            <Campo name="tecnico" etiqueta="Técnico" valor={formulario.tecnico} error={errores.tecnico} onChange={cambiar}
              placeholder="Ing. Carla Rojas" maxLength={100} />
            <Campo name="resultado" etiqueta="Resultado" valor={formulario.resultado} onChange={cambiar}>
              {Object.entries(resultadosInspeccion).map(([valor, texto]) => (
                <option key={valor} value={valor}>{texto}</option>
              ))}
            </Campo>
          </div>
          <label className="campo">
            <span>Comentario del técnico{formulario.resultado === 'Conforme' ? ' (opcional)' : ''}</span>
            <textarea name="comentario" rows={3} maxLength={1000} value={formulario.comentario} onChange={cambiar}
              className={errores.comentario ? 'invalido' : ''} />
            {errores.comentario && <small className="error-campo">{errores.comentario}</small>}
          </label>
          <div className="panel-pie">
            <button type="button" className="btn btn-secundario" onClick={() => setFormulario(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar inspección'}
            </button>
          </div>
        </form>
      )}

      {lista && lista.length === 0 && !formulario && (
        <p className="panel-texto">Todavía no se registró ninguna inspección de campo para este predio.</p>
      )}
      {lista && lista.length > 0 && (
        <ul className="capas">
          {lista.map((i) => (
            <li key={i.id}>
              <div className="capa-cabecera">
                <strong>{fechaCorta(i.fecha)} · {i.tecnico}</strong>
                <span>
                  <Etiqueta valor={i.resultado} />
                  <button type="button" className="btn-icono peligro no-imprimir" title="Eliminar inspección" onClick={() => eliminar(i)}>
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
              {i.comentario && <p>{i.comentario}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
