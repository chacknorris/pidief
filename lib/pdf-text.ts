import type { PdfTextBlock } from "@/types/pdf"
import { inferTextFontFamily } from "./text-fonts"

interface PdfJsTextItem {
  str?: string
  transform?: number[]
  width?: number
  height?: number
  fontName?: string
  hasEOL?: boolean
}

interface PdfJsTextStyle {
  fontFamily?: string
  ascent?: number
  descent?: number
}

interface SampledPixel {
  r: number
  g: number
  b: number
  weight: number
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getAxisScale(a = 0, b = 0): number {
  return Math.max(0, Math.hypot(a, b))
}

function normalizeAscent(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0.82
  return clamp(Number(value), 0.55, 1.2)
}

function normalizeDescent(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0.22
  return clamp(Math.abs(Number(value)), 0.08, 0.45)
}

function looksBold(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => /bold|black|semibold|demi/i.test(value ?? ""))
}

function looksItalic(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => /italic|oblique|slanted/i.test(value ?? ""))
}

function getBlockId(
  index: number,
  x: number,
  y: number,
  width: number,
  text: string,
): string {
  return `text-block-${index}-${round(x)}-${round(y)}-${round(width)}-${text.length}`
}

function componentToHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0")
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace(/^#/, "")
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized

  return {
    r: Number.parseInt(expanded.substring(0, 2), 16),
    g: Number.parseInt(expanded.substring(2, 4), 16),
    b: Number.parseInt(expanded.substring(4, 6), 16),
  }
}

function getPixelLuminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function getColorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2)
}

export function inferTextBlockColor(
  imageData:
    | ImageData
    | { data: Uint8ClampedArray; width: number; height: number },
  block: Pick<PdfTextBlock, "x" | "y" | "width" | "height">,
  backgroundColor?: string,
): string {
  const startX = Math.max(0, Math.floor(block.x))
  const startY = Math.max(0, Math.floor(block.y))
  const endX = Math.min(imageData.width, Math.ceil(block.x + block.width))
  const endY = Math.min(imageData.height, Math.ceil(block.y + block.height))
  const background = hexToRgb(backgroundColor ?? "#ffffff")

  const samples: SampledPixel[] = []

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const index = (y * imageData.width + x) * 4
      const alpha = imageData.data[index + 3]
      if (alpha < 24) continue

      const r = imageData.data[index]
      const g = imageData.data[index + 1]
      const b = imageData.data[index + 2]
      const distanceFromBackground = getColorDistance(
        r,
        g,
        b,
        background.r,
        background.g,
        background.b,
      )
      const luminance = getPixelLuminance(r, g, b)
      const luminanceDistance = Math.abs(
        luminance - getPixelLuminance(background.r, background.g, background.b),
      )
      const weight = distanceFromBackground * 2 + luminanceDistance

      if (weight < 20) continue

      samples.push({ r, g, b, weight })
    }
  }

  if (!samples.length) return "#000000"

  let totalWeight = 0
  let weightedR = 0
  let weightedG = 0
  let weightedB = 0

  for (const sample of samples) {
    totalWeight += sample.weight
    weightedR += sample.r * sample.weight
    weightedG += sample.g * sample.weight
    weightedB += sample.b * sample.weight
  }

  if (!totalWeight) return "#000000"

  return rgbToHex(
    weightedR / totalWeight,
    weightedG / totalWeight,
    weightedB / totalWeight,
  )
}

export function inferTextBlockBackgroundColor(
  imageData:
    | ImageData
    | { data: Uint8ClampedArray; width: number; height: number },
  block: Pick<PdfTextBlock, "x" | "y" | "width" | "height" | "fontSize">,
): string {
  const padding = Math.max(2, Math.round(block.fontSize * 0.25))
  const startX = Math.max(0, Math.floor(block.x - padding))
  const startY = Math.max(0, Math.floor(block.y - padding))
  const endX = Math.min(
    imageData.width,
    Math.ceil(block.x + block.width + padding),
  )
  const endY = Math.min(
    imageData.height,
    Math.ceil(block.y + block.height + padding),
  )
  const innerStartX = Math.max(0, Math.floor(block.x))
  const innerStartY = Math.max(0, Math.floor(block.y))
  const innerEndX = Math.min(imageData.width, Math.ceil(block.x + block.width))
  const innerEndY = Math.min(
    imageData.height,
    Math.ceil(block.y + block.height),
  )

  let totalWeight = 0
  let weightedR = 0
  let weightedG = 0
  let weightedB = 0

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const insideSourceRect =
        x >= innerStartX && x < innerEndX && y >= innerStartY && y < innerEndY
      if (insideSourceRect) continue

      const index = (y * imageData.width + x) * 4
      const alpha = imageData.data[index + 3]
      if (alpha < 24) continue

      const r = imageData.data[index]
      const g = imageData.data[index + 1]
      const b = imageData.data[index + 2]
      const weight = alpha / 255

      totalWeight += weight
      weightedR += r * weight
      weightedG += g * weight
      weightedB += b * weight
    }
  }

  if (!totalWeight) return "#ffffff"

  return rgbToHex(
    weightedR / totalWeight,
    weightedG / totalWeight,
    weightedB / totalWeight,
  )
}

export function inferTextBlockColors(
  blocks: PdfTextBlock[],
  imageData:
    | ImageData
    | { data: Uint8ClampedArray; width: number; height: number },
): PdfTextBlock[] {
  return blocks
    .map((block) => ({
      ...block,
      backgroundColor: inferTextBlockBackgroundColor(imageData, block),
    }))
    .map((block) => ({
      ...block,
      color: inferTextBlockColor(imageData, block, block.backgroundColor),
    }))
}

export function extractTextBlocksFromPage(
  textItems: PdfJsTextItem[],
  styles: Record<string, PdfJsTextStyle> | undefined,
  viewport: { transform?: number[] },
  pdfjsLib: { Util?: { transform?: (a: number[], b: number[]) => number[] } },
): PdfTextBlock[] {
  const blocks = textItems
    .map((item, index) => {
      const rawText = item.str ?? ""
      const text = rawText.trim()
      if (
        !text ||
        !Array.isArray(item.transform) ||
        item.transform.length !== 6
      ) {
        return null
      }

      const transform = pdfjsLib.Util?.transform
        ? pdfjsLib.Util.transform(
            viewport.transform || [1, 0, 0, 1, 0, 0],
            item.transform,
          )
        : item.transform

      const style = item.fontName ? styles?.[item.fontName] : undefined
      const scaleX = getAxisScale(transform[0], transform[1])
      const scaleY = getAxisScale(transform[2], transform[3])
      const fontSize = round(Math.max(1, scaleY || scaleX || item.height || 12))
      const ascent = normalizeAscent(style?.ascent)
      const descent = normalizeDescent(style?.descent)
      const lineHeight = round(
        Math.max(fontSize, fontSize * (ascent + descent)),
      )
      const baselineOffset = round(
        clamp(fontSize * ascent, fontSize * 0.65, lineHeight - 1),
      )
      const width = round(
        Math.max(
          1,
          item.width ?? 0,
          scaleX > 0 ? scaleX * Math.max(0.45, text.length * 0.45) : 0,
        ),
      )
      const x = round(transform[4] ?? 0)
      const y = round((transform[5] ?? 0) - baselineOffset)
      const fontFamily = inferTextFontFamily(item.fontName, style?.fontFamily)
      const bold = looksBold(item.fontName, style?.fontFamily)
      const italic = looksItalic(item.fontName, style?.fontFamily)

      return {
        id: getBlockId(index, x, y, width, text),
        text,
        x,
        y,
        width,
        height: lineHeight,
        fontSize,
        lineHeight,
        baselineOffset,
        fontFamily,
        color: "#000000",
        backgroundColor: "#ffffff",
        sourceFontName: item.fontName ?? null,
        sourceFontFamily: style?.fontFamily ?? null,
        bold,
        italic,
      } satisfies PdfTextBlock
    })
    .filter((item): item is PdfTextBlock => Boolean(item))
    .sort((a, b) => {
      const aBaseline = a.y + a.baselineOffset
      const bBaseline = b.y + b.baselineOffset
      return Math.abs(aBaseline - bBaseline) <= 2 ? a.x - b.x : a.y - b.y
    })

  if (!blocks.length) return []

  const grouped: PdfTextBlock[] = []

  for (const block of blocks) {
    const previous = grouped[grouped.length - 1]
    if (!previous) {
      grouped.push(block)
      continue
    }

    const previousBaseline = previous.y + previous.baselineOffset
    const currentBaseline = block.y + block.baselineOffset
    const sameLine =
      Math.abs(previousBaseline - currentBaseline) <=
      Math.max(2, previous.fontSize * 0.22)
    const sameStyle =
      previous.fontFamily === block.fontFamily &&
      previous.bold === block.bold &&
      previous.italic === block.italic &&
      Math.abs(previous.fontSize - block.fontSize) <=
        Math.max(1, previous.fontSize * 0.12)
    const gap = block.x - (previous.x + previous.width)
    const canMerge =
      sameLine &&
      sameStyle &&
      gap >= -1 &&
      gap <= Math.max(8, previous.fontSize * 0.9)

    if (!canMerge) {
      grouped.push(block)
      continue
    }

    const needsSpace = gap > Math.max(1.5, previous.fontSize * 0.14)
    previous.text = `${previous.text}${needsSpace ? " " : ""}${block.text}`
    previous.width = round(
      Math.max(previous.width, block.x + block.width - previous.x),
    )
    previous.height = round(Math.max(previous.height, block.height))
    previous.fontSize = round(Math.max(previous.fontSize, block.fontSize))
    previous.lineHeight = round(Math.max(previous.lineHeight, block.lineHeight))
    previous.baselineOffset = round(
      Math.max(previous.baselineOffset, block.baselineOffset),
    )
  }

  return grouped
}
