import type { SignatureAsset, SignatureStroke } from "@/types/pdf"

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSignatureAssetFromStrokes(
  strokes: SignatureStroke[],
  name = "Firma dibujada",
): SignatureAsset {
  const points = strokes.flatMap((stroke) => stroke.points)
  if (!points.length) {
    throw new Error("A signature needs at least one stroke")
  }

  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))
  const padding = 12

  return {
    id: makeId("signature-asset"),
    name,
    source: "draw",
    width: Math.max(1, maxX - minX + padding * 2),
    height: Math.max(1, maxY - minY + padding * 2),
    strokes: strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({
        x: point.x - minX + padding,
        y: point.y - minY + padding,
      })),
    })),
  }
}
