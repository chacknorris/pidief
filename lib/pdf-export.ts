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
      const { width: canvasWidth, height: canvasHeight } = getCanvasSize(metrics)

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
          const normalizedX = textElement.x / canvasWidth
          const normalizedY = textElement.y / canvasHeight
          const normalizedWidth = textElement.width / canvasWidth
          const normalizedHeight = textElement.height / canvasHeight

          const absoluteX = normalizedX * pageWidth
          const absoluteY = normalizedY * pageHeight
          const absoluteHeight = normalizedHeight * pageHeight

          const pdfY = canvasToPdfY(absoluteY, absoluteHeight, pageHeight)

          const font = textElement.bold
            ? await pdfDoc.embedFont(StandardFonts.HelveticaBold).catch(() => pdfDoc.embedFont(StandardFonts.Helvetica))
            : await pdfDoc.embedFont(StandardFonts.Helvetica)

          const scaledFontSize = (textElement.fontSize * pageHeight) / canvasHeight
          const color = hexToRgb(textElement.color)
          const textWidth = font.widthOfTextAtSize(textElement.content, scaledFontSize)
          const absoluteWidth = normalizedWidth * pageWidth

          let finalX = absoluteX
          switch (textElement.textAlign) {
            case "center":
              finalX = absoluteX + (absoluteWidth - textWidth) / 2
              break
            case "right":
              finalX = absoluteX + absoluteWidth - textWidth
              break
            case "justify":
            case "left":
            default:
              break
          }

          page.drawText(textElement.content, {
            x: finalX,
            y: pdfY,
            size: scaledFontSize,
            font,
            color: rgb(color.r, color.g, color.b),
          })
        }
      }

      // ===== HIGHLIGHTS =====
      if (pageData.highlights && pageData.highlights.length > 0) {
        for (const highlight of pageData.highlights) {
          const normalizedX = highlight.x / canvasWidth
          const normalizedY = highlight.y / canvasHeight
          const normalizedWidth = highlight.width / canvasWidth
          const normalizedHeight = highlight.height / canvasHeight

          const absoluteX = normalizedX * pageWidth
          const absoluteY = normalizedY * pageHeight
          const absoluteWidth = normalizedWidth * pageWidth
          const absoluteHeight = normalizedHeight * pageHeight

          const pdfY = canvasToPdfY(absoluteY, absoluteHeight, pageHeight)
          const color = hexToRgb(highlight.color)

          page.drawRectangle({
            x: absoluteX,
            y: pdfY,
            width: absoluteWidth,
            height: absoluteHeight,
            color: rgb(color.r, color.g, color.b),
            opacity: highlight.opacity,
          })
        }
      }

      // ===== ARROWS =====
      if (pageData.arrows && pageData.arrows.length > 0) {
        for (const arrow of pageData.arrows) {
          const normalizedX = arrow.x / canvasWidth
          const normalizedY = arrow.y / canvasHeight
          const normalizedWidth = arrow.width / canvasWidth
          const normalizedHeight = arrow.height / canvasHeight

          const absoluteX = normalizedX * pageWidth
          const absoluteY = normalizedY * pageHeight
          const absoluteWidth = normalizedWidth * pageWidth
          const absoluteHeight = normalizedHeight * pageHeight

          const pdfY = canvasToPdfY(absoluteY, absoluteHeight, pageHeight)
          const color = hexToRgb(arrow.color)

          const stroke = Math.max(1, (arrow.thickness * pageHeight) / canvasHeight)
          const headSize = Math.min(
            absoluteWidth / 2,
            Math.max(stroke * 3, absoluteHeight * 0.35),
          )
          const mid = absoluteHeight / 2
          const shaftEnd = Math.max(headSize, absoluteWidth - headSize)

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
            return { x: rx + absoluteX, y: ry + (pdfY + mid) }
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

function getCanvasSize(
  metrics?: { width: number; height: number },
): { width: number; height: number } {
  const DEFAULT_WIDTH = 612
  const DEFAULT_HEIGHT = 792

  if (metrics?.width && metrics?.height) {
    const width = DEFAULT_WIDTH
    const height = (metrics.height / metrics.width) * width
    return { width, height }
  }

  return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
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
