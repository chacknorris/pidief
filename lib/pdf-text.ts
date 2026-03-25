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
