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
): StandardFonts {
  switch (fontFamily) {
    case "Times New Roman":
      return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman
    case "Courier New":
      return bold ? StandardFonts.CourierBold : StandardFonts.Courier
    case "Arial":
    case "Helvetica":
    case "Verdana":
    default:
      return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica
  }
}
