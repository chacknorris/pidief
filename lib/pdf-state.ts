import type { DocumentState, PageData } from "@/types/pdf"

export function createEmptyPageData(): PageData {
  return {
    texts: [],
    highlights: [],
    arrows: [],
    images: [],
    textReplacements: [],
    extractedTextBlocks: [],
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
      images: page.images.map((image) => ({ ...image })),
      textReplacements: page.textReplacements.map((replacement) => ({
        ...replacement,
      })),
      extractedTextBlocks: page.extractedTextBlocks.map((block) => ({
        ...block,
      })),
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

export function clampPageInsertIndex(
  length: number,
  targetIndex: number,
): number {
  return Math.max(0, Math.min(targetIndex, length))
}

export function movePageInOrder(
  pageOrder: string[],
  pageId: string,
  targetIndex: number,
): string[] {
  const currentIndex = pageOrder.indexOf(pageId)
  if (currentIndex < 0) return pageOrder

  const nextPageOrder = [...pageOrder]
  nextPageOrder.splice(currentIndex, 1)
  nextPageOrder.splice(
    clampPageInsertIndex(nextPageOrder.length, targetIndex),
    0,
    pageId,
  )
  return nextPageOrder
}

export function insertPagesIntoOrder(
  pageOrder: string[],
  pageIds: string[],
  targetIndex: number,
): string[] {
  const nextPageOrder = [...pageOrder]
  nextPageOrder.splice(
    clampPageInsertIndex(nextPageOrder.length, targetIndex),
    0,
    ...pageIds,
  )
  return nextPageOrder
}
