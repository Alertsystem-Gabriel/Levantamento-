import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { SignatureData } from '../types'

interface Props {
  label: string
  value: SignatureData
  onChange: (value: SignatureData) => void
}

export function SignaturePad({ label, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasStroke, setHasStroke] = useState(Boolean(value.dataUrl))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value.dataUrl) return
    const image = new Image()
    image.onload = () => canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.src = value.dataUrl
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) }
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    const ctx = event.currentTarget.getContext('2d')!
    const p = point(event)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = event.currentTarget.getContext('2d')!
    const p = point(event)
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#201936'
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    setHasStroke(true)
  }

  const finish = () => {
    if (!drawing.current) return
    drawing.current = false
    const dataUrl = canvasRef.current?.toDataURL('image/png') ?? ''
    onChange({ ...value, dataUrl, signedAt: new Date().toISOString() })
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasStroke(false)
    onChange({ ...value, dataUrl: '', signedAt: undefined })
  }

  return (
    <section className="signature-card">
      <div className="section-heading compact">
        <div><span className="eyebrow">Assinatura</span><h3>{label}</h3></div>
        <button type="button" className="icon-button" onClick={clear} aria-label={`Limpar ${label}`}><RotateCcw size={18} /></button>
      </div>
      <label className="field"><span>Nome completo</span><input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></label>
      <canvas
        ref={canvasRef}
        width={700}
        height={220}
        className="signature-canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <p className="hint">{hasStroke ? 'Assinatura registrada.' : 'Assine com o dedo ou com o mouse dentro da área.'}</p>
    </section>
  )
}
