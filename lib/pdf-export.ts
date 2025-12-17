import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { DocumentState } from "@/hooks/use-pdf-state"

/**
 * Exports a PDF with overlays applied according to the document state.
 * This function treats the original PDF as immutable and applies all edits as overlays.
 *
 * @param originalPdfSources - Array of original PDFs as ArrayBuffers
 * @param documentState - The complete document state with all overlays
 * @returns A Uint8Array containing the final PDF
 */
export async function exportFinalPDF(
  originalPdfSources: ArrayBuffer[],
  documentState: DocumentState
): Promise<Uint8Array> {
  try {
    const { document: doc, pagination, pageMetrics } = documentState

    if (!doc) {
      throw new Error("No document in state")
    }

    if (!originalPdfSources.length) {
      throw new Error("No PDF sources available")
    }

    // Load all source PDFs (each import is a source)
    const sourcePdfs = await Promise.all(originalPdfSources.map((bytes) => PDFDocument.load(bytes)))

    // Build a new PDF so we can respect the current page order
    const pdfDoc = await PDFDocument.create()

    const pageEntries = doc.pageOrder.map((pageId, index) => ({
      pageId,
      metrics: pageMetrics[pageId],
      sourceIndex: pageMetrics[pageId]?.sourceIndex ?? 0,
      sourcePageIndex: pageMetrics[pageId]?.pageIndex ?? index,
    }))

    for (let i = 0; i < pageEntries.length; i++) {
      const { pageId, metrics, sourceIndex, sourcePageIndex } = pageEntries[i]
      const pageData = documentState.pages[pageId]

      const sourcePdf = sourcePdfs[sourceIndex] ?? sourcePdfs[0]
      const [page] = sourcePdf ? await pdfDoc.copyPages(sourcePdf, [sourcePageIndex]) : [undefined]

      if (!page || !pageData) continue

      pdfDoc.addPage(page)

      const { width: pageWidth, height: pageHeight } = page.getSize()
      const canvasSize = getCanvasSize(
        metrics,
        { width: pageWidth, height: pageHeight },
        documentState.coordinateSpace === "legacy-612",
      )
      const canvasWidth = canvasSize.width
      const canvasHeight = canvasSize.height
      const useTransform =
        documentState.coordinateSpace !== "legacy-612" && Array.isArray(metrics?.transform) && metrics?.transform?.length === 6

      // ===== PAGE NUMBERS =====
      if (pagination.enabled) {
        const pageNumber = i + pagination.startAt
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const fontSize = 12
        const text = String(pageNumber)
        const textWidth = font.widthOfTextAtSize(text, fontSize)

        let x = 0
        let y = 0

        switch (pagination.position) {
          case "bottom-center":
            x = (pageWidth - textWidth) / 2
            y = 20
            break
          case "bottom-right":
            x = pageWidth - textWidth - 20
            y = 20
            break
          case "top-right":
            x = pageWidth - textWidth - 20
            y = pageHeight - 20 - fontSize
            break
        }

        if (pagination.backgroundBox) {
          const padding = 5
          const boxWidth = textWidth + padding * 2
          const boxHeight = fontSize + padding * 2
          const boxX = x - padding
          const boxY = y - padding

          page.drawRectangle({
            x: boxX,
            y: boxY,
            width: boxWidth,
            height: boxHeight,
            color: rgb(1, 1, 1),
          })
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })
      }

      // ===== TEXT =====
      if (pageData.texts && pageData.texts.length > 0) {
        for (const textElement of pageData.texts) {
          const mapped = mapElementRect(
            textElement,
            { width: canvasWidth, height: canvasHeight },
            { width: pageWidth, height: pageHeight },
            useTransform ? metrics?.transform : undefined,
          )

          const font = textElement.bold
            ? await pdfDoc.embedFont(StandardFonts.HelveticaBold).catch(() => pdfDoc.embedFont(StandardFonts.Helvetica))
            : await pdfDoc.embedFont(StandardFonts.Helvetica)

          const scaledFontSize = textElement.fontSize * mapped.scale
          const color = hexToRgb(textElement.color)
          const textWidth = font.widthOfTextAtSize(textElement.content, scaledFontSize)
          const padding = 4 * mapped.scale
          const absoluteWidth = Math.max(0, mapped.width - padding * 2)

          let finalX = mapped.x + padding
          switch (textElement.textAlign) {
            case "center":
              finalX = mapped.x + padding + (absoluteWidth - textWidth) / 2
              break
            case "right":
              finalX = mapped.x + padding + absoluteWidth - textWidth
              break
            case "justify":
            case "left":
            default:
              break
          }
          const topY = mapped.y + mapped.height
          const baselineY = topY - padding - scaledFontSize

          page.drawText(textElement.content, {
            x: finalX,
            y: baselineY,
            size: scaledFontSize,
            font,
            color: rgb(color.r, color.g, color.b),
          })
        }
      }

      // ===== HIGHLIGHTS =====
      if (pageData.highlights && pageData.highlights.length > 0) {
        for (const highlight of pageData.highlights) {
          const mapped = mapElementRect(
            highlight,
            { width: canvasWidth, height: canvasHeight },
            { width: pageWidth, height: pageHeight },
            useTransform ? metrics?.transform : undefined,
          )
          const showFill = highlight.style !== "border"
          const showBorder = highlight.style !== "fill"
          const fillColor = hexToRgb(highlight.fillColor ?? highlight.color)
          const borderColor = hexToRgb(highlight.borderColor ?? highlight.color)
          const fillOpacity = highlight.fillOpacity ?? highlight.opacity
          const borderOpacity = highlight.borderOpacity ?? highlight.opacity
          const borderWidth = showBorder ? Math.max(1, (highlight.borderWidth ?? 2) * mapped.scale) : 0

          page.drawRectangle({
            x: mapped.x,
            y: mapped.y,
            width: mapped.width,
            height: mapped.height,
            color: showFill ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
            opacity: showFill ? fillOpacity : undefined,
            borderColor: showBorder ? rgb(borderColor.r, borderColor.g, borderColor.b) : undefined,
            borderWidth: showBorder ? borderWidth : undefined,
            borderOpacity: showBorder ? borderOpacity : undefined,
          })
        }
      }

      // ===== ARROWS =====
      if (pageData.arrows && pageData.arrows.length > 0) {
        for (const arrow of pageData.arrows) {
          const mapped = mapElementRect(
            arrow,
            { width: canvasWidth, height: canvasHeight },
            { width: pageWidth, height: pageHeight },
            useTransform ? metrics?.transform : undefined,
          )
          const color = hexToRgb(arrow.color)

          const stroke = Math.max(1, arrow.thickness * mapped.scale)
          const headSize = Math.min(
            mapped.width / 2,
            Math.max(stroke * 3, mapped.height * 0.35),
          )
          const mid = mapped.height / 2
          const shaftEnd = Math.max(headSize, mapped.width - headSize)

          const points = [
            { x: 0, y: mid },
            { x: shaftEnd, y: mid },
            { x: shaftEnd, y: mid }, // duplicate for polyline start
            { x: absoluteWidth - headSize, y: mid + headSize },
            { x: absoluteWidth, y: mid },
            { x: absoluteWidth - headSize, y: mid - headSize },
          ]

          const angleRad = ((arrow.angle ?? 0) * Math.PI) / 180
          const sin = Math.sin(angleRad)
          const cos = Math.cos(angleRad)

          const rotate = (px: number, py: number) => {
            const dx = px
            const dy = py - mid
            const rx = dx * cos - dy * sin
            const ry = dx * sin + dy * cos
            return { x: rx + mapped.x, y: ry + (mapped.y + mid) }
          }

          const [p0, p1, , p2, p3, p4] = points.map((p) => rotate(p.x, p.y))

          const linePath = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`
          const headPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`

          page.drawSvgPath(linePath, {
            borderColor: rgb(color.r, color.g, color.b),
            borderWidth: stroke,
          })

          page.drawSvgPath(headPath, {
            color: rgb(color.r, color.g, color.b),
          })
        }
      }
    }

    return pdfDoc.save()
  } catch (error) {
    console.error("Failed to export PDF:", error)
    throw error
  }
}

/**
 * Helper function to normalize coordinates from absolute pixels to percentages.
 * This ensures coordinates are independent of page dimensions.
 *
 * @param absoluteX - X coordinate in pixels
 * @param absoluteY - Y coordinate in pixels
 * @param pageWidth - Page width in pixels
 * @param pageHeight - Page height in pixels
 * @returns Normalized coordinates (0-1)
 */
export function normalizeCoordinates(
  absoluteX: number,
  absoluteY: number,
  pageWidth: number,
  pageHeight: number
): { normalizedX: number; normalizedY: number } {
  return {
    normalizedX: absoluteX / pageWidth,
    normalizedY: absoluteY / pageHeight,
  }
}

/**
 * Helper function to denormalize coordinates from percentages to absolute pixels.
 *
 * @param normalizedX - X coordinate as percentage (0-1)
 * @param normalizedY - Y coordinate as percentage (0-1)
 * @param pageWidth - Page width in pixels
 * @param pageHeight - Page height in pixels
 * @returns Absolute coordinates in pixels
 */
export function denormalizeCoordinates(
  normalizedX: number,
  normalizedY: number,
  pageWidth: number,
  pageHeight: number
): { absoluteX: number; absoluteY: number } {
  return {
    absoluteX: normalizedX * pageWidth,
    absoluteY: normalizedY * pageHeight,
  }
}

/**
 * Converts canvas coordinates (top-left origin) to PDF coordinates (bottom-left origin).
 *
 * @param canvasY - Y coordinate in canvas system
 * @param elementHeight - Height of the element
 * @param pageHeight - Page height
 * @returns Y coordinate in PDF system
 */
export function canvasToPdfY(canvasY: number, elementHeight: number, pageHeight: number): number {
  return pageHeight - canvasY - elementHeight
}

function mapElementRect(
  element: { x: number; y: number; width: number; height: number },
  canvasSize: { width: number; height: number },
  pageSize: { width: number; height: number },
  transform?: number[],
): { x: number; y: number; width: number; height: number; scale: number } {
  if (transform && transform.length === 6) {
    const inverse = invertTransform(transform)
    const topLeft = applyTransform(inverse, element.x, element.y)
    const bottomRight = applyTransform(inverse, element.x + element.width, element.y + element.height)

    const x = Math.min(topLeft.x, bottomRight.x)
    const y = Math.min(topLeft.y, bottomRight.y)
    const width = Math.abs(bottomRight.x - topLeft.x)
    const height = Math.abs(bottomRight.y - topLeft.y)

    const scaleX = element.width ? width / element.width : 1
    const scaleY = element.height ? height / element.height : 1
    const scale =
      Number.isFinite(scaleX) && Number.isFinite(scaleY)
        ? (scaleX + scaleY) / 2
        : Number.isFinite(scaleX)
          ? scaleX
          : scaleY

    return { x, y, width, height, scale: Number.isFinite(scale) && scale > 0 ? scale : 1 }
  }

  const normalizedX = element.x / canvasSize.width
  const normalizedY = element.y / canvasSize.height
  const normalizedWidth = element.width / canvasSize.width
  const normalizedHeight = element.height / canvasSize.height

  const absoluteX = normalizedX * pageSize.width
  const absoluteY = normalizedY * pageSize.height
  const absoluteWidth = normalizedWidth * pageSize.width
  const absoluteHeight = normalizedHeight * pageSize.height

  return {
    x: absoluteX,
    y: canvasToPdfY(absoluteY, absoluteHeight, pageSize.height),
    width: absoluteWidth,
    height: absoluteHeight,
    scale: pageSize.height / canvasSize.height,
  }
}

function applyTransform(matrix: number[], x: number, y: number): { x: number; y: number } {
  return {
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5],
  }
}

function invertTransform(matrix: number[]): number[] {
  const [a, b, c, d, e, f] = matrix
  const det = a * d - b * c
  if (!det) {
    return [1, 0, 0, 1, 0, 0]
  }
  const invDet = 1 / det
  return [
    d * invDet,
    -b * invDet,
    -c * invDet,
    a * invDet,
    (c * f - d * e) * invDet,
    (b * e - a * f) * invDet,
  ]
}

function getCanvasSize(
  metrics: { width: number; height: number } | undefined,
  fallback: { width: number; height: number },
  legacy: boolean,
): { width: number; height: number } {
  const DEFAULT_WIDTH = 612
  const DEFAULT_HEIGHT = 792

  if (legacy) {
    if (metrics?.width && metrics?.height) {
      const width = DEFAULT_WIDTH
      const height = (metrics.height / metrics.width) * width
      return { width, height }
    }

    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
  }

  if (metrics?.width && metrics?.height) {
    return { width: metrics.width, height: metrics.height }
  }

  return fallback.width && fallback.height ? fallback : { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
}

/**
 * Converts hex color to RGB values for pdf-lib.
 *
 * @param hex - Hex color string (e.g., "#ff0000" or "#f00")
 * @returns RGB object with values 0-1
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  hex = hex.replace(/^#/, "")

  // Expand shorthand form (e.g., "f00" to "ff0000")
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("")
  }

  const r = Number.parseInt(hex.substring(0, 2), 16) / 255
  const g = Number.parseInt(hex.substring(2, 4), 16) / 255
  const b = Number.parseInt(hex.substring(4, 6), 16) / 255

  return { r, g, b }
}
