import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, ChevronUp, History, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN, PRODUCTOR, descripcionesRol } from '../data/casosUso.js'
import IlustracionPredios from '../components/IlustracionPredios.jsx'
import Etiqueta from '../components/Etiqueta.jsx'

function PoligonoADibujar() {
  const vertices = [
    [70, 150],
    [140, 60],
    [250, 45],
    [330, 110],
  ]
  const cursor = [300, 200]
  const trazado = vertices.map(([x, y]) => `${x},${y}`).join(' ')
  const [ux, uy] = vertices[vertices.length - 1]

  return (
    <svg viewBox="0 0 400 240" className="poligono-svg" role="img" aria-label="Polígono a medio dibujar">
      <defs>
        <pattern id="grilla" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#CFE3DF" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="240" rx="4" fill="#F2F7F6" />
      <rect width="400" height="240" rx="4" fill="url(#grilla)" />

      <polygon points={`${trazado} ${cursor.join(',')}`} fill="#2E7D32" fillOpacity="0.08" />
      <polyline points={trazado} fill="none" stroke="#15524A" strokeWidth="3" strokeLinejoin="round" />
      <line x1={ux} y1={uy} x2={cursor[0]} y2={cursor[1]}
        stroke="#2F8FB0" strokeWidth="2.5" strokeDasharray="8 6" />
      <line x1={cursor[0]} y1={cursor[1]} x2={vertices[0][0]} y2={vertices[0][1]}
        stroke="#2F8FB0" strokeWidth="1.5" strokeDasharray="3 6" opacity="0.6" />

      {vertices.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill="#fff" stroke="#15524A" strokeWidth="3" />
      ))}
      <circle cx={cursor[0]} cy={cursor[1]} r="9" fill="#2F8FB0" fillOpacity="0.2" stroke="#2F8FB0" strokeWidth="2" />
      <circle cx={cursor[0]} cy={cursor[1]} r="3" fill="#2F8FB0" />
    </svg>
  )
}

export default function Principal() {
  const { usuarioActual, api } = useAuth()
  const navigate = useNavigate()
  const registraPredios = usuarioActual.rol === PRODUCTOR || usuarioActual.rol === ADMIN

  // Historial: los predios del productor (el administrador ve todos). Los más recientes primero.
  const [historial, setHistorial] = useState([])
  useEffect(() => {
    if (!registraPredios) return
    api('/predios')
      .then(setHistorial)
      .catch(() => setHistorial([]))
  }, [api, registraPredios])

  const tieneHistorial = historial.length > 0

  // La descripción de LINDE se puede ocultar; la preferencia se guarda en el navegador.
  const [verIntro, setVerIntro] = useState(() => {
    try {
      return localStorage.getItem('linde.verIntro') !== 'no'
    } catch {
      return true
    }
  })
  function alternarIntro() {
    const nuevo = !verIntro
    setVerIntro(nuevo)
    try {
      localStorage.setItem('linde.verIntro', nuevo ? 'si' : 'no')
    } catch {
      // Sin almacenamiento disponible: la preferencia dura hasta recargar.
    }
  }

  return (
    <>
      <div className="pagina-encabezado">
        <h1>Bienvenido, {usuarioActual.nombre}</h1>
        <p>{descripcionesRol[usuarioActual.rol]}</p>
      </div>

      <div className="contenedor">
        <section className="intro" style={verIntro ? undefined : { minHeight: 0, padding: '20px 40px' }}>
          <h2 className="intro-titulo" style={verIntro ? undefined : { marginBottom: 12 }}>¿En qué consiste LINDE?</h2>
          <div style={{ textAlign: 'center', marginBottom: verIntro ? 24 : 0 }}>
            <button type="button" className="btn btn-secundario" onClick={alternarIntro}>
              {verIntro ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {verIntro ? 'Ocultar descripción' : 'Mostrar descripción'}
            </button>
          </div>
          {verIntro && (
          <div className="intro-cuerpo">
            <div className="intro-texto">
              <p>
                En Santa Cruz, para exportar productos agrícolas como soya, café o cacao ya no basta
                con analizar el producto. También hay que demostrar dónde se produjo y que esa tierra
                no fue deforestada después del 31 de diciembre de 2020. Hoy esa información está
                repartida entre el INRA, la ABT y el SENASAG, y los problemas suelen descubrirse
                recién cuando el expediente ya fue presentado.
              </p>
              <p>
                LINDE es un sistema web de gestión de polígonos georreferenciados que valida cada
                parcela en el momento en que se declara. Para eso revisa cuatro aspectos: que el
                polígono sea válido y no se superponga con otro predio registrado, que su superficie
                corresponda al título emitido por el INRA, que el uso de suelo esté autorizado por la
                ABT, considerando las exenciones de la Ley 741, y que no se haya perdido cobertura
                boscosa según las imágenes satelitales de Sentinel-2.
              </p>
              <p>
                Si el predio está conforme, el sistema genera un expediente digital trazable para
                presentarlo al SENASAG. Si encuentra inconsistencias, el predio queda con alertas
                priorizadas y el expediente las incluye, para que el productor las corrija o las muestre
                al técnico que lo asesora. LINDE no emite la certificación: entrega la evidencia para
                que el productor sepa si cumple antes de invertir tiempo y dinero en el trámite.
              </p>
            </div>
            <IlustracionPredios />
          </div>
          )}
        </section>

        {registraPredios && (
          <div className="fila-inferior">
            <section className="historial">
              <h2 className="panel-titulo">
                <History size={18} />
                Historial
              </h2>
              {tieneHistorial ? (
                <ul className="lista-historial">
                  {historial.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <Link to={`/app/poligonos?predio=${p.id}`}>
                        <div>
                          <strong>{p.nombre}</strong>
                          <span>
                            {p.municipio} · {p.cultivo} · {p.superficieDeclaradaHa.toLocaleString('es-BO')} ha
                            {usuarioActual.rol === ADMIN ? ` · ${p.productor}` : ''}
                          </span>
                        </div>
                        <Etiqueta valor={p.estado} />
                        <ChevronRight size={16} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="panel-vacio">Aún no has registrado ningún predio.</p>
              )}
              {historial.length > 6 && (
                <Link to="/app/predios" className="ver-todos">Ver todos los predios ({historial.length})</Link>
              )}
            </section>

            <section className="dibujo">
              <PoligonoADibujar />
              <button className="btn btn-primario btn-grande" onClick={() => navigate('/app/predios', { state: { nuevo: true } })}>
                {tieneHistorial ? (<><Plus size={18} />Nuevo predio</>) : 'Empezar'}
              </button>
            </section>
          </div>
        )}
      </div>
    </>
  )
}
