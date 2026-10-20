// Copies the runtime assets that pdfjs-dist needs to decode images (JPEG2000
// via openjpeg.wasm, color profiles via qcms/iccs), CJK CMaps and the standard
// font fallbacks into the Next.js public dir so they are served statically.
//
// pdf.js 5.x decodes JPEG2000 (JPX) images with a WASM module. Without a
// `wasmUrl` pointing at these files, such images fail to decode and pages
// render blank. This script keeps `public/pdfjs/*` in sync with the installed
// pdfjs-dist version. It runs on predev/prebuild/postinstall.

import { cp, mkdir, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..")

// Resolve the installed pdfjs-dist location (works regardless of hoisting).
const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"))
const destRoot = join(projectRoot, "public", "pdfjs")

// Folders pdf.js references through *Url parameters.
const folders = ["wasm", "iccs", "cmaps", "standard_fonts"]

async function main() {
  await rm(destRoot, { recursive: true, force: true })
  await mkdir(destRoot, { recursive: true })

  for (const folder of folders) {
    const src = join(pdfjsRoot, folder)
    const dest = join(destRoot, folder)
    await cp(src, dest, { recursive: true })
  }

  console.log(`[pdfjs] Copied ${folders.join(", ")} to public/pdfjs`)
}

main().catch((error) => {
  console.error("[pdfjs] Failed to copy assets:", error)
  process.exit(1)
})
