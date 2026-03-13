let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null

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
