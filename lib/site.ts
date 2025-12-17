export function getSiteUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  return base.replace(/\/$/, "")
}

export const siteName = "PidiEF"
export const siteTitle = "PDF Editor - Client-Side PDF Annotation Tool"
export const siteDescription =
  "Client-side PDF editor for viewing, annotating, and managing PDF documents in your browser."
