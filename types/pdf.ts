export interface TextElement {
  id: string
  type: "text"
  x: number
  y: number
  width: number
  height: number
  content: string
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

export interface PageFooter {
  number: string
  detail: string
}

export interface PageData {
  texts: TextElement[]
  highlights: HighlightElement[]
  arrows: ArrowElement[]
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
  addMode: "text" | null
  loadPDF: (file: File) => Promise<void>
  saveState: () => string
  loadState: (json: string) => void
  exportPDF: () => Promise<void>
  setCurrentPageId: (id: string) => void
  setSelectedElements: (ids: string[]) => void
  toggleElementSelection: (id: string, additive: boolean) => void
  setAddMode: (mode: PDFState["addMode"]) => void
  addTextElement: (x: number, y: number) => void
  addHighlight: () => void
  addArrow: () => void
  updateElement: (id: string, updates: any) => void
  updateElements: (updates: Record<string, any>) => void
  deleteElement: (id: string) => void
  deleteElements: (ids: string[]) => void
  duplicatePage: (pageId: string) => void
  deletePage: (pageId: string) => void
  reorderPages: (draggedId: string, targetId: string) => void
  updatePagination: (updates: Partial<DocumentState["pagination"]>) => void
  updatePageFooter: (pageId: string, updates: Partial<PageFooter>) => void
  updateLanguage: (lang: DocumentState["language"]) => void
  undo: () => void
}
