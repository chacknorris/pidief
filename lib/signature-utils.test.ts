/// <reference types="vitest" />

import { describe, expect, it } from "vitest"
import { createSignatureAssetFromStrokes } from "./signature-utils"

describe("signature helpers", () => {
  it("trims drawn signatures to their content with padding", () => {
    const asset = createSignatureAssetFromStrokes([
      {
        color: "#000000",
        width: 3,
        points: [
          { x: 20, y: 30 },
          { x: 80, y: 70 },
        ],
      },
    ])

    expect(asset.source).toBe("draw")
    expect(asset.width).toBe(84)
    expect(asset.height).toBe(64)
    expect(asset.strokes?.[0].points).toEqual([
      { x: 12, y: 12 },
      { x: 72, y: 52 },
    ])
  })

  it("rejects an empty signature", () => {
    expect(() => createSignatureAssetFromStrokes([])).toThrow()
  })
})
