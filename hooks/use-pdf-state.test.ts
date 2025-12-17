/// <reference types="vitest" />

import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { deserializeDocumentState, serializeDocumentState } from "./use-pdf-state"
import type { DocumentState } from "./use-pdf-state"

function toArrayBuffer(uint8: Uint8Array): ArrayBuffer {
  return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength)
}

describe("use-pdf-state serialization", () => {
  it("round-trips originalPdfSources, originalPdfBytes and pageMetrics", async () => {
    const source = await PDFDocument.create()
    source.addPage([200, 300])
    const sourceBytes = await source.save()
    const arrayBuffer = toArrayBuffer(sourceBytes)

    const state: DocumentState = {
      document: {
        name: "test.pdf",
        createdAt: new Date().toISOString(),
        pageOrder: ["page-1"],
      },
      pages: {
        "page-1": { texts: [], highlights: [], arrows: [] },
      },
      pagination: { enabled: false, position: "bottom-center", startAt: 1, backgroundBox: false },
      language: "en",
      coordinateSpace: "pdf",
      originalPdfBytes: arrayBuffer,
      originalPdfSources: [arrayBuffer],
      pageMetrics: {
        "page-1": { width: 200, height: 300, pageIndex: 0, sourceIndex: 0 },
      },
    }

    const saved = serializeDocumentState(state)
    const restored = deserializeDocumentState(saved)

    expect(restored).not.toBeNull()
    expect(restored?.state.originalPdfSources).toHaveLength(1)
    expect(restored?.state.originalPdfBytes).toBeInstanceOf(ArrayBuffer)
    expect(restored?.state.pageMetrics["page-1"].width).toBe(200)
    expect(restored?.currentPageId).toBe("page-1")
  })
})
