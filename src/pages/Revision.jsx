import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN } from '../data/casosUso.js'
import Encabezado from '../components/Encabezado.jsx'
import Etiqueta from '../components/Etiqueta.jsx'
import MapaPredio from '../components/MapaPredio.jsx'
import SelectorPredio from '../components/SelectorPredio.jsx'
import { nombresCapa } from '../components/VistaExpediente.jsx'
import BotonArchivo from '../components/BotonArchivo.jsx'
import Inspecciones from '../components/Inspecciones.jsx'
import ImagenesSatelitales from '../components/ImagenesSatelitales.jsx'

const nombresDocumento = {
  TituloPropiedad: 'Título de propiedad (INRA)',
  PlanOrdenamientoPredial: 'Plan de ordenamiento predial (ABT)',
  PlanDesmonte: 'Plan de desmonte (ABT)',
}

const ha = (n) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 4 })} ha`

// CU-09. Vista para revisión: muestra al productor lo mismo que revisaría un técnico verificador
// (alertas por prioridad, mapa, documentos, resultado de cada capa y margen de error), en una sola pantalla.
// El técnico no tiene cuenta en LINDE: el productor le muestra esta vista o el expediente.
// RF-14: aquí también se registran las inspecciones de campo que hizo el técnico.
export default function Revision({ cu }) {
  const { api, usuarioActual } = useAuth()
  const [parametros, setParametros] = useSearchParams()

  const [predios, setPredios] = useState([])
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const seleccionado = Number(parametros.get('predio')) || predios[0]?.id
  const predio = predios.find((p) => p.id === seleccionado)

  useEffect(() => {
    api('/predios')
      .then(setPredios)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [api])

  const cargarDetalle = useCallback(
    async (id) => {
      setError('')
      try {
        const [poligono, documentos, validaciones, alertas, zonas] = await Promise.all([
          api(`/predios/${id}/poligono`).catch(() => null),
          api(`/predios/${id}/documentos`),
          api(`/predios/${id}/validaciones`),
          api(`/alertas?predioId=${id}`),
          api(`/predios/${id}/zonas-capas`).catch(() => []),
        ])
        setDetalle({ id, poligono, documentos, validacion: validaciones[0] ?? null, alertas, zonas })
      } catch (e) {
        setError(e.message)
      }
    },
    [api],
  )

  useEffect(() => {
    if (seleccionado) cargarDetalle(seleccionado)
  }, [seleccionado, cargarDetalle])

  if (cargando) return <p className="panel-vacio">Cargando…</p>

  if (predios.length === 0) {
    return (
      <>
        <Encabezado titulo={cu.nombre} descripcion={cu.descripcion} />
        <div className="vacio">
          <h2>No tienes predios</h2>
          <p>Registra un predio y envíalo a revisión para verlo aquí.</p>
        </div>
      </>
    )
  }

  const d = detalle?.id === seleccionado ? detalle : null

  return (
    <>
      <div className="no-imprimir">
        <Encabezado titulo={cu.nombre} descripcion={cu.descripcion}>
          <button className="btn btn-secundario" onClick={() => window.print()} disabled={!d}>
            <Printer size={16} />
            Imprimir
          </button>
        </Encabezado>
        <SelectorPredio
          predios={predios}
          valor={seleccionado}
          onChange={(id) => setParametros({ predio: String(id) })}
          mostrarProductor={usuarioActual.rol === ADMIN}
        />
      </div>
      {error && <div className="mensaje mensaje-error">{error}</div>}

      {predio && d && (
        <div className="revision">
          <section className="panel">
            <div className="panel-cabecera">
              <h2>{predio.nombre}</h2>
              <Etiqueta valor={predio.estado} />
            </div>
            {predio.estado === 'Registrado' && (
              <p className="nota">
                El predio todavía no se envió a revisión. <Link to={`/app/envio?predio=${predio.id}`}>Enviar a revisión</Link>
              </p>
            )}
            {predio.estado === 'ConAlertas' && (
              <p className="panel-texto">
                Corrige lo que indican las alertas y vuelve a enviar el predio, o genera el expediente con las alertas para
                mostrárselo a un técnico. <Link to={`/app/expedientes?predio=${predio.id}`}>Ir a expedientes</Link>
              </p>
            )}
            {predio.estado === 'Aprobado' && (
              <p className="panel-texto">
                Las cuatro capas quedaron conformes. <Link to={`/app/expedientes?predio=${predio.id}`}>Ir a expedientes</Link>
              </p>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-titulo">Alertas pendientes</h2>
            {d.alertas.length === 0 ? (
              <p className="panel-texto">No hay alertas pendientes para este predio.</p>
            ) : (
              <ul className="capas">
                {d.alertas.map((a) => (
                  <li key={a.id}>
                    <div className="capa-cabecera">
                      <strong>{nombresCapa[a.capa] ?? a.capa}</strong>
                      <Etiqueta valor={a.prioridad} />
                    </div>
                    <p>{a.mensaje}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="dos-columnas">
            <section className="panel">
              <h2 className="panel-titulo">Ubicación</h2>
              <MapaPredio vertices={d.poligono?.vertices} zonas={d.zonas} />
              {d.poligono ? (
                <p className="panel-texto">
                  {d.poligono.esPunto
                    ? 'Registrado con un punto (predio de hasta 4 ha).'
                    : `Polígono versión ${d.poligono.version}, ${d.poligono.vertices.length} vértices.`}
                </p>
              ) : (
                <p className="panel-texto">El predio todavía no tiene polígono ni punto.</p>
              )}
              {d.zonas?.length > 0 && (
                <ul className="zonas-capas">
                  {d.zonas.map((z) => (
                    <li key={z.capa} className={z.superaTolerancia ? 'zona-alerta' : 'zona-margen'}>
                      <span className="zona-muestra" aria-hidden="true" />
                      {z.titulo}: {z.areaHa.toLocaleString('es-BO', { maximumFractionDigits: 2 })} ha
                      ({z.porcentaje.toLocaleString('es-BO')} % del polígono)
                      {!z.superaTolerancia && ' · dentro de la tolerancia, no genera alerta'}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2 className="panel-titulo">Datos declarados</h2>
              <dl className="datos">
                <dt>Productor</dt>
                <dd>{predio.productor}</dd>
                <dt>Municipio</dt>
                <dd>{predio.departamento ? `${predio.municipio}, ${predio.departamento}` : predio.municipio}</dd>
                <dt>Cultivo</dt>
                <dd>{predio.cultivo}</dd>
                <dt>Superficie declarada</dt>
                <dd>{ha(predio.superficieDeclaradaHa)}</dd>
                <dt>Área del polígono</dt>
                <dd>{predio.areaPoligonoHa != null ? ha(predio.areaPoligonoHa) : 'Sin calcular'}</dd>
                <dt>Título INRA</dt>
                <dd>{predio.numeroTituloInra ?? 'No declarado'}</dd>
              </dl>
              <h2 className="panel-titulo espacio-arriba">Documentos</h2>
              {d.documentos.length === 0 ? (
                <p className="panel-texto">No se adjuntaron documentos.</p>
              ) : (
                <ul className="lista-simple">
                  {d.documentos.map((doc) => (
                    <li key={doc.id}>
                      {nombresDocumento[doc.tipo] ?? doc.tipo} {doc.numero ?? ''}
                      {doc.superficieHa != null ? ` · ${ha(doc.superficieHa)}` : ''}{' '}
                      {doc.archivoClave ? <BotonArchivo documento={doc} /> : <span className="texto-aviso">sin archivo</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="panel">
            <h2 className="panel-titulo">Resultado de las capas</h2>
            {d.validacion ? (
              <>
                <ul className="capas">
                  {d.validacion.capas.map((c) => (
                    <li key={c.capa}>
                      <div className="capa-cabecera">
                        <strong>{nombresCapa[c.capa] ?? c.capa}</strong>
                        <Etiqueta valor={c.estado} />
                      </div>
                      <p>{c.mensaje}</p>
                    </li>
                  ))}
                </ul>
                <p className="nota">
                  Validado el {new Date(d.validacion.fecha).toLocaleString('es-BO')} con la versión{' '}
                  {d.validacion.versionPoligono} del polígono. El análisis satelital es informativo y tiene un margen de error
                  de ±5 % a ±20 %. LINDE no emite la certificación.
                </p>
              </>
            ) : (
              <p className="panel-texto">Todavía no hay validaciones para este predio.</p>
            )}
          </section>

          <ImagenesSatelitales predioId={predio.id} vertices={d.poligono?.vertices} />

          <Inspecciones predioId={predio.id} />
        </div>
      )}
    </>
  )
}
