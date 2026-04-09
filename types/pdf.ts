export type TextFontFamily =
  | "Arial"
  | "Helvetica"
  | "Verdana"
  | "Times New Roman"
  | "Courier New"

export interface PdfTextBlock {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  lineHeight: number
  baselineOffset: number
  fontFamily: TextFontFamily
  color: string
  backgroundColor: string
  sourceFontName: string | null
  sourceFontFamily: string | null
  bold: boolean
  italic: boolean
}

export interface TextElement {
  id: string
  type: "text"
  x: number
  y: number
  width: number
  height: number
  content: string
  fontFamily: TextFontFamily
  fontSize: number
  color: string
  bold: boolean
  textAlign: "left" | "center" | "right" | "justify"
}

export interface HighlightElement {
  id: string
  type: "highlight"
  x: number
  y: number
  width: number
  height: number
  color: string
  opacity: number
  fillColor?: string
  fillOpacity?: number
  borderColor?: string
  borderOpacity?: number
  style: "fill" | "border" | "both"
  borderWidth: number
}

export interface ArrowElement {
  id: string
  type: "arrow"
  x: number
  y: number
  width: number
  height: number
  color: string
  thickness: number
  angle: number
}

export interface ImageElement {
  id: string
  type: "image"
  x: number
  y: number
  width: number
  height: number
  src: string
  mimeType: "image/png" | "image/jpeg"
  originalWidth: number
  originalHeight: number
  lockedAspectRatio: boolean
}

export interface PdfTextReplacementElement {
  id: string
  type: "pdf-text-replacement"
  sourceBlockId: string
  sourceText: string
  replacementText: string
  x: number
  y: number
  width: number
  height: number
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  fontFamily: TextFontFamily
  fontSize: number
  lineHeight: number
  baselineOffset: number
  color: string
  bold: boolean
  italic: boolean
  textAlign: "left" | "center" | "right"
  backgroundColor: string
  maskEnabled: boolean
  maskColor: string
}

export interface PageFooter {
  number: string
  detail: string
}

export interface PageData {
  texts: TextElement[]
  highlights: HighlightElement[]
  arrows: ArrowElement[]
  images: ImageElement[]
  textReplacements: PdfTextReplacementElement[]
  extractedTextBlocks: PdfTextBlock[]
  footer: PageFooter
}

export interface PaginationSettings {
  enabled: boolean
  position: "bottom-center" | "bottom-right" | "top-right"
  startAt: number
  backgroundBox: boolean
}

export interface PageMetric {
  width: number
  height: number
  pageIndex: number
  sourceIndex: number
  transform?: number[]
}

export interface DocumentMetadata {
  name: string
  createdAt: string
  pageOrder: string[]
}

export interface DocumentState {
  document: DocumentMetadata | null
  pages: Record<string, PageData>
  pagination: PaginationSettings
  language: "en" | "es"
  coordinateSpace: "legacy-612" | "pdf"
  originalPdfBytes: ArrayBuffer | null
  originalPdfSources: ArrayBuffer[]
  pageMetrics: Record<string, PageMetric>
}

export interface PDFState {
  state: DocumentState
  currentPageId: string | null
  selectedElements: string[]
  addMode: "text" | "pdf-text-replacement" | null
  loadPDF: (file: File, insertAtIndex?: number) => Promise<number>
  saveState: () => string
  loadState: (json: string) => void
  exportPDF: () => Promise<void>
  exportEditablePDF: () => Promise<void>
  exportPagePDF: (pageId: string) => Promise<void>
  extractPage: (pageId: string) => Promise<void>
  buildPageExport: (
    pageId: string,
  ) => Promise<{ blob: Blob; fileName: string } | null>
  setCurrentPageId: (id: string) => void
  setSelectedElements: (ids: string[]) => void
  toggleElementSelection: (id: string, additive: boolean) => void
  setAddMode: (mode: PDFState["addMode"]) => void
  addTextElement: (x: number, y: number) => void
  addImageElement: (
    file: File,
    position?: { x: number; y: number },
  ) => Promise<void>
  addTextReplacementFromBlock: (blockId: string) => void
  addHighlight: () => void
  addArrow: () => void
  updateElement: (id: string, updates: any) => void
  updateElements: (updates: Record<string, any>) => void
  deleteElement: (id: string) => void
  deleteElements: (ids: string[]) => void
  duplicatePage: (pageId: string) => void
  deletePage: (pageId: string) => void
  movePageToIndex: (pageId: string, targetPosition: number) => void
  reorderPages: (draggedId: string, targetId: string) => void
  updatePagination: (updates: Partial<DocumentState["pagination"]>) => void
  updatePageFooter: (pageId: string, updates: Partial<PageFooter>) => void
  updateLanguage: (lang: DocumentState["language"]) => void
  undo: () => void
}
