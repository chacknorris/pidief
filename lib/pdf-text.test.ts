/// <reference types="vitest" />

import { describe, expect, it } from "vitest"
import { extractTextBlocksFromPage } from "./pdf-text"

describe("extractTextBlocksFromPage", () => {
  it("keeps font metrics and inferred style for extracted text blocks", () => {
    const blocks = extractTextBlocksFromPage(
      [
        {
          str: "Glosa",
          transform: [12, 0, 0, 12, 32, 140],
          width: 34,
          height: 12,
          fontName: "ABCDEE+Helvetica-BoldOblique",
        },
      ],
      {
        "ABCDEE+Helvetica-BoldOblique": {
          fontFamily: "Helvetica-BoldOblique",
          ascent: 0.82,
          descent: -0.18,
        },
      },
      {
        transform: [1, 0, 0, -1, 0, 200],
      },
      {
        Util: {
          transform: (a, b) => [
            a[0] * b[0] + a[2] * b[1],
            a[1] * b[0] + a[3] * b[1],
            a[0] * b[2] + a[2] * b[3],
            a[1] * b[2] + a[3] * b[3],
            a[0] * b[4] + a[2] * b[5] + a[4],
            a[1] * b[4] + a[3] * b[5] + a[5],
          ],
        },
      },
    )

    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      text: "Glosa",
      x: 32,
      fontSize: 12,
      lineHeight: 12,
      baselineOffset: 9.84,
      fontFamily: "Helvetica",
      bold: true,
      italic: true,
      sourceFontName: "ABCDEE+Helvetica-BoldOblique",
      sourceFontFamily: "Helvetica-BoldOblique",
    })
    expect(blocks[0].y).toBeCloseTo(50.16)
  })

  it("merges adjacent text items only when line and style match", () => {
    const blocks = extractTextBlocksFromPage(
      [
        {
          str: "Neto",
          transform: [10, 0, 0, 10, 20, 90],
          width: 20,
          height: 10,
          fontName: "Helvetica",
        },
        {
          str: "afecto",
          transform: [10, 0, 0, 10, 44, 90],
          width: 30,
          height: 10,
          fontName: "Helvetica",
        },
        {
          str: "IVA",
          transform: [10, 0, 0, 10, 20, 72],
          width: 18,
          height: 10,
          fontName: "Times-Roman",
        },
      ],
      {
        Helvetica: { fontFamily: "Helvetica", ascent: 0.8, descent: -0.2 },
        "Times-Roman": {
          fontFamily: "Times-Roman",
          ascent: 0.8,
          descent: -0.2,
        },
      },
      {
        transform: [1, 0, 0, -1, 0, 120],
      },
      {
        Util: {
          transform: (a, b) => [
            a[0] * b[0] + a[2] * b[1],
            a[1] * b[0] + a[3] * b[1],
            a[0] * b[2] + a[2] * b[3],
            a[1] * b[2] + a[3] * b[3],
            a[0] * b[4] + a[2] * b[5] + a[4],
            a[1] * b[4] + a[3] * b[5] + a[5],
          ],
        },
      },
    )

    expect(blocks).toHaveLength(2)
    expect(blocks[0].text).toBe("Neto afecto")
    expect(blocks[1].text).toBe("IVA")
  })
})
