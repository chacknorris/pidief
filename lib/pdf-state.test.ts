/// <reference types="vitest" />

import { describe, expect, it } from "vitest"
import { insertPagesIntoOrder, movePageInOrder } from "./pdf-state"

describe("pdf-state page ordering", () => {
  it("moves a page to an exact target index", () => {
    expect(movePageInOrder(["p1", "p2", "p3", "p4"], "p4", 1)).toEqual([
      "p1",
      "p4",
      "p2",
      "p3",
    ])
  })

  it("keeps the order unchanged when the page is missing", () => {
    expect(movePageInOrder(["p1", "p2"], "p9", 0)).toEqual(["p1", "p2"])
  })

  it("inserts imported pages at a specific index", () => {
    expect(insertPagesIntoOrder(["p1", "p2", "p3"], ["n1", "n2"], 1)).toEqual([
      "p1",
      "n1",
      "n2",
      "p2",
      "p3",
    ])
  })
})
