"use client"

import React from "react"

import type { ReactElement } from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react"
import type { PDFState } from "@/hooks/use-pdf-state"
import { cn } from "@/lib/utils"

interface CenterCanvasProps {
  pdfState: PDFState
}

export function CenterCanvas({ pdfState }: CenterCanvasProps): ReactElement {
  const {
    state,
    currentPageId,
    selectedElement,
    setSelectedElement,
    addTextElement,
    updateElement,
    deleteElement,
    setCurrentPageId,
  } = pdfState

  const [zoom, setZoom] = useState(1)
  const [pdfDocVersion, setPdfDocVersion] = useState(0)
  const canvasRef = useRef<HTMLDivElement>(null)
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<Map<number, any> | null>(new Map())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elementX: 0, elementY: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const currentPageIndex = state.document?.pageOrder.indexOf(currentPageId || "") ?? -1
  const currentPage = currentPageId ? state.pages[currentPageId] : null
  const currentPageMetrics = currentPageId ? state.pageMetrics[currentPageId] : undefined

  const canvasSize = React.useMemo(() => {
    const DEFAULT_WIDTH = 612
    const DEFAULT_HEIGHT = 792

    if (currentPageMetrics?.width && currentPageMetrics?.height) {
      const width = DEFAULT_WIDTH
      const height = (currentPageMetrics.height / currentPageMetrics.width) * width
      return { width, height }
    }

    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
  }, [currentPageMetrics])

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("canvas-layer")) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / zoom
      const y = (e.clientY - rect.top) / zoom
      addTextElement(x, y)
    }
  }

  const handleElementClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    setSelectedElement(elementId)
  }

  const handleDragStart = (e: React.MouseEvent, elementId: string, elementX: number, elementY: number) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX,
      elementY,
    })
    setSelectedElement(elementId)
  }

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !selectedElement) return

    const deltaX = (e.clientX - dragStart.x) / zoom
    const deltaY = (e.clientY - dragStart.y) / zoom

    const newX = dragStart.elementX + deltaX
    const newY = dragStart.elementY + deltaY

    updateElement(selectedElement, { x: newX, y: newY })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleResizeStart = (e: React.MouseEvent, elementId: string, element: any) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height,
    })
    setSelectedElement(elementId)
  }

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !selectedElement) return

    const deltaX = (e.clientX - resizeStart.x) / zoom
    const deltaY = (e.clientY - resizeStart.y) / zoom

    const newWidth = Math.max(50, resizeStart.width + deltaX)
    const newHeight = Math.max(30, resizeStart.height + deltaY)

    updateElement(selectedElement, { width: newWidth, height: newHeight })
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
  }

  React.useEffect(() => {
    let cancelled = false

    async function loadPdfDocument() {
      if (!pdfDocRef.current) {
        pdfDocRef.current = new Map()
      }
      if (!state.originalPdfSources.length) {
        pdfDocRef.current?.clear()
        return
      }

      const pdfjsLib = await import("pdfjs-dist")

      if (typeof window !== "undefined") {
        const workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
      }

      await Promise.all(
        state.originalPdfSources.map(async (bytes, index) => {
          if (!pdfDocRef.current) {
            pdfDocRef.current = new Map()
          }
          if (pdfDocRef.current.has(index)) return
          const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) })
          const pdfDocument = await loadingTask.promise

          if (!cancelled) {
            pdfDocRef.current?.set(index, pdfDocument)
            setPdfDocVersion((v) => v + 1)
          } else {
            loadingTask.destroy?.()
          }
        }),
      )
    }

    loadPdfDocument()

    return () => {
      cancelled = true
    }
  }, [state.originalPdfSources])

  React.useEffect(() => {
    let cancelled = false

    async function renderCurrentPage() {
      const canvas = pdfCanvasRef.current
      const metrics = state.pageMetrics[currentPageId]
      if (!pdfDocRef.current) return
      const pdfDoc = pdfDocRef.current.get(metrics?.sourceIndex ?? 0)

      if (!canvas || !pdfDoc || !currentPageId || !state.document) return

      const pageIndex = metrics?.pageIndex ?? state.document.pageOrder.indexOf(currentPageId)
      if (pageIndex < 0) return

      const page = await pdfDoc.getPage(pageIndex + 1)

      if (cancelled) return

      const sourceWidth = currentPageMetrics?.width ?? page.view?.[2] ?? canvasSize.width
      const scale = canvasSize.width / sourceWidth
      const viewport = page.getViewport({ scale })

      const context = canvas.getContext("2d")
      if (!context) return

      canvas.width = viewport.width
      canvas.height = viewport.height
      context.clearRect(0, 0, canvas.width, canvas.height)

      const renderTask = page.render({ canvasContext: context, viewport })
      await renderTask.promise
    }

    renderCurrentPage()

    return () => {
      cancelled = true
    }
  }, [
    canvasSize.height,
    canvasSize.width,
    currentPageId,
    currentPageMetrics,
    pdfDocVersion,
    state.document,
    state.pageMetrics,
  ])

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove)
      window.addEventListener("mouseup", handleDragEnd)
      return () => {
        window.removeEventListener("mousemove", handleDragMove)
        window.removeEventListener("mouseup", handleDragEnd)
      }
    }
  }, [isDragging, selectedElement, dragStart, zoom])

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove)
      window.addEventListener("mouseup", handleResizeEnd)
      return () => {
        window.removeEventListener("mousemove", handleResizeMove)
        window.removeEventListener("mouseup", handleResizeEnd)
      }
    }
  }, [isResizing, selectedElement, resizeStart, zoom])

  const handleNextPage = () => {
    if (state.document && currentPageIndex < state.document.pageOrder.length - 1) {
      setCurrentPageId(state.document.pageOrder[currentPageIndex + 1])
    }
  }

  const handlePrevPage = () => {
    if (state.document && currentPageIndex > 0) {
      setCurrentPageId(state.document.pageOrder[currentPageIndex - 1])
    }
  }

  if (!state.document || !currentPage) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">No PDF loaded</p>
          <p className="text-sm text-muted-foreground">Import a PDF to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrevPage} disabled={currentPageIndex === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPageIndex + 1} of {state.document.pageOrder.length}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPageIndex === state.document.pageOrder.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto" style={{ width: `${canvasSize.width * zoom}px` }}>
          <div
            ref={canvasRef}
            className="canvas-layer relative mx-auto bg-white shadow-lg"
            style={{
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
            onClick={handleCanvasClick}
          >
            <canvas
              ref={pdfCanvasRef}
              className="absolute inset-0 h-full w-full rounded bg-white"
              style={{ pointerEvents: "none" }}
              width={canvasSize.width}
              height={canvasSize.height}
            />
            {/* Highlights */}
            {currentPage.highlights?.map((highlight) => (
              <div
                key={highlight.id}
                className={cn(
                  "absolute cursor-move border-2 transition-colors group",
                  selectedElement === highlight.id ? "border-primary" : "border-transparent hover:border-primary/50",
                )}
                style={{
                  left: highlight.x,
                  top: highlight.y,
                  width: highlight.width,
                  height: highlight.height,
                  backgroundColor: highlight.color,
                  opacity: highlight.opacity,
                }}
                onClick={(e) => handleElementClick(e, highlight.id)}
                onMouseDown={(e) => handleDragStart(e, highlight.id, highlight.x, highlight.y)}
              >
                {selectedElement === highlight.id && (
                  <div
                    className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-primary"
                    style={{
                      transform: "translate(50%, 50%)",
                    }}
                    onMouseDown={(e) => handleResizeStart(e, highlight.id, highlight)}
                  />
                )}
              </div>
            ))}

            {/* Underlines */}
            {currentPage.underlines?.map((underline) => (
              <div
                key={underline.id}
                className={cn(
                  "absolute cursor-move border-2 transition-colors group",
                  selectedElement === underline.id ? "border-primary" : "border-transparent hover:border-primary/50",
                )}
                style={{
                  left: underline.x,
                  top: underline.y,
                  width: underline.width,
                  height: underline.height,
                  backgroundColor: underline.color,
                }}
                onClick={(e) => handleElementClick(e, underline.id)}
                onMouseDown={(e) => handleDragStart(e, underline.id, underline.x, underline.y)}
              >
                {selectedElement === underline.id && (
                  <div
                    className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-primary"
                    style={{
                      transform: "translate(50%, 50%)",
                    }}
                    onMouseDown={(e) => handleResizeStart(e, underline.id, underline)}
                  />
                )}
              </div>
            ))}

            {/* Texts */}
            {currentPage.texts?.map((text) => (
              <div
                key={text.id}
                className={cn(
                  "absolute border-2 transition-colors group",
                  selectedElement === text.id ? "border-primary" : "border-transparent hover:border-primary/50",
                )}
                style={{
                  left: text.x,
                  top: text.y,
                  width: text.width,
                  height: text.height,
                  fontSize: text.fontSize,
                  color: text.color,
                  fontWeight: text.bold ? "bold" : "normal",
                  padding: "4px",
                }}
                onClick={(e) => handleElementClick(e, text.id)}
              >
                <div
                  className="absolute left-0 right-0 top-0 h-6 cursor-move bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ marginLeft: -2, marginRight: -2, marginTop: -2 }}
                  onMouseDown={(e) => handleDragStart(e, text.id, text.x, text.y)}
                />
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="h-full w-full outline-none"
                  style={{
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    textAlign: text.textAlign || "left",
                  }}
                  onBlur={(e) => {
                    const newContent = e.currentTarget.textContent || ""
                    updateElement(text.id, { content: newContent })
                  }}
                >
                  {text.content}
                </div>
                {selectedElement === text.id && (
                  <div
                    className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-primary"
                    style={{
                      transform: "translate(50%, 50%)",
                    }}
                    onMouseDown={(e) => handleResizeStart(e, text.id, text)}
                  />
                )}
              </div>
            ))}

            {/* Page Numbers */}
            {state.pagination.enabled && (
              <div
                className="absolute text-sm"
                style={{
                  ...(state.pagination.position === "bottom-center" && {
                    bottom: 20,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }),
                  ...(state.pagination.position === "bottom-right" && {
                    bottom: 20,
                    right: 20,
                  }),
                  ...(state.pagination.position === "top-right" && {
                    top: 20,
                    right: 20,
                  }),
                  ...(state.pagination.backgroundBox && {
                    backgroundColor: "white",
                    padding: "5px",
                  }),
                }}
              >
                {currentPageIndex + state.pagination.startAt}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
