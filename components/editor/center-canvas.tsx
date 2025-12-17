"use client"

import React from "react"

import type { ReactElement } from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react"
import type { PDFState } from "@/hooks/use-pdf-state"
import { cn } from "@/lib/utils"
import { getCopy } from "@/lib/i18n"

interface CenterCanvasProps {
  pdfState: PDFState
}

function hexToRgba(hex: string, opacity: number): string {
  let normalized = hex.replace(/^#/, "")
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("")
  }
  const r = Number.parseInt(normalized.substring(0, 2), 16)
  const g = Number.parseInt(normalized.substring(2, 4), 16)
  const b = Number.parseInt(normalized.substring(4, 6), 16)
  const alpha = Math.max(0, Math.min(1, opacity))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function CenterCanvas({ pdfState }: CenterCanvasProps): ReactElement {
  const {
    state,
    currentPageId,
    selectedElements,
    setSelectedElements,
    toggleElementSelection,
    addMode,
    setAddMode,
    addTextElement,
    updateElement,
    updateElements,
    setCurrentPageId,
    deleteElements,
    undo,
  } = pdfState

  const copy = getCopy(state.language)

  const [zoom, setZoom] = useState(1)
  const [pdfDocVersion, setPdfDocVersion] = useState(0)
  const canvasRef = useRef<HTMLDivElement>(null)
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<Map<number, any> | null>(new Map())
  const renderTaskRef = useRef<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragStartPositions, setDragStartPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [resizeTargetId, setResizeTargetId] = useState<string | null>(null)
  const [resizeLockHeight, setResizeLockHeight] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [rotateTargetId, setRotateTargetId] = useState<string | null>(null)
  const selectionSnapshotRef = useRef<string[]>([])
  const [selectionBox, setSelectionBox] = useState<{
    active: boolean
    startClientX: number
    startClientY: number
    currentClientX: number
    currentClientY: number
    additive: boolean
  }>({ active: false, startClientX: 0, startClientY: 0, currentClientX: 0, currentClientY: 0, additive: false })

  const currentPageIndex = state.document?.pageOrder.indexOf(currentPageId || "") ?? -1
  const currentPage = currentPageId ? state.pages[currentPageId] : null
  const currentPageMetrics = currentPageId ? state.pageMetrics[currentPageId] : undefined
  const allElements = React.useMemo(
    () =>
      currentPage
        ? [
            ...(currentPage.texts || []),
            ...(currentPage.highlights || []),
            ...(currentPage.arrows || []),
          ]
        : [],
    [currentPage],
  )
  const elementMap = React.useMemo(() => new Map(allElements.map((el) => [el.id, el])), [allElements])

  const canvasSize = React.useMemo(() => {
    const DEFAULT_WIDTH = 612
    const DEFAULT_HEIGHT = 792

    if (state.coordinateSpace === "legacy-612") {
      if (currentPageMetrics?.width && currentPageMetrics?.height) {
        const width = DEFAULT_WIDTH
        const height = (currentPageMetrics.height / currentPageMetrics.width) * width
        return { width, height }
      }

      return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
    }

    if (currentPageMetrics?.width && currentPageMetrics?.height) {
      return { width: currentPageMetrics.width, height: currentPageMetrics.height }
    }

    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
  }, [currentPageMetrics, state.coordinateSpace])

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const additive = e.shiftKey || e.metaKey || e.ctrlKey
    selectionSnapshotRef.current = selectedElements
    setSelectionBox({
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      currentClientX: e.clientX,
      currentClientY: e.clientY,
      additive,
    })
  }

  const handleElementClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    const additive = e.shiftKey || e.metaKey || e.ctrlKey
    toggleElementSelection(elementId, additive)
  }

  const handleDragStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    const additive = e.shiftKey || e.metaKey || e.ctrlKey
    const selection = (() => {
      if (additive) {
        if (selectedElements.includes(elementId)) {
          return selectedElements
        }
        return [...selectedElements, elementId]
      }
      if (selectedElements.includes(elementId)) {
        return selectedElements
      }
      return [elementId]
    })()

    setSelectedElements(selection)

    const positions: Record<string, { x: number; y: number }> = {}
    selection.forEach((id) => {
      const element = elementMap.get(id)
      if (element) {
        positions[id] = { x: element.x, y: element.y }
      }
    })

    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    })
    setDragStartPositions(positions)
  }

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging) return

    const deltaX = (e.clientX - dragStart.x) / zoom
    const deltaY = (e.clientY - dragStart.y) / zoom

    const updates: Record<string, { x: number; y: number }> = {}
    Object.entries(dragStartPositions).forEach(([id, pos]) => {
      updates[id] = { x: pos.x + deltaX, y: pos.y + deltaY }
    })

    if (Object.keys(updates).length) {
      updateElements(updates)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDragStartPositions({})
  }

  const handleSelectionMove = (e: MouseEvent) => {
    if (!selectionBox.active) return
    e.preventDefault()
    setSelectionBox((prev) => ({ ...prev, currentClientX: e.clientX, currentClientY: e.clientY }))
  }

  const handleSelectionEnd = (e?: MouseEvent) => {
    if (!selectionBox.active) return
    const { startClientX, startClientY, currentClientX, currentClientY } = selectionBox
    const modifierActive = e ? e.shiftKey || e.metaKey || e.ctrlKey : false
    const dx = Math.abs(currentClientX - startClientX)
    const dy = Math.abs(currentClientY - startClientY)
    const clickTolerance = 5

    setSelectionBox((prev) => ({ ...prev, active: false }))

    if (dx < clickTolerance && dy < clickTolerance) {
      if (addMode === "text" && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const x = (startClientX - rect.left) / zoom
        const y = (startClientY - rect.top) / zoom
        addTextElement(x, y)
        setAddMode(null)
      } else if (!selectionBox.additive && !modifierActive) {
        setSelectedElements([])
      }
      return
    }

    const x1 = Math.min(startClientX, currentClientX)
    const y1 = Math.min(startClientY, currentClientY)
    const x2 = Math.max(startClientX, currentClientX)
    const y2 = Math.max(startClientY, currentClientY)

    let selected: string[] = []
    if (canvasRef.current) {
      const nodes = canvasRef.current.querySelectorAll<HTMLElement>("[data-element-id]")
      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect()
        const touches = rect.left <= x2 && rect.right >= x1 && rect.top <= y2 && rect.bottom >= y1
        if (touches && node.dataset.elementId) {
          selected.push(node.dataset.elementId)
        }
      })
    }

    const additive = selectionBox.additive || modifierActive
    const base = selectionSnapshotRef.current
    const finalSelection = additive ? Array.from(new Set([...base, ...selected])) : selected

    setSelectedElements(finalSelection)
    setAddMode(null)
  }

  const handleResizeStart = (e: React.MouseEvent, elementId: string, element: any) => {
    e.stopPropagation()
    setSelectedElements([elementId])
    setResizeTargetId(elementId)
    setIsResizing(true)
    setResizeLockHeight("thickness" in element) // lock height only for arrows
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height,
    })
  }

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizeTargetId) return

    const deltaX = (e.clientX - resizeStart.x) / zoom
    const newWidth = Math.max(50, resizeStart.width + deltaX)
    const newHeight = resizeLockHeight
      ? resizeStart.height
      : Math.max(20, resizeStart.height + (e.clientY - resizeStart.y) / zoom)

    updateElement(resizeTargetId, { width: newWidth, height: newHeight })
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
    setResizeTargetId(null)
    setResizeLockHeight(false)
  }

  const handleRotateStart = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    setSelectedElements([elementId])
    setRotateTargetId(elementId)
    setIsRotating(true)
  }

  const handleRotateMove = (e: MouseEvent) => {
    if (!isRotating || !rotateTargetId || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    const element = elementMap.get(rotateTargetId)
    if (!element || !("angle" in element)) return
    const originX = element.x
    const originY = element.y + element.height / 2
    const angle = (Math.atan2(y - originY, x - originX) * 180) / Math.PI
    updateElement(rotateTargetId, { angle })
  }

  const handleRotateEnd = () => {
    setIsRotating(false)
    setRotateTargetId(null)
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
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch (err) {
          console.warn("Failed to cancel previous render", err)
        }
        renderTaskRef.current = null
      }
      const canvas = pdfCanvasRef.current
      const metrics = state.pageMetrics[currentPageId]
      if (!pdfDocRef.current) return
      const pdfDoc = pdfDocRef.current.get(metrics?.sourceIndex ?? 0)

      if (!canvas || !pdfDoc || !currentPageId || !state.document) return

      const pageIndex = metrics?.pageIndex ?? state.document.pageOrder.indexOf(currentPageId)
      if (pageIndex < 0) return

      let page
      try {
        page = await pdfDoc.getPage(pageIndex + 1)
      } catch (error: any) {
        if (error?.name === "RenderingCancelledException" || error?.message?.toLowerCase().includes("rendering cancelled")) {
          return
        }
        throw error
      }

      if (cancelled) return

      const sourceWidth = currentPageMetrics?.width ?? page.view?.[2] ?? canvasSize.width
      const baseScale = canvasSize.width / sourceWidth
      const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
      const qualityScale = Math.max(1, zoom)
      const viewport = page.getViewport({ scale: baseScale * pixelRatio * qualityScale })

      const context = canvas.getContext("2d")
      if (!context) return

      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${canvasSize.width}px`
      canvas.style.height = `${canvasSize.height}px`
      context.clearRect(0, 0, canvas.width, canvas.height)

      const renderTask = page.render({ canvasContext: context, viewport })
      renderTaskRef.current = renderTask
      try {
        await renderTask.promise
      } catch (error: any) {
        if (error?.name !== "RenderingCancelledException" && !error?.message?.toLowerCase().includes("rendering cancelled")) {
          throw error
        }
      } finally {
        renderTaskRef.current = null
      }
    }

    renderCurrentPage().catch((error) => {
      if (error?.name === "RenderingCancelledException" || error?.message?.toLowerCase().includes("rendering cancelled")) {
        return
      }
      console.error("Failed to render current page", error)
    })

    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch (err) {
          console.warn("Failed to cancel render on cleanup", err)
        }
        renderTaskRef.current = null
      }
    }
  }, [
    canvasSize.height,
    canvasSize.width,
    currentPageId,
    currentPageMetrics,
    pdfDocVersion,
    state.document,
    state.pageMetrics,
    zoom,
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
  }, [isDragging, dragStart, dragStartPositions, zoom])

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove)
      window.addEventListener("mouseup", handleResizeEnd)
      return () => {
        window.removeEventListener("mousemove", handleResizeMove)
        window.removeEventListener("mouseup", handleResizeEnd)
      }
    }
  }, [isResizing, resizeStart, resizeTargetId, zoom])

  React.useEffect(() => {
    if (isRotating) {
      window.addEventListener("mousemove", handleRotateMove)
      window.addEventListener("mouseup", handleRotateEnd)
      return () => {
        window.removeEventListener("mousemove", handleRotateMove)
        window.removeEventListener("mouseup", handleRotateEnd)
      }
    }
  }, [isRotating, rotateTargetId, zoom, elementMap])

  React.useEffect(() => {
    if (selectionBox.active) {
      window.addEventListener("mousemove", handleSelectionMove)
      const onMouseUp = (e: MouseEvent) => handleSelectionEnd(e)
      window.addEventListener("mouseup", onMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleSelectionMove)
        window.removeEventListener("mouseup", onMouseUp)
      }
    }
  }, [selectionBox.active, zoom])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inEditable = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      if (e.key === "Delete" || e.key === "Backspace" || e.key.toLowerCase() === "supr") {
        if (inEditable) return
        if (selectedElements.length) {
          e.preventDefault()
          deleteElements(selectedElements)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [deleteElements, selectedElements, undo])

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
          <p className="text-lg font-medium text-muted-foreground">{copy.canvas.noPdfTitle}</p>
          <p className="text-sm text-muted-foreground">{copy.canvas.noPdfSubtitle}</p>
        </div>
      </div>
    )
  }

  const manualPaginationText = state.pagination.enabled
    ? ""
    : [currentPage.footer?.number, currentPage.footer?.detail].filter((value) => value?.trim()).join(" - ")

  return (
    <div className="flex flex-1 flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrevPage} disabled={currentPageIndex === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {copy.canvas.pageLabel(currentPageIndex + 1, state.document.pageOrder.length)}
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
            onMouseDown={handleCanvasMouseDown}
          >
            <canvas
              ref={pdfCanvasRef}
              className="absolute inset-0 h-full w-full rounded bg-white"
              style={{ pointerEvents: "none" }}
              width={canvasSize.width}
              height={canvasSize.height}
            />
            {/* Highlights */}
            {currentPage.highlights?.map((highlight) => {
              const selected = selectedElements.includes(highlight.id)
              const showFill = highlight.style !== "border"
              const showBorder = highlight.style !== "fill"
              const fillColor = showFill
                ? hexToRgba(highlight.fillColor ?? highlight.color, highlight.fillOpacity ?? highlight.opacity)
                : "transparent"
              const borderColor = showBorder
                ? hexToRgba(highlight.borderColor ?? highlight.color, highlight.borderOpacity ?? highlight.opacity)
                : "transparent"
              const borderWidth = showBorder ? highlight.borderWidth ?? 2 : 0

              return (
                <div
                  key={highlight.id}
                  data-element-id={highlight.id}
                  className={cn(
                    "absolute cursor-move transition-shadow group",
                    selected ? "ring-2 ring-primary" : "hover:ring-2 hover:ring-primary/50",
                  )}
                  style={{
                    left: highlight.x,
                    top: highlight.y,
                    width: highlight.width,
                    height: highlight.height,
                    backgroundColor: fillColor,
                    border: showBorder ? `${borderWidth}px solid ${borderColor}` : "none",
                  }}
                  onClick={(e) => handleElementClick(e, highlight.id)}
                  onMouseDown={(e) => handleDragStart(e, highlight.id)}
                >
                  {selected && (
                    <div
                      className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-primary"
                      style={{
                        transform: "translate(50%, 50%)",
                      }}
                      onMouseDown={(e) => handleResizeStart(e, highlight.id, highlight)}
                    />
                  )}
                </div>
              )
            })}

            {/* Arrows */}
            {currentPage.arrows?.map((arrow) => {
              const headSize = Math.max(8, arrow.thickness * 4)
              const midY = arrow.height / 2
              const shaftEnd = Math.max(headSize, arrow.width - headSize)
              return (
                <div
                  key={arrow.id}
                  data-element-id={arrow.id}
                  className={cn(
                    "absolute cursor-move border-2 transition-colors group",
                    selectedElements.includes(arrow.id)
                      ? "border-primary"
                      : "border-transparent hover:border-primary/50",
                  )}
                  style={{
                    left: arrow.x,
                    top: arrow.y,
                    width: arrow.width,
                    height: arrow.height,
                    transform: `rotate(${arrow.angle ?? 0}deg)`,
                    transformOrigin: "left center",
                  }}
                  onClick={(e) => handleElementClick(e, arrow.id)}
                  onMouseDown={(e) => handleDragStart(e, arrow.id)}
                >
                  <svg width="100%" height="100%" viewBox={`0 0 ${arrow.width} ${arrow.height}`} className="pointer-events-none">
                    <line
                      x1={0}
                      y1={midY}
                      x2={shaftEnd}
                      y2={midY}
                      stroke={arrow.color}
                      strokeWidth={arrow.thickness}
                      strokeLinecap="round"
                    />
                    <polygon
                      points={`${arrow.width - headSize},${midY - headSize} ${arrow.width},${midY} ${arrow.width - headSize},${midY + headSize}`}
                      fill={arrow.color}
                    />
                  </svg>
                  {selectedElements.includes(arrow.id) && (
                    <>
                      <div
                      className="absolute bottom-0 right-0 h-3 w-3 cursor-e-resize bg-primary"
                      style={{
                        top: "50%",
                        bottom: "auto",
                        transform: "translate(50%, -50%)",
                      }}
                      onMouseDown={(e) =>
                        handleResizeStart(e, arrow.id, {
                          ...arrow,
                          height: arrow.height, // keep height locked
                        })
                      }
                    />
                    <div
                      className="absolute -top-3 right-0 h-3 w-3 cursor-pointer rounded-full bg-primary"
                        style={{
                          transform: "translate(50%, -50%)",
                        }}
                        onMouseDown={(e) => handleRotateStart(e, arrow.id)}
                        title="Rotate"
                      />
                    </>
                  )}
                </div>
              )
            })}

            {/* Texts */}
            {currentPage.texts?.map((text) => (
              <div
                key={text.id}
                data-element-id={text.id}
                className={cn(
                  "absolute border-2 transition-colors group",
                  selectedElements.includes(text.id) ? "border-primary" : "border-transparent hover:border-primary/50",
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
                  className="absolute left-0 right-0 top-0 h-6 cursor-move opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ marginLeft: -2, marginRight: -2, marginTop: -2 }}
                  onMouseDown={(e) => handleDragStart(e, text.id)}
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
                  onMouseDown={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const newContent = e.currentTarget.textContent || ""
                    updateElement(text.id, { content: newContent })
                  }}
                >
                  {text.content}
                </div>
                {selectedElements.includes(text.id) && (
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
            {(state.pagination.enabled || manualPaginationText) && (
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
                {state.pagination.enabled
                  ? currentPageIndex + state.pagination.startAt
                  : manualPaginationText}
              </div>
            )}
            {selectionBox.active && (
              <div
                className="absolute border-2 border-primary/80 bg-primary/10"
                style={(() => {
                  if (!canvasRef.current) return undefined
                  const rect = canvasRef.current.getBoundingClientRect()
                  return {
                    left: (Math.min(selectionBox.startClientX, selectionBox.currentClientX) - rect.left) / zoom,
                    top: (Math.min(selectionBox.startClientY, selectionBox.currentClientY) - rect.top) / zoom,
                    width: Math.abs(selectionBox.currentClientX - selectionBox.startClientX) / zoom,
                    height: Math.abs(selectionBox.currentClientY - selectionBox.startClientY) / zoom,
                    pointerEvents: "none" as const,
                  }
                })()}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
