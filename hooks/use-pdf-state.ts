"use client"

import { useState, useCallback, useRef, useEffect } from "react"

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64")
  }

  let binary = ""
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64")
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }

  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

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

export interface PageData {
  texts: TextElement[]
  highlights: HighlightElement[]
  arrows: ArrowElement[]
  footer: {
    number: string
    detail: string
  }
}

export interface DocumentState {
  document: {
    name: string
    createdAt: string
    pageOrder: string[]
  } | null
  pages: Record<string, PageData>
  pagination: {
    enabled: boolean
    position: "bottom-center" | "bottom-right" | "top-right"
    startAt: number
    backgroundBox: boolean
  }
  language: "en" | "es"
  coordinateSpace: "legacy-612" | "pdf"
  // Legacy single PDF reference (kept for backward compatibility, not serialized)
  originalPdfBytes: ArrayBuffer | null
  // Multiple PDF sources to allow merging/ordering across imports
  originalPdfSources: ArrayBuffer[]
  pageMetrics: Record<
    string,
    { width: number; height: number; pageIndex: number; sourceIndex: number; transform?: number[] }
  >
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
  updatePageFooter: (pageId: string, updates: Partial<PageData["footer"]>) => void
  updateLanguage: (lang: DocumentState["language"]) => void
  undo: () => void
}

const initialState: DocumentState = {
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

export function serializeDocumentState(state: DocumentState): string {
  const serializableState = {
    ...state,
    originalPdfBytes: state.originalPdfBytes ? arrayBufferToBase64(state.originalPdfBytes) : null,
    originalPdfSources: state.originalPdfSources.map((src) => arrayBufferToBase64(src)),
  }
  return JSON.stringify(serializableState, null, 2)
}

export function deserializeDocumentState(
  json: string,
): { state: DocumentState; currentPageId: string | null } | null {
  try {
    const loadedState = JSON.parse(json)

    const decodedSources = Array.isArray(loadedState.originalPdfSources)
      ? loadedState.originalPdfSources
          .map((src: unknown) => (typeof src === "string" ? base64ToArrayBuffer(src) : null))
          .filter((src): src is ArrayBuffer => Boolean(src))
      : []

    const decodedOriginalPdf =
      typeof loadedState.originalPdfBytes === "string" ? base64ToArrayBuffer(loadedState.originalPdfBytes) : null

    const nextPageMetrics =
      loadedState.pageMetrics && typeof loadedState.pageMetrics === "object" ? loadedState.pageMetrics : {}

    const nextCurrentPageId = loadedState.document?.pageOrder?.[0] ?? null

    const coordinateSpace: DocumentState["coordinateSpace"] =
      loadedState.coordinateSpace === "pdf" ? "pdf" : "legacy-612"

    const legacyManualNumber =
      typeof loadedState.pagination?.manualNumber === "string" ? loadedState.pagination.manualNumber : ""
    const legacyManualDetail =
      typeof loadedState.pagination?.manualDetail === "string" ? loadedState.pagination.manualDetail : ""

    const normalizedPages: Record<string, PageData> = {}
    if (loadedState.pages && typeof loadedState.pages === "object") {
      Object.entries(loadedState.pages).forEach(([id, page]) => {
        const footerSource = page.footer && typeof page.footer === "object" ? page.footer : {}
        const footer = {
          number: typeof footerSource.number === "string" ? footerSource.number : legacyManualNumber,
          detail: typeof footerSource.detail === "string" ? footerSource.detail : legacyManualDetail,
        }
        normalizedPages[id] = {
          texts: page.texts || [],
          highlights: (page.highlights || []).map((highlight: any) => ({
            ...highlight,
            style: highlight.style === "border" || highlight.style === "both" ? highlight.style : "fill",
            borderWidth: typeof highlight.borderWidth === "number" ? highlight.borderWidth : 2,
            fillColor: typeof highlight.fillColor === "string" ? highlight.fillColor : highlight.color ?? "#ffff00",
            fillOpacity: typeof highlight.fillOpacity === "number" ? highlight.fillOpacity : highlight.opacity ?? 0.3,
            borderColor: typeof highlight.borderColor === "string" ? highlight.borderColor : highlight.color ?? "#ff0000",
            borderOpacity: typeof highlight.borderOpacity === "number" ? highlight.borderOpacity : 1,
          })),
          arrows: (page.arrows || []).map((ar: any) => ({
            ...ar,
            angle: typeof ar.angle === "number" ? ar.angle : 0,
          })),
          footer,
        }
      })
    }

    const pageIds = Object.keys(normalizedPages)
    const canMigrateLegacy =
      coordinateSpace === "legacy-612" &&
      pageIds.length > 0 &&
      pageIds.every((id) => nextPageMetrics[id]?.width && nextPageMetrics[id]?.height)

    const migratePage = (page: PageData, scale: number): PageData => ({
      texts: page.texts.map((text) => ({
        ...text,
        x: text.x * scale,
        y: text.y * scale,
        width: text.width * scale,
        height: text.height * scale,
        fontSize: text.fontSize * scale,
      })),
      highlights: page.highlights.map((highlight) => ({
        ...highlight,
        x: highlight.x * scale,
        y: highlight.y * scale,
        width: highlight.width * scale,
        height: highlight.height * scale,
        borderWidth: (highlight.borderWidth ?? 2) * scale,
      })),
      arrows: page.arrows.map((arrow) => ({
        ...arrow,
        x: arrow.x * scale,
        y: arrow.y * scale,
        width: arrow.width * scale,
        height: arrow.height * scale,
        thickness: arrow.thickness * scale,
        angle: typeof arrow.angle === "number" ? arrow.angle : 0,
      })),
      footer: page.footer,
    })

    const migratedPages: Record<string, PageData> = {}
    if (canMigrateLegacy) {
      pageIds.forEach((id) => {
        const metrics = nextPageMetrics[id]
        const scale = metrics.width / 612
        migratedPages[id] = migratePage(normalizedPages[id], scale)
      })
    } else {
      pageIds.forEach((id) => {
        migratedPages[id] = normalizedPages[id]
      })
    }

    const restoredPagination = {
      backgroundBox: false,
      ...loadedState.pagination,
    }

    const restoredState: DocumentState = {
      ...loadedState,
      pages: migratedPages,
      pagination: {
        ...restoredPagination,
      },
      language: loadedState.language === "es" ? "es" : "en",
      coordinateSpace: canMigrateLegacy ? "pdf" : coordinateSpace,
      originalPdfBytes: decodedOriginalPdf,
      originalPdfSources: decodedSources,
      pageMetrics: nextPageMetrics,
    }

    return { state: restoredState, currentPageId: nextCurrentPageId }
  } catch (error) {
    console.error("Failed to load state:", error)
    return null
  }
}

function cloneDocumentState(state: DocumentState): DocumentState {
  const pages: Record<string, PageData> = {}
  Object.entries(state.pages).forEach(([id, page]) => {
    pages[id] = {
      texts: page.texts.map((t) => ({ ...t })),
      highlights: page.highlights.map((h) => ({ ...h })),
      arrows: page.arrows.map((a) => ({ ...a })),
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

export function usePDFState(): PDFState {
  const [state, setState] = useState<DocumentState>(initialState)
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [addMode, setAddMode] = useState<PDFState["addMode"]>(null)
  const historyRef = useRef<DocumentState[]>([])

  const pushHistory = useCallback((snapshot: DocumentState) => {
    historyRef.current = [...historyRef.current.slice(-19), cloneDocumentState(snapshot)]
  }, [])

  const toggleElementSelection = useCallback((id: string, additive: boolean) => {
    setSelectedElements((prev) => {
      if (additive) {
        return prev.includes(id) ? prev.filter((el) => el !== id) : [...prev, id]
      }
      return [id]
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedElements([]), [])

  const loadPDF = useCallback(async (file: File) => {
    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      // Keep a stable copy to avoid buffer detachment when sending data to pdf.js workers
      const originalPdfBytes = arrayBuffer.slice(0)

      // Dynamically import pdfjs-dist to avoid SSR issues
      const pdfjsLib = await import("pdfjs-dist")

      // Configure PDF.js worker
      if (typeof window !== "undefined") {
        const workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
      }

      // Load PDF with pdfjs-dist
      // Use a clone for pdf.js to avoid detaching the stored buffer
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) })
      const pdfDocument = await loadingTask.promise

      const pageCount = pdfDocument.numPages
      const pageOrder: string[] = []
      const pages: Record<string, PageData> = {}
      const pageMetrics: Record<
        string,
        { width: number; height: number; pageIndex: number; sourceIndex: number; transform?: number[] }
      > = {}

      // Calculate source index to keep track of which PDF each page belongs to
      const sourceIndex = state.originalPdfSources.length

      // Extract page metrics
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdfDocument.getPage(i)
        const viewport = page.getViewport({ scale: 1.0 })

        const pageId = `page-${Date.now()}-${i}`
        pageOrder.push(pageId)
        pages[pageId] = {
          texts: [],
          highlights: [],
          arrows: [],
          footer: {
            number: "",
            detail: "",
          },
        }
        pageMetrics[pageId] = {
          width: viewport.width,
          height: viewport.height,
          pageIndex: i - 1, // zero-based index to reference the original PDF page
          sourceIndex,
          transform: Array.from(viewport.transform || []),
        }
      }

      setState((prev) => {
        pushHistory(prev)
        const isFirst = !prev.document
        const mergedPageOrder = isFirst ? pageOrder : [...prev.document!.pageOrder, ...pageOrder]
        const mergedPages = isFirst ? pages : { ...prev.pages, ...pages }
        const mergedMetrics = isFirst ? pageMetrics : { ...prev.pageMetrics, ...pageMetrics }

        return {
          document: isFirst
            ? {
                name: file.name,
                createdAt: new Date().toISOString(),
                pageOrder: mergedPageOrder,
              }
            : {
                ...prev.document!,
                pageOrder: mergedPageOrder,
              },
          pages: mergedPages,
          pagination: prev.pagination,
          language: prev.language,
          coordinateSpace: prev.coordinateSpace ?? "pdf",
          // Keep legacy field for compatibility (first PDF only)
          originalPdfBytes: prev.originalPdfBytes ?? originalPdfBytes,
          originalPdfSources: [...prev.originalPdfSources, originalPdfBytes],
          pageMetrics: mergedMetrics,
        }
      })
      setCurrentPageId((prev) => prev ?? pageOrder[0])
    } catch (error) {
      console.error("Failed to load PDF:", error)
      alert("Failed to load PDF. Please try again.")
    }
  }, [state.originalPdfSources.length])

  const saveState = useCallback(() => serializeDocumentState(state), [state])

  const loadState = useCallback((json: string) => {
    const restored = deserializeDocumentState(json)
    if (!restored) return

    setState(restored.state)
    setCurrentPageId(restored.currentPageId)
    setSelectedElements([])
    setAddMode(null)
  }, [])

  useEffect(() => {
    const browserLang =
      typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("es") ? "es" : "en"
    setState((prev) => {
      if (prev.language !== "en" || prev.document) return prev
      return { ...prev, language: browserLang }
    })
  }, [])

  const updateLanguage = useCallback(
    (lang: DocumentState["language"]) => {
      setState((prev) => {
        if (prev.language === lang) return prev
        pushHistory(prev)
        return { ...prev, language: lang }
      })
    },
    [pushHistory],
  )

  const addTextElement = useCallback(
    (x: number, y: number) => {
      if (!currentPageId) return

      const newText: TextElement = {
        id: `text-${Date.now()}`,
        type: "text",
        x,
        y,
        width: 200,
        height: 40,
        content: "New Text",
        fontSize: 16,
        color: "#000000",
        bold: false,
        textAlign: "left",
      }

      setState((prev) => {
        pushHistory(prev)
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              ...prev.pages[currentPageId],
              texts: [...(prev.pages[currentPageId]?.texts || []), newText],
            },
          },
        }
      })
      setSelectedElements([newText.id])
    },
    [currentPageId, pushHistory],
  )

  const addHighlight = useCallback(() => {
    if (!currentPageId) return

    const newHighlight: HighlightElement = {
      id: `highlight-${Date.now()}`,
      type: "highlight",
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      color: "#ffff00",
      opacity: 0.3,
      fillColor: "#ffff00",
      fillOpacity: 0.3,
      borderColor: "#ff0000",
      borderOpacity: 1,
      style: "both",
      borderWidth: 2,
    }

    setState((prev) => {
      pushHistory(prev)
      return {
        ...prev,
        pages: {
          ...prev.pages,
          [currentPageId]: {
            ...prev.pages[currentPageId],
            highlights: [...(prev.pages[currentPageId]?.highlights || []), newHighlight],
          },
        },
      }
    })
    setSelectedElements([newHighlight.id])
  }, [currentPageId, pushHistory])

  const addArrow = useCallback(() => {
    if (!currentPageId) return

    const newArrow: ArrowElement = {
      id: `arrow-${Date.now()}`,
      type: "arrow",
      x: 80,
      y: 120,
      width: 220,
      height: 40,
      color: "#000000",
      thickness: 2,
      angle: 0,
    }

    setState((prev) => {
      pushHistory(prev)
      return {
        ...prev,
        pages: {
          ...prev.pages,
          [currentPageId]: {
            ...prev.pages[currentPageId],
            arrows: [...(prev.pages[currentPageId]?.arrows || []), newArrow],
          },
        },
      }
    })
    setSelectedElements([newArrow.id])
  }, [currentPageId, pushHistory])

  const updateElements = useCallback(
    (updates: Record<string, any>) => {
      if (!currentPageId) return

      setState((prev) => {
        pushHistory(prev)
        const page = prev.pages[currentPageId] ?? { texts: [], highlights: [], arrows: [], footer: { number: "", detail: "" } }
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              texts: page.texts.map((el) => (updates[el.id] ? { ...el, ...updates[el.id] } : el)),
              highlights: page.highlights.map((el) => (updates[el.id] ? { ...el, ...updates[el.id] } : el)),
              arrows: page.arrows.map((el) => (updates[el.id] ? { ...el, ...updates[el.id] } : el)),
              footer: page.footer,
            },
          },
        }
      })
    },
    [currentPageId],
  )

  const updateElement = useCallback(
    (id: string, updates: any) => {
      updateElements({ [id]: updates })
    },
    [updateElements],
  )

  const deleteElement = useCallback(
    (id: string) => {
      if (!id) return
      if (!currentPageId) return

      setState((prev) => {
        pushHistory(prev)
        const page = prev.pages[currentPageId] ?? { texts: [], highlights: [], arrows: [], footer: { number: "", detail: "" } }
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              texts: page.texts.filter((el) => el.id !== id),
              highlights: page.highlights.filter((el) => el.id !== id),
              arrows: page.arrows.filter((el) => el.id !== id),
              footer: page.footer,
            },
          },
        }
      })
      clearSelection()
    },
    [clearSelection, currentPageId],
  )

  const deleteElements = useCallback(
    (ids: string[]) => {
      if (!currentPageId || !ids.length) return

      setState((prev) => {
        pushHistory(prev)
        const page = prev.pages[currentPageId] ?? { texts: [], highlights: [], arrows: [], footer: { number: "", detail: "" } }
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              texts: page.texts.filter((el) => !ids.includes(el.id)),
              highlights: page.highlights.filter((el) => !ids.includes(el.id)),
              arrows: page.arrows.filter((el) => !ids.includes(el.id)),
              footer: page.footer,
            },
          },
        }
      })
      clearSelection()
    },
    [clearSelection, currentPageId],
  )

  const duplicatePage = useCallback((pageId: string) => {
    setState((prev) => {
      if (!prev.document) return prev

      pushHistory(prev)
      const newPageId = `page-${Date.now()}`
      const pageIndex = prev.document.pageOrder.indexOf(pageId)
      const newPageOrder = [...prev.document.pageOrder]
      newPageOrder.splice(pageIndex + 1, 0, newPageId)

      return {
        ...prev,
        document: {
          ...prev.document,
          pageOrder: newPageOrder,
        },
        pages: {
          ...prev.pages,
          [newPageId]: JSON.parse(JSON.stringify(prev.pages[pageId])),
        },
        pageMetrics: {
          ...prev.pageMetrics,
          [newPageId]: prev.pageMetrics[pageId],
        },
      }
    })
  }, [])

  const deletePage = useCallback(
    (pageId: string) => {
      let nextPageId: string | null = null
      let changed = false

      setState((prev) => {
        if (!prev.document || prev.document.pageOrder.length === 1) return prev

        pushHistory(prev)
        const newPageOrder = prev.document.pageOrder.filter((id) => id !== pageId)
        const newPages = { ...prev.pages }
        delete newPages[pageId]

        const removedIndex = prev.document.pageOrder.indexOf(pageId)
        const fallbackIndex = Math.min(removedIndex, newPageOrder.length - 1)
        nextPageId = newPageOrder[fallbackIndex] ?? null
        changed = true

        return {
          ...prev,
          document: {
            ...prev.document,
            pageOrder: newPageOrder,
          },
          pages: newPages,
          pageMetrics: Object.fromEntries(
            Object.entries(prev.pageMetrics).filter(([id]) => id !== pageId),
          ),
        }
      })

      if (changed) {
        setCurrentPageId(nextPageId)
        setSelectedElements([])
      }
    },
    [setCurrentPageId, setSelectedElements],
  )

  const reorderPages = useCallback((draggedId: string, targetId: string) => {
    setState((prev) => {
      if (!prev.document) return prev

      pushHistory(prev)
      const newPageOrder = [...prev.document.pageOrder]
      const draggedIndex = newPageOrder.indexOf(draggedId)
      const targetIndex = newPageOrder.indexOf(targetId)

      newPageOrder.splice(draggedIndex, 1)
      newPageOrder.splice(targetIndex, 0, draggedId)

      return {
        ...prev,
        document: {
          ...prev.document,
          pageOrder: newPageOrder,
        },
      }
    })
  }, [])

  const updatePagination = useCallback((updates: Partial<DocumentState["pagination"]>) => {
    setState((prev) => {
      pushHistory(prev)
      return {
        ...prev,
        pagination: {
          ...prev.pagination,
          ...updates,
        },
      }
    })
  }, [pushHistory])

  const updatePageFooter = useCallback(
    (pageId: string, updates: Partial<PageData["footer"]>) => {
      if (!pageId) return

      setState((prev) => {
        const page = prev.pages[pageId]
        if (!page) return prev
        pushHistory(prev)
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [pageId]: {
              ...page,
              footer: {
                number: "",
                detail: "",
                ...page.footer,
                ...updates,
              },
            },
          },
        }
      })
    },
    [pushHistory],
  )

  const exportPDF = useCallback(async () => {
    if (!state.originalPdfSources.length || !state.document) {
      alert("No PDF loaded to export")
      return
    }

    try {
      // Dynamically import exportFinalPDF to avoid SSR issues
      const { exportFinalPDF } = await import("@/lib/pdf-export")

      // Generate the final PDF
      const pdfBytes = await exportFinalPDF(state.originalPdfSources, state)

      // Ask for filename, fallback to original name with suffix
      const defaultName = state.document.name.replace(/\.pdf$/i, "") + "-edited.pdf"
      const desiredName = typeof window !== "undefined" ? window.prompt("Nombre del archivo a exportar:", defaultName) : defaultName
      const fileName = desiredName && desiredName.trim() ? desiredName.trim().replace(/\.pdf$/i, "") + ".pdf" : defaultName

      // Download the PDF
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export PDF:", error)
      alert("Failed to export PDF. Please try again.")
    }
  }, [state])

  const undo = useCallback(() => {
    const snapshot = historyRef.current.pop()
    if (!snapshot) return
    setState(snapshot)
    const nextPage =
      snapshot.document && currentPageId && snapshot.document.pageOrder.includes(currentPageId)
        ? currentPageId
        : snapshot.document?.pageOrder[0] ?? null
    setCurrentPageId(nextPage)
    setSelectedElements([])
  }, [currentPageId])

  return {
    state,
    currentPageId,
    selectedElements,
    addMode,
    loadPDF,
    saveState,
    loadState,
    exportPDF,
    setCurrentPageId,
    setSelectedElements,
    toggleElementSelection,
    setAddMode,
    addTextElement,
    addHighlight,
    addArrow,
    updateElement,
    updateElements,
    deleteElement,
    deleteElements,
    duplicatePage,
    deletePage,
    reorderPages,
    updatePagination,
    updatePageFooter,
    updateLanguage,
    undo,
  }
}
