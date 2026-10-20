let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null

// Static asset URLs for pdfjs-dist. These files are copied into `public/pdfjs`
// by `scripts/copy-pdfjs-assets.mjs` (predev/prebuild/postinstall). The trailing
// slash is required: pdf.js appends file names to each base URL.
//
// `wasmUrl` is what lets pdf.js decode JPEG2000 (JPX) images and ICC color
// profiles via its WebAssembly modules. Without it such PDFs render blank pages.
const PDFJS_ASSET_OPTIONS = {
  wasmUrl: "/pdfjs/wasm/",
  iccUrl: "/pdfjs/iccs/",
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
  standardFontDataUrl: "/pdfjs/standard_fonts/",
} as const

/**
 * Default parameters to merge into every `pdfjsLib.getDocument(...)` call.
 * Spread it alongside the document source, e.g.
 *   pdfjsLib.getDocument({ ...getDocumentOptions(), data })
 */
export function getDocumentOptions() {
  return { ...PDFJS_ASSET_OPTIONS }
}

export async function getPdfJs(): Promise<typeof import("pdfjs-dist")> {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist").then((pdfjsLib) => {
      if (
        typeof window !== "undefined" &&
        !pdfjsLib.GlobalWorkerOptions.workerSrc
      ) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString()
      }

      return pdfjsLib
    })
  }

  return pdfJsPromise
}
