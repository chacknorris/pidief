/// <reference types="vitest" />

import { describe, expect, it } from "vitest"
import {
  encodeStringAsUtf8,
  findPidiefStateAttachment,
  PIDIEF_STATE_ATTACHMENT_NAME,
} from "./editable-pdf"

describe("editable-pdf helpers", () => {
  it("encodes strings as utf8 bytes", () => {
    expect(Array.from(encodeStringAsUtf8("Hola"))).toEqual([72, 111, 108, 97])
  })

  it("finds the embedded pidief state attachment", () => {
    const json = '{"document":{"name":"saved.pdf"}}'

    const attachment = findPidiefStateAttachment({
      other: {
        filename: "notes.txt",
        content: encodeStringAsUtf8("ignore"),
      },
      state: {
        filename: PIDIEF_STATE_ATTACHMENT_NAME,
        content: encodeStringAsUtf8(json),
      },
    })

    expect(attachment).toBe(json)
  })
})
