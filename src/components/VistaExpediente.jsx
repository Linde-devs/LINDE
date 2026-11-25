import Etiqueta from './Etiqueta.jsx'
import MapaPredio from './MapaPredio.jsx'
import { fechaCorta, resultadosInspeccion } from './Inspecciones.jsx'

// El expediente guarda cada documento como "TituloPropiedad TIT-0214" (tipo interno y número).
// Aquí el tipo se cambia por su nombre, también en los expedientes ya generados.
const tipos = {
  TituloPropiedad: 'Título de propiedad (INRA)',
  PlanOrdenamientoPredial: 'Plan de ordenamiento predial (ABT)',
  PlanDesmonte: 'Plan de desmonte (ABT)',
}
const nombreDocumento = (texto) => {
  const [tipo, ...resto] = texto.split(' ')
  return tipos[tipo] ? [tipos[tipo], ...resto].join(' ') : texto
}

export const nombresCapa = {
  Geometrica: 'Geometría y superposición',
  Titularidad: 'Titularidad (INRA)',
  UsoSuelo: 'Uso de suelo (ABT)',
  Cobertura: 'Cobertura satelital',
}

const LEYENDA =
  'LINDE no emite certificaciones. Este expediente reúne la evidencia declarada y el resultado de las validaciones ' +
  'automáticas. El análisis satelital es informativo y tiene un margen de error de ±5 % a ±20 %.'

const ha = (n) => `${Number(n).toLocaleString('es-BO', { maximumFractionDigits: 4 })} ha`

// Expediente del predio (CU-10, RF-09), tal como lo ve quien lo recibe. Se usa en la pantalla de expedientes
// y en la consulta pública por código. Al imprimir solo queda esta parte (ver @media print en theme.css).
export default function VistaExpediente({ expediente: e }) {
  const conAlertas = e.estado === 'ConAlertas'
  return (
    <article className="expediente">
      <header className="expediente-cabecera">
        <div>
          <p className="expediente-sistema">LINDE · Sistema de gestión de polígonos</p>
          <h2>Expediente {e.codigo}</h2>
          <p className="expediente-fecha">Generado el {new Date(e.fechaGeneracion).toLocaleString('es-BO')}</p>
        </div>
        <Etiqueta valor={e.estado} />
      </header>

      <div className={`mensaje ${conAlertas ? 'mensaje-aviso' : 'mensaje-exito'}`}>
        {conAlertas
          ? 'El predio tiene alertas sin corregir. Conviene que un técnico las revise antes de iniciar el trámite.'
          : 'Las cuatro capas de validación quedaron conformes.'}
      </div>

      <section>
        <h3>Datos del predio</h3>
        <dl className="datos">
          <dt>Productor</dt>
          <dd>{e.productor}</dd>
          <dt>CI</dt>
          <dd>{e.ciProductor}</dd>
          <dt>Predio</dt>
          <dd>{e.predio}</dd>
          <dt>Municipio</dt>
          <dd>{e.departamento ? `${e.municipio}, ${e.departamento}` : e.municipio}</dd>
          <dt>Superficie declarada</dt>
          <dd>{ha(e.superficieDeclaradaHa)}</dd>
          <dt>Área del polígono</dt>
          <dd>{e.vertices.length === 1 ? 'Registrado con un punto' : ha(e.areaPoligonoHa)}</dd>
          <dt>Versión del polígono</dt>
          <dd>{e.versionPoligono}</dd>
        </dl>
      </section>

      {e.vertices.length > 0 && (
        <section>
          <h3>Ubicación</h3>
          <MapaPredio vertices={e.vertices} />
        </section>
      )}

      {conAlertas && (
        <section>
          <h3>Alertas</h3>
          <ul className="capas">
            {e.alertas.map((a, i) => (
              <li key={i}>
                <div className="capa-cabecera">
                  <strong>{nombresCapa[a.capa] ?? a.capa}</strong>
                  <Etiqueta valor={a.prioridad} />
                </div>
                <p>{a.mensaje}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>Validaciones</h3>
        <ul className="capas">
          {e.validaciones.map((c) => (
            <li key={c.capa}>
              <div className="capa-cabecera">
                <strong>{nombresCapa[c.capa] ?? c.capa}</strong>
                <Etiqueta valor={c.estado} />
              </div>
              <p>{c.mensaje}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Documentos</h3>
        {e.documentos.length > 0 ? (
          <ul className="lista-simple">
            {e.documentos.map((d) => (
              <li key={d}>{nombreDocumento(d)}</li>
            ))}
          </ul>
        ) : (
          <p className="panel-texto">No se adjuntaron documentos.</p>
        )}
      </section>

      {e.inspecciones?.length > 0 && (
        <section>
          <h3>Inspecciones de campo</h3>
          <ul className="lista-simple">
            {e.inspecciones.map((i, n) => (
              <li key={n}>
                {fechaCorta(i.fecha)} · {i.tecnico} · {resultadosInspeccion[i.resultado] ?? i.resultado}
                {i.comentario ? `: ${i.comentario}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="expediente-leyenda">
        {LEYENDA} Cualquiera puede comprobar este expediente en la consulta pública de LINDE con el código {e.codigo}.
      </p>
    </article>
  )
}
