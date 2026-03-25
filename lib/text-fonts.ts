import { StandardFonts } from "pdf-lib"
import type { TextElement, TextFontFamily } from "@/types/pdf"

export const TEXT_FONT_OPTIONS: TextFontFamily[] = [
  "Arial",
  "Helvetica",
  "Verdana",
  "Times New Roman",
  "Courier New",
]

export function isTextFontFamily(value: unknown): value is TextFontFamily {
  return TEXT_FONT_OPTIONS.includes(value as TextFontFamily)
}

export function inferTextFontFamily(
  ...candidates: Array<string | null | undefined>
): TextFontFamily {
  const haystack = candidates.filter(Boolean).join(" ").toLowerCase()

  if (haystack.includes("times")) return "Times New Roman"
  if (haystack.includes("courier")) return "Courier New"
  if (haystack.includes("verdana")) return "Verdana"
  if (haystack.includes("helvetica")) return "Helvetica"
  if (haystack.includes("arial")) return "Arial"

  return "Arial"
}

export function getEditorFontStack(fontFamily: TextFontFamily): string {
  switch (fontFamily) {
    case "Helvetica":
      return 'Helvetica, Arial, "Nimbus Sans L", sans-serif'
    case "Verdana":
      return "Verdana, Geneva, Arial, sans-serif"
    case "Times New Roman":
      return '"Times New Roman", Times, Georgia, serif'
    case "Courier New":
      return '"Courier New", Courier, monospace'
    case "Arial":
    default:
      return 'Arial, Helvetica, "Nimbus Sans L", sans-serif'
  }
}

export function getPdfStandardFont(
  fontFamily: TextElement["fontFamily"],
  bold: boolean,
  italic = false,
): StandardFonts {
  switch (fontFamily) {
    case "Times New Roman":
      if (bold && italic) return StandardFonts.TimesRomanBoldItalic
      if (bold) return StandardFonts.TimesRomanBold
      if (italic) return StandardFonts.TimesRomanItalic
      return StandardFonts.TimesRoman
    case "Courier New":
      if (bold && italic) return StandardFonts.CourierBoldOblique
      if (bold) return StandardFonts.CourierBold
      if (italic) return StandardFonts.CourierOblique
      return StandardFonts.Courier
    case "Arial":
    case "Helvetica":
    case "Verdana":
    default:
      if (bold && italic) return StandardFonts.HelveticaBoldOblique
      if (bold) return StandardFonts.HelveticaBold
      if (italic) return StandardFonts.HelveticaOblique
      return StandardFonts.Helvetica
  }
}
