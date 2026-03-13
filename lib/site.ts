export function getSiteUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  return base.replace(/\/$/, "")
}

export const siteName = "PIDIEF"
export const siteTitle =
  "PIDIEF | Private PDF merge and annotation in the browser"
export const siteDescription =
  "Privacy-first PDF merging and annotation that runs entirely in the browser with no uploads and no backend."
