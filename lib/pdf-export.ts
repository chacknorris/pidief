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
      // TODO: Implement text elements rendering

      // ===== ITERATION 3: HIGHLIGHTS AND UNDERLINES =====
      // TODO: Implement highlights and underlines rendering
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
