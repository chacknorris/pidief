/// <reference types="vitest" />

import { describe, expect, it } from "vitest"
import {
  extractTextBlocksFromPage,
  inferTextBlockBackgroundColor,
  inferTextBlockColor,
} from "./pdf-text"

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
      color: "#000000",
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

  it("infers the dominant text color from page pixels", () => {
    const width = 8
    const height = 4
    const data = new Uint8ClampedArray(width * height * 4).fill(255)

    for (let y = 1; y <= 2; y += 1) {
      for (let x = 2; x <= 5; x += 1) {
        const index = (y * width + x) * 4
        data[index] = 30
        data[index + 1] = 90
        data[index + 2] = 180
        data[index + 3] = 255
      }
    }

    const color = inferTextBlockColor(
      { data, width, height },
      {
        x: 2,
        y: 1,
        width: 4,
        height: 2,
      },
      "#ffffff",
    )

    expect(color).toBe("#1e5ab4")
  })

  it("prefers white text over a colored background when contrast is higher", () => {
    const width = 10
    const height = 6
    const data = new Uint8ClampedArray(width * height * 4).fill(255)

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        data[index] = 18
        data[index + 1] = 82
        data[index + 2] = 176
        data[index + 3] = 255
      }
    }

    for (let y = 2; y <= 3; y += 1) {
      for (let x = 4; x <= 5; x += 1) {
        const index = (y * width + x) * 4
        data[index] = 255
        data[index + 1] = 255
        data[index + 2] = 255
        data[index + 3] = 255
      }
    }

    const color = inferTextBlockColor(
      { data, width, height },
      {
        x: 3,
        y: 2,
        width: 4,
        height: 2,
      },
      "#1252b0",
    )

    expect(color).toBe("#ffffff")
  })

  it("infers the background color from pixels around the source block", () => {
    const width = 10
    const height = 6
    const data = new Uint8ClampedArray(width * height * 4).fill(255)

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        data[index] = 18
        data[index + 1] = 82
        data[index + 2] = 176
        data[index + 3] = 255
      }
    }

    for (let y = 2; y <= 3; y += 1) {
      for (let x = 3; x <= 6; x += 1) {
        const index = (y * width + x) * 4
        data[index] = 255
        data[index + 1] = 255
        data[index + 2] = 255
        data[index + 3] = 255
      }
    }

    const color = inferTextBlockBackgroundColor(
      { data, width, height },
      {
        x: 3,
        y: 2,
        width: 4,
        height: 2,
        fontSize: 12,
      },
    )

    expect(color).toBe("#1252b0")
  })
})
