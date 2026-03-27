export const PIDIEF_STATE_ATTACHMENT_NAME = "pidief-state.json"

function bytesToString(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes)
  }

  let text = ""
  for (const byte of bytes) {
    text += String.fromCharCode(byte)
  }
  return text
}

export function encodeStringAsUtf8(value: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value)
  }

  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index)
  }
  return bytes
}

function decodeAttachmentContent(content: unknown): string | null {
  if (typeof content === "string") {
    return content
  }

  if (content instanceof Uint8Array) {
    return bytesToString(content)
  }

  if (content instanceof ArrayBuffer) {
    return bytesToString(new Uint8Array(content))
  }

  return null
}

export function findPidiefStateAttachment(
  attachments: Record<string, any> | null | undefined,
): string | null {
  if (!attachments || typeof attachments !== "object") return null

  for (const attachment of Object.values(attachments)) {
    if (!attachment) continue

    const filename =
      typeof attachment.filename === "string"
        ? attachment.filename
        : typeof attachment.name === "string"
          ? attachment.name
          : null

    if (filename !== PIDIEF_STATE_ATTACHMENT_NAME) continue

    return (
      decodeAttachmentContent(attachment.content) ??
      decodeAttachmentContent(attachment.data) ??
      decodeAttachmentContent(attachment)
    )
  }

  return null
}
