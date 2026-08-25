import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { optimizeImage } from '../image'
import type { PhotoItem } from '../types'

interface Props {
  photo: PhotoItem
  editableTitle?: boolean
  removable?: boolean
  onChange: (photo: PhotoItem) => void
  onRemove?: () => void
}

export function PhotoField({ photo, editableTitle, removable, onChange, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const choose = async (file?: File) => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      onChange({ ...photo, dataUrl: await optimizeImage(file) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível processar a foto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <article className={`photo-card ${photo.dataUrl ? 'has-photo' : ''}`}>
      <div className="photo-card-title">
        {editableTitle ? <input aria-label="Título da foto" value={photo.title} onChange={(e) => onChange({ ...photo, title: e.target.value })} placeholder="Nome da foto" /> : <strong>{photo.title}</strong>}
        {removable && <button type="button" className="icon-button danger" onClick={onRemove} aria-label="Remover foto"><Trash2 size={18} /></button>}
      </div>
      <input ref={inputRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => void choose(e.target.files?.[0])} />
      {photo.dataUrl ? (
        <button type="button" className="photo-preview" onClick={() => inputRef.current?.click()}>
          <img src={photo.dataUrl} alt={photo.title} />
          <span><Camera size={18} /> Substituir</span>
        </button>
      ) : (
        <button type="button" className="photo-empty" onClick={() => inputRef.current?.click()} disabled={loading}>
          <ImagePlus size={28} /><span>{loading ? 'Otimizando...' : 'Adicionar foto'}</span><small>Câmera ou galeria</small>
        </button>
      )}
      {error && <p className="field-error">{error}</p>}
    </article>
  )
}
