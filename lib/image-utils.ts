import type { ImageElement, SignatureAsset } from "@/types/pdf"

const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"])

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }
      reject(new Error("Failed to read image data"))
    }
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read image"))
    reader.readAsDataURL(file)
  })
}

function loadImageDimensions(src: string): Promise<{
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () =>
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      })
    image.onerror = () => reject(new Error("Failed to decode image"))
    image.src = src
  })
}

function canvasToDataUrl(
  image: HTMLImageElement,
  width: number,
  height: number,
  mimeType: "image/png" | "image/jpeg",
): string {
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Failed to prepare image")

  if (mimeType === "image/jpeg") {
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL(
    mimeType,
    mimeType === "image/jpeg" ? 0.82 : undefined,
  )
}

async function optimizeImageData(
  src: string,
  mimeType: "image/png" | "image/jpeg",
  maxWidth: number,
  maxHeight: number,
): Promise<{ src: string; width: number; height: number }> {
  if (typeof document === "undefined") {
    const dimensions = await loadImageDimensions(src)
    return { src, ...dimensions }
  }

  const image = new Image()
  image.src = src
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error("Failed to decode image"))
  })

  const scale = Math.min(
    1,
    maxWidth / image.naturalWidth,
    maxHeight / image.naturalHeight,
  )
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  if (scale === 1 && mimeType === "image/png") return { src, width, height }

  return {
    src: canvasToDataUrl(image, width, height, mimeType),
    width,
    height,
  }
}

export function isSupportedImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.has(file.type)
}

export async function createImageElementFromFile(
  file: File,
  pageSize: { width: number; height: number },
  position?: { x: number; y: number },
): Promise<ImageElement> {
  if (!isSupportedImageFile(file)) {
    throw new Error("Unsupported image type")
  }

  const src = await readFileAsDataUrl(file)
  const { width: sourceWidth, height: sourceHeight } =
    await loadImageDimensions(src)

  const optimized = await optimizeImageData(
    src,
    file.type as "image/png" | "image/jpeg",
    1800,
    1800,
  )
  const originalWidth = sourceWidth
  const originalHeight = sourceHeight

  const maxWidth = pageSize.width * 0.45
  const maxHeight = pageSize.height * 0.35
  const widthScale = maxWidth / originalWidth
  const heightScale = maxHeight / originalHeight
  const scale = Math.min(1, widthScale, heightScale)
  const aspectRatio = Math.max(
    originalWidth / Math.max(originalHeight, 1),
    0.01,
  )
  let width = Math.max(80, originalWidth * scale)
  let height = width / aspectRatio

  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }

  return {
    id: `image-${Date.now()}`,
    type: "image",
    x: Math.max(
      0,
      Math.min(
        pageSize.width - width,
        typeof position?.x === "number"
          ? position.x - width / 2
          : (pageSize.width - width) / 2,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        pageSize.height - height,
        typeof position?.y === "number"
          ? position.y - height / 2
          : (pageSize.height - height) / 2,
      ),
    ),
    width,
    height,
    src: optimized.src,
    mimeType: file.type as "image/png" | "image/jpeg",
    originalWidth,
    originalHeight,
    lockedAspectRatio: true,
  }
}

export async function createSignatureAssetFromFile(
  file: File,
  name = "Firma cargada",
): Promise<SignatureAsset> {
  if (!isSupportedImageFile(file)) {
    throw new Error("Unsupported image type")
  }

  const src = await readFileAsDataUrl(file)
  const optimized = await optimizeImageData(
    src,
    file.type as "image/png" | "image/jpeg",
    1600,
    1000,
  )

  return {
    id: `signature-asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    source: "image",
    width: optimized.width,
    height: optimized.height,
    src: optimized.src,
    mimeType: file.type as "image/png" | "image/jpeg",
  }
}
