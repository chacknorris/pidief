/// <reference types="vitest" />

import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import {
  deserializeDocumentState,
  serializeDocumentState,
} from "./use-pdf-state"
import type { DocumentState } from "../types/pdf"

function toArrayBuffer(uint8: Uint8Array): ArrayBuffer {
  return uint8.buffer.slice(
    uint8.byteOffset,
    uint8.byteOffset + uint8.byteLength,
  ) as ArrayBuffer
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
        "page-1": {
          texts: [],
          highlights: [],
          arrows: [],
          images: [],
          textReplacements: [],
          extractedTextBlocks: [],
          footer: { number: "", detail: "" },
        },
      },
      pagination: {
        enabled: false,
        position: "bottom-center",
        startAt: 1,
        backgroundBox: false,
      },
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

  it("defaults legacy text elements to Arial when fontFamily is missing", () => {
    const restored = deserializeDocumentState(
      JSON.stringify({
        document: {
          name: "legacy.pdf",
          createdAt: new Date().toISOString(),
          pageOrder: ["page-1"],
        },
        pages: {
          "page-1": {
            texts: [
              {
                id: "text-1",
                type: "text",
                x: 10,
                y: 20,
                width: 100,
                height: 30,
                content: "Legacy",
                fontSize: 16,
                color: "#000000",
                bold: false,
                textAlign: "left",
              },
            ],
            highlights: [],
            arrows: [],
            images: [],
            textReplacements: [],
            extractedTextBlocks: [],
            footer: { number: "", detail: "" },
          },
        },
        pagination: {
          enabled: false,
          position: "bottom-center",
          startAt: 1,
          backgroundBox: false,
        },
        language: "en",
        coordinateSpace: "pdf",
        originalPdfBytes: null,
        originalPdfSources: [],
        pageMetrics: {
          "page-1": { width: 200, height: 300, pageIndex: 0, sourceIndex: 0 },
        },
      }),
    )

    expect(restored?.state.pages["page-1"].texts[0].fontFamily).toBe("Arial")
  })

  it("round-trips signature assets and page signatures", () => {
    const state: DocumentState = {
      document: {
        name: "signature.pdf",
        createdAt: new Date().toISOString(),
        pageOrder: ["page-1"],
      },
      pages: {
        "page-1": {
          texts: [],
          highlights: [],
          arrows: [],
          images: [],
          signatures: [
            {
              id: "signature-1",
              type: "signature",
              x: 10,
              y: 20,
              width: 80,
              height: 30,
              assetId: "asset-1",
              lockedAspectRatio: true,
            },
          ],
          textReplacements: [],
          extractedTextBlocks: [],
          footer: { number: "", detail: "" },
        },
      },
      pagination: {
        enabled: false,
        position: "bottom-center",
        startAt: 1,
        backgroundBox: false,
      },
      language: "en",
      coordinateSpace: "pdf",
      originalPdfBytes: null,
      originalPdfSources: [],
      pageMetrics: {
        "page-1": { width: 200, height: 300, pageIndex: 0, sourceIndex: 0 },
      },
      signatureAssets: [
        {
          id: "asset-1",
          name: "Firma",
          source: "draw",
          width: 100,
          height: 50,
          strokes: [
            {
              color: "#000000",
              width: 2,
              points: [
                { x: 2, y: 3 },
                { x: 20, y: 10 },
              ],
            },
          ],
        },
      ],
    }

    const restored = deserializeDocumentState(serializeDocumentState(state))
    expect(restored?.state.signatureAssets?.[0].strokes?.[0].points).toEqual([
      { x: 2, y: 3 },
      { x: 20, y: 10 },
    ])
    expect(restored?.state.pages["page-1"].signatures?.[0].assetId).toBe(
      "asset-1",
    )
  })
})
