import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { DocumentState } from "@/hooks/use-pdf-state"

/**
 * Exports a PDF with overlays applied according to the document state.
 * This function treats the original PDF as immutable and applies all edits as overlays.
 *
 * @param originalPdfBytes - The original PDF as ArrayBuffer
 * @param documentState - The complete document state with all overlays
 * @returns A Uint8Array containing the final PDF
 */
export async function exportFinalPDF(
  originalPdfBytes: ArrayBuffer,
  documentState: DocumentState
): Promise<Uint8Array> {
  try {
    // Load the original PDF using pdf-lib
    const pdfDoc = await PDFDocument.load(originalPdfBytes)

    // Get pages in the order specified by documentState
    const pages = pdfDoc.getPages()
    const { document: doc, pagination, pageMetrics } = documentState

    if (!doc) {
      throw new Error("No document in state")
    }

    // Iterate through pages according to the stored page order
    for (let i = 0; i < doc.pageOrder.length; i++) {
      const pageId = doc.pageOrder[i]
      const page = pages[i]
      const pageData = documentState.pages[pageId]
      const metrics = pageMetrics[pageId]

      if (!page || !pageData || !metrics) continue

      const { width: pageWidth, height: pageHeight } = page.getSize()

      // ===== ITERATION 1: PAGE NUMBERS ONLY =====
      // Render page numbers if pagination is enabled
      if (pagination.enabled) {
        const pageNumber = i + pagination.startAt
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const fontSize = 12
        const text = String(pageNumber)
        const textWidth = font.widthOfTextAtSize(text, fontSize)

        let x = 0
        let y = 0

        // Calculate position based on pagination settings
        // PDF coordinates: bottom-left origin, Y grows upward
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

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })
      }

      // ===== ITERATION 2: TEXT ELEMENTS =====
      // Render text elements
      if (pageData.texts && pageData.texts.length > 0) {
        // Use canvas dimensions for coordinate normalization (612x792 standard)
        const CANVAS_WIDTH = 612
        const CANVAS_HEIGHT = 792

        for (const textElement of pageData.texts) {
          // Normalize coordinates (absolute pixels → percentages)
          const normalizedX = textElement.x / CANVAS_WIDTH
          const normalizedY = textElement.y / CANVAS_HEIGHT
          const normalizedWidth = textElement.width / CANVAS_WIDTH
          const normalizedHeight = textElement.height / CANVAS_HEIGHT

          // Denormalize to actual page dimensions
          const absoluteX = normalizedX * pageWidth
          const absoluteY = normalizedY * pageHeight
          const absoluteHeight = normalizedHeight * pageHeight

          // Convert canvas coordinates (top-left) to PDF coordinates (bottom-left)
          const pdfY = canvasToPdfY(absoluteY, absoluteHeight, pageHeight)

          // Load font (bold if requested, fallback to regular)
          const font = textElement.bold
            ? await pdfDoc.embedFont(StandardFonts.HelveticaBold).catch(() => pdfDoc.embedFont(StandardFonts.Helvetica))
            : await pdfDoc.embedFont(StandardFonts.Helvetica)

          // Scale font size proportionally to page dimensions
          const scaledFontSize = (textElement.fontSize * pageHeight) / CANVAS_HEIGHT

          // Parse color (hex to RGB)
          const color = hexToRgb(textElement.color)

          // Calculate text position based on alignment
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
              // Left alignment (default)
              break
          }

          // Draw text
          page.drawText(textElement.content, {
            x: finalX,
            y: pdfY,
            size: scaledFontSize,
            font,
            color,
          })
        }
      }

      // ===== ITERATION 3: HIGHLIGHTS AND UNDERLINES =====
      // Render highlights
      if (pageData.highlights && pageData.highlights.length > 0) {
        const CANVAS_WIDTH = 612
        const CANVAS_HEIGHT = 792

        for (const highlight of pageData.highlights) {
          // Normalize coordinates
          const normalizedX = highlight.x / CANVAS_WIDTH
          const normalizedY = highlight.y / CANVAS_HEIGHT
          const normalizedWidth = highlight.width / CANVAS_WIDTH
          const normalizedHeight = highlight.height / CANVAS_HEIGHT

          // Denormalize to actual page dimensions
          const absoluteX = normalizedX * pageWidth
          const absoluteY = normalizedY * pageHeight
          const absoluteWidth = normalizedWidth * pageWidth
          const absoluteHeight = normalizedHeight * pageHeight

          // Convert to PDF coordinates
          const pdfY = canvasToPdfY(absoluteY, absoluteHeight, pageHeight)

          // Parse color and apply opacity
          const color = hexToRgb(highlight.color)

          // Draw rectangle with opacity
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

      // Render underlines
      if (pageData.underlines && pageData.underlines.length > 0) {
        const CANVAS_WIDTH = 612
        const CANVAS_HEIGHT = 792

        for (const underline of pageData.underlines) {
          // Normalize coordinates
          const normalizedX = underline.x / CANVAS_WIDTH
          const normalizedY = underline.y / CANVAS_HEIGHT
          const normalizedWidth = underline.width / CANVAS_WIDTH
          const normalizedHeight = underline.height / CANVAS_HEIGHT

          // Denormalize to actual page dimensions
          const absoluteX = normalizedX * pageWidth
          const absoluteY = normalizedY * pageHeight
          const absoluteWidth = normalizedWidth * pageWidth
          const absoluteHeight = normalizedHeight * pageHeight

          // Convert to PDF coordinates
          const pdfY = canvasToPdfY(absoluteY, absoluteHeight, pageHeight)

          // Parse color
          const color = hexToRgb(underline.color)

          // Draw rectangle (thin line)
          page.drawRectangle({
            x: absoluteX,
            y: pdfY,
            width: absoluteWidth,
            height: absoluteHeight,
            color: rgb(color.r, color.g, color.b),
          })
        }
      }
    }

    // Save and return the PDF
    const pdfBytes = await pdfDoc.save()
    return pdfBytes
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
