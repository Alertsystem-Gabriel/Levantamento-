import { Camera, ImagePlus, Images, Trash2 } from 'lucide-react'
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
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const choose = async (file?: File, input?: HTMLInputElement) => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      onChange({ ...photo, dataUrl: await optimizeImage(file) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível processar a foto.')
    } finally {
      setLoading(false)
      if (input) input.value = ''
    }
  }

  return (
    <article className={`photo-card ${photo.dataUrl ? 'has-photo' : ''}`}>
      <div className="photo-card-title">
        {editableTitle ? <input aria-label="Título da foto" value={photo.title} onChange={(e) => onChange({ ...photo, title: e.target.value })} placeholder="Nome da foto" /> : <strong>{photo.title}</strong>}
        {removable && <button type="button" className="icon-button danger" onClick={onRemove} aria-label="Remover foto"><Trash2 size={18} /></button>}
      </div>
      <input ref={galleryRef} hidden type="file" accept="image/*,.heic,.heif" onChange={(e) => void choose(e.target.files?.[0], e.currentTarget)} />
      <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => void choose(e.target.files?.[0], e.currentTarget)} />
      {photo.dataUrl ? (
        <div className="photo-preview">
          <img src={photo.dataUrl} alt={photo.title} />
        </div>
      ) : (
        <div className="photo-empty">
          <ImagePlus size={28} /><span>{loading ? 'Otimizando...' : 'Adicionar foto'}</span><small>Câmera ou galeria</small>
        </div>
      )}
      <div className="photo-actions">
        <button type="button" onClick={() => galleryRef.current?.click()} disabled={loading}><Images size={17} />Galeria</button>
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={loading}><Camera size={17} />Câmera</button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </article>
  )
}
