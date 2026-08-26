import { Check, PenLine, RotateCcw, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SignatureData } from '../types'

interface Props {
  label: string
  value: SignatureData
  onChange: (value: SignatureData) => void
}

export function SignaturePad({ label, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [open, setOpen] = useState(false)
  const [hasStroke, setHasStroke] = useState(false)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    context?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0)
    setHasStroke(Boolean(value.dataUrl))
    if (canvas && value.dataUrl) {
      const image = new Image()
      image.onload = () => context?.drawImage(image, 0, 0, canvas.width, canvas.height)
      image.src = value.dataUrl
    }
    return () => { document.body.style.overflow = previousOverflow }
  }, [open, value.dataUrl])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) }
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    const context = event.currentTarget.getContext('2d')!
    const current = point(event)
    context.beginPath()
    context.moveTo(current.x, current.y)
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const context = event.currentTarget.getContext('2d')!
    const current = point(event)
    context.lineWidth = 5
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#201936'
    context.lineTo(current.x, current.y)
    context.stroke()
    setHasStroke(true)
  }

  const finish = () => { drawing.current = false }
  const clearCanvas = () => {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasStroke(false)
  }
  const save = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png') ?? ''
    onChange({ ...value, dataUrl, signedAt: new Date().toISOString() })
    setOpen(false)
  }
  const remove = () => onChange({ ...value, dataUrl: '', signedAt: undefined })

  return <section className="signature-card">
    <div className="section-heading compact"><div><span className="eyebrow">Assinatura</span><h3>{label}</h3></div>{value.dataUrl && <button type="button" className="icon-button danger" onClick={remove} aria-label={`Remover assinatura de ${label}`}><Trash2 size={17} /></button>}</div>
    <label className="field"><span>Nome completo</span><input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label>
    {value.dataUrl ? <div className="signature-preview"><img src={value.dataUrl} alt={`Assinatura de ${value.name || label}`} /></div> : <div className="signature-placeholder"><PenLine size={28} /><span>Nenhuma assinatura registrada</span></div>}
    <button type="button" className="secondary-button signature-open" onClick={() => setOpen(true)}><PenLine size={18} />{value.dataUrl ? 'Refazer assinatura' : 'Abrir tela para assinar'}</button>
    <p className="hint">{value.dataUrl ? 'Assinatura salva.' : 'A assinatura será feita em tela inteira.'}</p>

    {open && <div className="signature-modal" role="dialog" aria-modal="true" aria-label={`Assinar como ${label}`}>
      <div className="signature-modal-header"><div><span className="eyebrow">Assinatura</span><h2>{label}</h2><p>Assine com o dedo ou com o mouse na área abaixo.</p></div><button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Cancelar assinatura"><X size={25} /></button></div>
      <div className="signature-modal-canvas"><canvas ref={canvasRef} width={1200} height={600} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} /></div>
      <div className="signature-modal-actions"><button type="button" className="secondary-button" onClick={clearCanvas}><RotateCcw size={18} />Limpar</button><div><button type="button" className="secondary-button" onClick={() => setOpen(false)}><X size={18} />Cancelar</button><button type="button" className="primary-button" disabled={!hasStroke} onClick={save}><Check size={18} />Salvar assinatura</button></div></div>
    </div>}
  </section>
}
