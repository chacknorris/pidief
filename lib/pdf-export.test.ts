/// <reference types="vitest" />

import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { canvasToPdfY, denormalizeCoordinates, exportFinalPDF, normalizeCoordinates } from "./pdf-export"
import type { DocumentState } from "../hooks/use-pdf-state"

function toArrayBuffer(uint8: Uint8Array): ArrayBuffer {
  return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength)
}

describe("pdf-export helpers", () => {
  it("normalizes and denormalizes coordinates reversibly", () => {
    const { normalizedX, normalizedY } = normalizeCoordinates(306, 396, 612, 792)
    expect(normalizedX).toBeCloseTo(0.5)
    expect(normalizedY).toBeCloseTo(0.5)

    const { absoluteX, absoluteY } = denormalizeCoordinates(normalizedX, normalizedY, 612, 792)
    expect(absoluteX).toBeCloseTo(306)
    expect(absoluteY).toBeCloseTo(396)
  })

  it("converts canvas Y to PDF coordinates (top-left → bottom-left)", () => {
    const pdfY = canvasToPdfY(100, 20, 400)
    expect(pdfY).toBe(280) // 400 - 100 - 20
  })
})

describe("exportFinalPDF", () => {
  it("respects pageIndex and pageOrder when copying the source PDF", async () => {
    const source = await PDFDocument.create()
    source.addPage([200, 300]) // page 0
    source.addPage([300, 400]) // page 1
    const sourceBytes = await source.save()

    const state: DocumentState = {
      document: {
        name: "test.pdf",
        createdAt: new Date().toISOString(),
        pageOrder: ["page-b", "page-a"], // reverse order
      },
      pages: {
        "page-a": { texts: [], highlights: [], underlines: [] },
        "page-b": { texts: [], highlights: [], underlines: [] },
      },
      pagination: { enabled: false, position: "bottom-center", startAt: 1, backgroundBox: false },
      originalPdfBytes: toArrayBuffer(sourceBytes),
      originalPdfSources: [toArrayBuffer(sourceBytes)],
      pageMetrics: {
        "page-a": { width: 200, height: 300, pageIndex: 0, sourceIndex: 0 },
        "page-b": { width: 300, height: 400, pageIndex: 1, sourceIndex: 0 },
      },
    }

    const exportedBytes = await exportFinalPDF([state.originalPdfSources[0]], state)
    const exported = await PDFDocument.load(exportedBytes)
    const pages = exported.getPages()

    expect(pages).toHaveLength(2)

    // First page should come from pageIndex 1 (300x400)
    const size0 = pages[0].getSize()
    expect(size0.width).toBeCloseTo(300)
    expect(size0.height).toBeCloseTo(400)

    // Second page should come from pageIndex 0 (200x300)
    const size1 = pages[1].getSize()
    expect(size1.width).toBeCloseTo(200)
    expect(size1.height).toBeCloseTo(300)
  })

  it("supports merging pages from multiple PDF sources", async () => {
    const srcA = await PDFDocument.create()
    srcA.addPage([200, 300])
    const bytesA = await srcA.save()

    const srcB = await PDFDocument.create()
    srcB.addPage([400, 500])
    const bytesB = await srcB.save()

    const state: DocumentState = {
      document: {
        name: "merge.pdf",
        createdAt: new Date().toISOString(),
        pageOrder: ["page-a", "page-b"],
      },
      pages: {
        "page-a": { texts: [], highlights: [], underlines: [] },
        "page-b": { texts: [], highlights: [], underlines: [] },
      },
      pagination: { enabled: false, position: "bottom-center", startAt: 1, backgroundBox: false },
      originalPdfBytes: toArrayBuffer(bytesA),
      originalPdfSources: [toArrayBuffer(bytesA), toArrayBuffer(bytesB)],
      pageMetrics: {
        "page-a": { width: 200, height: 300, pageIndex: 0, sourceIndex: 0 },
        "page-b": { width: 400, height: 500, pageIndex: 0, sourceIndex: 1 },
      },
    }

    const exportedBytes = await exportFinalPDF(state.originalPdfSources, state)
    const exported = await PDFDocument.load(exportedBytes)
    const pages = exported.getPages()

    expect(pages).toHaveLength(2)
    expect(pages[0].getWidth()).toBeCloseTo(200)
    expect(pages[0].getHeight()).toBeCloseTo(300)
    expect(pages[1].getWidth()).toBeCloseTo(400)
    expect(pages[1].getHeight()).toBeCloseTo(500)
  })
})
