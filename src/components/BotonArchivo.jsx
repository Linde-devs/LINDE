import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

// RF-16. Abre en una pestaña nueva el PDF o la imagen de un documento. El archivo se pide con el token de la sesión,
// por eso no basta con un enlace: se descarga y se muestra desde la memoria del navegador.
export default function BotonArchivo({ documento, texto = 'Ver archivo' }) {
  const { api } = useAuth()
  const [abriendo, setAbriendo] = useState(false)
  if (!documento.archivoClave) return null

  async function abrir() {
    // La pestaña se abre antes de la descarga: si se abre después, el navegador la bloquea como ventana emergente.
    const pestana = window.open('', '_blank')
    setAbriendo(true)
    try {
      const archivo = await api(`/documentos/${documento.id}/archivo`, { comoArchivo: true })
      const url = URL.createObjectURL(archivo)
      if (pestana) pestana.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      pestana?.close()
      window.alert(err.message)
    } finally {
      setAbriendo(false)
    }
  }

  return (
    <button type="button" className="enlace-chico boton-enlace" onClick={abrir} disabled={abriendo}
      title={documento.archivoNombre ?? ''}>
      <FileText size={14} />
      {abriendo ? 'Abriendo…' : texto}
    </button>
  )
}
