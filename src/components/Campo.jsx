// Campo de formulario con su etiqueta y el mensaje de error debajo. Con opciones (children) se dibuja un select.
export default function Campo({ name, etiqueta, valor, error, onChange, children, ...props }) {
  const comun = { name, value: valor, onChange, className: error ? 'invalido' : '', ...props }
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children ? <select {...comun}>{children}</select> : <input {...comun} />}
      {error && <small className="error-campo">{error}</small>}
    </label>
  )
}
