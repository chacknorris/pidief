"use client"

import { useState, useCallback } from "react"

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
}

export interface UnderlineElement {
  id: string
  type: "underline"
  x: number
  y: number
  width: number
  height: number
  color: string
}

export interface PageData {
  texts: TextElement[]
  highlights: HighlightElement[]
  underlines: UnderlineElement[]
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
  }
  // PDF original data (not serialized to JSON)
  originalPdfBytes: ArrayBuffer | null
  pageMetrics: Record<string, { width: number; height: number; pageIndex: number }>
}

export interface PDFState {
  state: DocumentState
  currentPageId: string | null
  selectedElement: string | null
  loadPDF: (file: File) => Promise<void>
  saveState: () => string
  loadState: (json: string) => void
  exportPDF: () => Promise<void>
  setCurrentPageId: (id: string) => void
  setSelectedElement: (id: string | null) => void
  addTextElement: (x: number, y: number) => void
  addHighlight: () => void
  addUnderline: () => void
  updateElement: (id: string, updates: any) => void
  deleteElement: (id: string) => void
  duplicatePage: (pageId: string) => void
  deletePage: (pageId: string) => void
  reorderPages: (draggedId: string, targetId: string) => void
  updatePagination: (updates: Partial<DocumentState["pagination"]>) => void
}

const initialState: DocumentState = {
  document: null,
  pages: {},
  pagination: {
    enabled: false,
    position: "bottom-center",
    startAt: 1,
  },
  originalPdfBytes: null,
  pageMetrics: {},
}

export function usePDFState(): PDFState {
  const [state, setState] = useState<DocumentState>(initialState)
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)

  const loadPDF = useCallback(async (file: File) => {
    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // Dynamically import pdfjs-dist to avoid SSR issues
      const pdfjsLib = await import("pdfjs-dist")

      // Configure PDF.js worker
      if (typeof window !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
      }

      // Load PDF with pdfjs-dist
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdfDocument = await loadingTask.promise

      const pageCount = pdfDocument.numPages
      const pageOrder: string[] = []
      const pages: Record<string, PageData> = {}
      const pageMetrics: Record<string, { width: number; height: number; pageIndex: number }> = {}

      // Extract page metrics
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdfDocument.getPage(i)
        const viewport = page.getViewport({ scale: 1.0 })

        const pageId = `page-${Date.now()}-${i}`
        pageOrder.push(pageId)
        pages[pageId] = {
          texts: [],
          highlights: [],
          underlines: [],
        }
        pageMetrics[pageId] = {
          width: viewport.width,
          height: viewport.height,
          pageIndex: i - 1, // zero-based index to reference the original PDF page
        }
      }

      setState({
        document: {
          name: file.name,
          createdAt: new Date().toISOString(),
          pageOrder,
        },
        pages,
        pagination: {
          enabled: false,
          position: "bottom-center",
          startAt: 1,
        },
        originalPdfBytes: arrayBuffer,
        pageMetrics,
      })
      setCurrentPageId(pageOrder[0])
    } catch (error) {
      console.error("Failed to load PDF:", error)
      alert("Failed to load PDF. Please try again.")
    }
  }, [])

  const saveState = useCallback(() => {
    // Exclude originalPdfBytes from JSON serialization
    const { originalPdfBytes, pageMetrics, ...serializableState } = state
    return JSON.stringify(serializableState, null, 2)
  }, [state])

  const loadState = useCallback((json: string) => {
    try {
      const loadedState = JSON.parse(json)
      // Merge with empty originalPdfBytes and pageMetrics
      setState({
        ...loadedState,
        originalPdfBytes: null,
        pageMetrics: {},
      })
      if (loadedState.document?.pageOrder.length > 0) {
        setCurrentPageId(loadedState.document.pageOrder[0])
      }
    } catch (error) {
      console.error("Failed to load state:", error)
    }
  }, [])

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

      setState((prev) => ({
        ...prev,
        pages: {
          ...prev.pages,
          [currentPageId]: {
            ...prev.pages[currentPageId],
            texts: [...(prev.pages[currentPageId]?.texts || []), newText],
          },
        },
      }))
      setSelectedElement(newText.id)
    },
    [currentPageId],
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
    }

    setState((prev) => ({
      ...prev,
      pages: {
        ...prev.pages,
        [currentPageId]: {
          ...prev.pages[currentPageId],
          highlights: [...(prev.pages[currentPageId]?.highlights || []), newHighlight],
        },
      },
    }))
    setSelectedElement(newHighlight.id)
  }, [currentPageId])

  const addUnderline = useCallback(() => {
    if (!currentPageId) return

    const newUnderline: UnderlineElement = {
      id: `underline-${Date.now()}`,
      type: "underline",
      x: 100,
      y: 200,
      width: 200,
      height: 2,
      color: "#000000",
    }

    setState((prev) => ({
      ...prev,
      pages: {
        ...prev.pages,
        [currentPageId]: {
          ...prev.pages[currentPageId],
          underlines: [...(prev.pages[currentPageId]?.underlines || []), newUnderline],
        },
      },
    }))
    setSelectedElement(newUnderline.id)
  }, [currentPageId])

  const updateElement = useCallback(
    (id: string, updates: any) => {
      if (!currentPageId) return

      setState((prev) => {
        const page = prev.pages[currentPageId]
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              texts: page.texts.map((el) => (el.id === id ? { ...el, ...updates } : el)),
              highlights: page.highlights.map((el) => (el.id === id ? { ...el, ...updates } : el)),
              underlines: page.underlines.map((el) => (el.id === id ? { ...el, ...updates } : el)),
            },
          },
        }
      })
    },
    [currentPageId],
  )

  const deleteElement = useCallback(
    (id: string) => {
      if (!currentPageId) return

      setState((prev) => {
        const page = prev.pages[currentPageId]
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              texts: page.texts.filter((el) => el.id !== id),
              highlights: page.highlights.filter((el) => el.id !== id),
              underlines: page.underlines.filter((el) => el.id !== id),
            },
          },
        }
      })
      setSelectedElement(null)
    },
    [currentPageId],
  )

  const duplicatePage = useCallback((pageId: string) => {
    setState((prev) => {
      if (!prev.document) return prev

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
      setState((prev) => {
        if (!prev.document || prev.document.pageOrder.length === 1) return prev

        const newPageOrder = prev.document.pageOrder.filter((id) => id !== pageId)
        const newPages = { ...prev.pages }
        delete newPages[pageId]

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

      if (currentPageId === pageId && state.document) {
        const index = state.document.pageOrder.indexOf(pageId)
        const newIndex = Math.max(0, index - 1)
        setCurrentPageId(state.document.pageOrder[newIndex])
      }
    },
    [currentPageId, state.document],
  )

  const reorderPages = useCallback((draggedId: string, targetId: string) => {
    setState((prev) => {
      if (!prev.document) return prev

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
    setState((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        ...updates,
      },
    }))
  }, [])

  const exportPDF = useCallback(async () => {
    if (!state.originalPdfBytes || !state.document) {
      alert("No PDF loaded to export")
      return
    }

    try {
      // Dynamically import exportFinalPDF to avoid SSR issues
      const { exportFinalPDF } = await import("@/lib/pdf-export")

      // Generate the final PDF
      const pdfBytes = await exportFinalPDF(state.originalPdfBytes, state)

      // Download the PDF
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = state.document.name.replace(".pdf", "-edited.pdf")
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export PDF:", error)
      alert("Failed to export PDF. Please try again.")
    }
  }, [state])

  return {
    state,
    currentPageId,
    selectedElement,
    loadPDF,
    saveState,
    loadState,
    exportPDF,
    setCurrentPageId,
    setSelectedElement,
    addTextElement,
    addHighlight,
    addUnderline,
    updateElement,
    deleteElement,
    duplicatePage,
    deletePage,
    reorderPages,
    updatePagination,
  }
}
