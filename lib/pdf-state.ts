import type { DocumentState, PageData } from "@/types/pdf"

export function createEmptyPageData(): PageData {
  return {
    texts: [],
    highlights: [],
    arrows: [],
    footer: {
      number: "",
      detail: "",
    },
  }
}

export function createInitialDocumentState(): DocumentState {
  return {
    document: null,
    pages: {},
    pagination: {
      enabled: false,
      position: "bottom-center",
      startAt: 1,
      backgroundBox: false,
    },
    language: "en",
    coordinateSpace: "pdf",
    originalPdfBytes: null,
    originalPdfSources: [],
    pageMetrics: {},
  }
}

export function cloneDocumentState(state: DocumentState): DocumentState {
  const pages: Record<string, PageData> = {}

  Object.entries(state.pages).forEach(([id, page]) => {
    pages[id] = {
      texts: page.texts.map((text) => ({ ...text })),
      highlights: page.highlights.map((highlight) => ({ ...highlight })),
      arrows: page.arrows.map((arrow) => ({ ...arrow })),
      footer: { ...page.footer },
    }
  })

  return {
    document: state.document
      ? { ...state.document, pageOrder: [...state.document.pageOrder] }
      : null,
    pages,
    pagination: { ...state.pagination },
    language: state.language,
    coordinateSpace: state.coordinateSpace,
    originalPdfBytes: state.originalPdfBytes,
    originalPdfSources: state.originalPdfSources,
    pageMetrics: { ...state.pageMetrics },
  }
}
