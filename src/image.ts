const MAX_SIDE = 1600
const JPEG_QUALITY = 0.78

export async function optimizeImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) throw new Error('Selecione um arquivo de imagem.')
  if (file.size > 30 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 30 MB.')

  let source: CanvasImageSource
  let width: number
  let height: number
  let cleanup: () => void = () => {}
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    source = bitmap
    width = bitmap.width
    height = bitmap.height
    cleanup = () => bitmap.close()
  } catch {
    const objectUrl = URL.createObjectURL(file)
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('O formato desta imagem não pôde ser aberto.'))
      element.src = objectUrl
    }).catch((error) => { URL.revokeObjectURL(objectUrl); throw error })
    source = image
    width = image.naturalWidth
    height = image.naturalHeight
    cleanup = () => URL.revokeObjectURL(objectUrl)
  }

  const ratio = Math.min(1, MAX_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível processar a imagem.')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  cleanup()
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}
