import type { ImageElement } from "@/types/pdf"

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
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"))
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
  const { width: originalWidth, height: originalHeight } =
    await loadImageDimensions(src)

  const maxWidth = pageSize.width * 0.45
  const maxHeight = pageSize.height * 0.35
  const widthScale = maxWidth / originalWidth
  const heightScale = maxHeight / originalHeight
  const scale = Math.min(1, widthScale, heightScale)
  const aspectRatio = Math.max(originalWidth / Math.max(originalHeight, 1), 0.01)
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
    src,
    mimeType: file.type as "image/png" | "image/jpeg",
    originalWidth,
    originalHeight,
    lockedAspectRatio: true,
  }
}
