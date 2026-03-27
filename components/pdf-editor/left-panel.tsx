"use client"

import React from "react"
import { useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Copy,
  Download,
  GripVertical,
  Trash2,
} from "lucide-react"
import type { PDFState } from "@/types/pdf"
import { getPdfJs } from "@/lib/pdfjs"
import { cn } from "@/lib/utils"
import { getCopy } from "@/lib/i18n"

interface LeftPanelProps {
  pdfState: PDFState
}

export function LeftPanel({ pdfState }: LeftPanelProps) {
  const {
    state,
    currentPageId,
    setCurrentPageId,
    duplicatePage,
    deletePage,
    movePageToIndex,
    loadPDF,
    reorderPages,
    exportPagePDF,
    extractPage,
    buildPageExport,
  } = pdfState
  const copy = getCopy(state.language)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({})
  const [isExternalFileDrag, setIsExternalFileDrag] = useState(false)
  const [pageExportCache, setPageExportCache] = useState<
    Record<string, { url: string; fileName: string; fingerprint: string }>
  >({})
  const [pageExportStatus, setPageExportStatus] = useState<
    Record<string, "idle" | "preparing" | "ready">
  >({})
  const pageExportCacheRef = useRef<
    Record<string, { url: string; fileName: string; fingerprint: string }>
  >({})
  const externalDragDepthRef = useRef(0)
  const pdfDocRef = useRef<Map<number, any> | null>(new Map())
  const [pdfDocVersion, setPdfDocVersion] = useState(0)
  const pageOrder = state.document?.pageOrder ?? []

  useEffect(() => {
    let cancelled = false

    async function loadPdfDocument() {
      if (!pdfDocRef.current) {
        pdfDocRef.current = new Map()
      }
      if (!state.originalPdfSources.length) {
        pdfDocRef.current?.forEach((doc) => {
          try {
            doc.destroy?.()
          } catch (error) {
            console.warn("Failed to destroy cached PDF document", error)
          }
        })
        pdfDocRef.current?.clear()
        setPdfDocVersion((v) => v + 1)
        return
      }

      let pdfjsLib: any
      try {
        pdfjsLib = await getPdfJs()
      } catch (error: any) {
        if (
          error?.name === "RenderingCancelledException" ||
          error?.message?.toLowerCase().includes("rendering cancelled")
        ) {
          return
        }
        throw error
      }

      await Promise.all(
        state.originalPdfSources.map(async (bytes, index) => {
          if (!pdfDocRef.current) {
            pdfDocRef.current = new Map()
          }
          if (pdfDocRef.current.has(index)) return
          const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) })
          try {
            const pdfDocument = await loadingTask.promise
            if (!cancelled) {
              pdfDocRef.current?.set(index, pdfDocument)
              setPdfDocVersion((v) => v + 1)
            } else {
              loadingTask.destroy?.()
            }
          } catch (error: any) {
            if (error?.message?.toLowerCase().includes("rendering cancelled")) {
              loadingTask.destroy?.()
              return
            }
            console.error("Failed to load PDF source", error)
          }
        }),
      )
    }

    loadPdfDocument().catch((error) => {
      if (error?.message?.toLowerCase().includes("rendering cancelled")) {
        return
      }
      console.error("Failed to load pdf document", error)
    })

    return () => {
      cancelled = true
    }
  }, [state.originalPdfSources])

  useEffect(() => {
    return () => {
      Object.values(pageExportCacheRef.current).forEach((entry) => {
        URL.revokeObjectURL(entry.url)
      })
    }
  }, [])

  useEffect(() => {
    pageExportCacheRef.current = pageExportCache
  }, [pageExportCache])

  const getPageExportFingerprint = (pageId: string) =>
    JSON.stringify({
      page: state.pages[pageId],
      metric: state.pageMetrics[pageId],
      pageIndex: pageOrder.indexOf(pageId),
      pagination: state.pagination,
      coordinateSpace: state.coordinateSpace,
      sourceCount: state.originalPdfSources.length,
    })

  const isFileDrag = (e: React.DragEvent) =>
    e.dataTransfer.files.length > 0 ||
    Array.from(e.dataTransfer.items || []).some(
      (item) => item.kind === "file",
    ) ||
    Array.from(e.dataTransfer.types).includes("Files")

  const handleImportAtIndex = async (files: File[], insertAtIndex: number) => {
    let nextInsertIndex = insertAtIndex
    for (const file of files) {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      if (!isPdf) continue
      const insertedPages = await loadPDF(file, nextInsertIndex)
      nextInsertIndex += insertedPages
    }
  }

  const handleReorderDragStart = (e: React.DragEvent, pageId: string) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", pageId)
    e.currentTarget.classList.add("opacity-50")
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50")
    setDragOverId(null)
  }

  const handleExportDragEnd = (e: React.DragEvent, pageId: string) => {
    handleDragEnd(e)
    if (e.dataTransfer.dropEffect !== "copy") return
    if (pageOrder.length === 1) return
    deletePage(pageId)
  }

  const primePageExport = async (pageId: string) => {
    const fingerprint = getPageExportFingerprint(pageId)
    const cached = pageExportCacheRef.current[pageId]
    if (cached && cached.fingerprint === fingerprint) {
      setPageExportStatus((prev) => ({ ...prev, [pageId]: "ready" }))
      return cached
    }

    setPageExportStatus((prev) => ({ ...prev, [pageId]: "preparing" }))
    const result = await buildPageExport(pageId)
    if (!result) {
      setPageExportStatus((prev) => ({ ...prev, [pageId]: "idle" }))
      return null
    }

    const url = URL.createObjectURL(result.blob)
    const nextValue = { url, fileName: result.fileName, fingerprint }
    setPageExportCache((prev) => {
      const previous = prev[pageId]
      if (previous) {
        URL.revokeObjectURL(previous.url)
      }
      return { ...prev, [pageId]: nextValue }
    })
    setPageExportStatus((prev) => ({ ...prev, [pageId]: "ready" }))
    return nextValue
  }

  const handleExportDragStart = (
    e: React.DragEvent,
    pageId: string,
    pageNumber: number,
  ) => {
    e.stopPropagation()
    const cached = pageExportCacheRef.current[pageId]
    if (!cached) {
      e.preventDefault()
      return
    }

    e.dataTransfer.effectAllowed = "copy"
    e.dataTransfer.setData(
      "DownloadURL",
      `application/pdf:${cached.fileName}:${cached.url}`,
    )
    e.dataTransfer.setData("text/uri-list", cached.url)
    e.dataTransfer.setData("text/plain", `Page ${pageNumber}`)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (isFileDrag(e)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "copy"
      return
    }

    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDragEnter = (pageId: string) => {
    setDragOverId(pageId)
  }

  const handleDrop = async (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (isFileDrag(e)) {
      const targetIndex = pageOrder.indexOf(targetPageId)
      const files = Array.from(e.dataTransfer.files || [])
      await handleImportAtIndex(files, targetIndex)
      setDragOverId(null)
      setIsExternalFileDrag(false)
      externalDragDepthRef.current = 0
      setMoveTargets({})
      return
    }

    const draggedPageId = e.dataTransfer.getData("text/plain")
    if (draggedPageId !== targetPageId) {
      reorderPages(draggedPageId, targetPageId)
      setMoveTargets({})
    }
    setDragOverId(null)
  }

  const handleExternalDragEnter = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return
    externalDragDepthRef.current += 1
    setIsExternalFileDrag(true)
  }

  const handleExternalDragLeave = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    externalDragDepthRef.current = Math.max(0, externalDragDepthRef.current - 1)
    if (externalDragDepthRef.current === 0) {
      setIsExternalFileDrag(false)
      setDragOverId(null)
    }
  }

  const handleExternalDropAtEnd = async (e: React.DragEvent) => {
    if (!isFileDrag(e)) return
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files || [])
    await handleImportAtIndex(files, pageOrder.length)
    setIsExternalFileDrag(false)
    setDragOverId(null)
    externalDragDepthRef.current = 0
    setMoveTargets({})
  }

  if (!state.document) {
    return (
      <div
        className={cn(
          "w-64 border-r border-border bg-sidebar p-4 transition-colors",
          isExternalFileDrag &&
            "bg-sidebar/80 ring-2 ring-primary/40 ring-inset",
        )}
        onDragEnter={handleExternalDragEnter}
        onDragLeave={handleExternalDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleExternalDropAtEnd}
      >
        <p className="text-sm text-muted-foreground">{copy.leftPanel.empty}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {copy.leftPanel.dropPdf}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-h-0 w-64 flex-col border-r border-border bg-sidebar transition-colors",
        isExternalFileDrag && "bg-sidebar/80 ring-2 ring-primary/40 ring-inset",
      )}
      onDragEnter={handleExternalDragEnter}
      onDragLeave={handleExternalDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleExternalDropAtEnd}
    >
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold text-sidebar-foreground">
          {copy.leftPanel.pages}
        </h2>
        {isExternalFileDrag && (
          <p className="mt-2 text-xs text-primary">{copy.leftPanel.dropPdf}</p>
        )}
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 p-3">
          {pageOrder.map((pageId, index) => (
            <div
              key={pageId}
              draggable
              onMouseEnter={() => {
                void primePageExport(pageId)
              }}
              onMouseDown={() => {
                void primePageExport(pageId)
              }}
              onDragStart={(e) => handleExportDragStart(e, pageId, index + 1)}
              onDragEnd={(e) => handleExportDragEnd(e, pageId)}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(pageId)}
              onDrop={(e) => handleDrop(e, pageId)}
              className={cn(
                "group relative cursor-move rounded-md border border-border bg-card p-2 transition-all hover:border-primary",
                currentPageId === pageId && "border-primary bg-accent",
                dragOverId === pageId && "border-primary border-2 scale-105",
              )}
              onClick={() => setCurrentPageId(pageId)}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-card-foreground">
                  Page {index + 1}
                </span>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <div
                    className="flex h-6 w-6 cursor-move items-center justify-center rounded-sm text-muted-foreground hover:bg-accent"
                    draggable
                    onDragStart={(e) => handleReorderDragStart(e, pageId)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    title={copy.leftPanel.move}
                  >
                    <GripVertical className="h-3 w-3" />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onMouseEnter={() => {
                      void primePageExport(pageId)
                    }}
                    onMouseDown={() => {
                      void primePageExport(pageId)
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      void exportPagePDF(pageId)
                    }}
                    draggable
                    onDragStart={(e) => {
                      handleExportDragStart(e, pageId, index + 1)
                    }}
                    title={copy.leftPanel.dragCopyReady}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      duplicatePage(pageId)
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePage(pageId)
                    }}
                    disabled={pageOrder.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {pageExportStatus[pageId] &&
                pageExportStatus[pageId] !== "idle" && (
                  <p className="mb-2 text-[10px] text-muted-foreground">
                    {pageExportStatus[pageId] === "preparing"
                      ? copy.leftPanel.dragCopyPreparing
                      : copy.leftPanel.dragCopyReady}
                  </p>
                )}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {copy.leftPanel.moveTo}
                </span>
                <Input
                  type="number"
                  min={1}
                  max={pageOrder.length}
                  value={moveTargets[pageId] ?? String(index + 1)}
                  className="h-7 w-16"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    setMoveTargets((prev) => ({
                      ...prev,
                      [pageId]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    e.stopPropagation()
                    const targetPosition = Number.parseInt(
                      moveTargets[pageId] ?? String(index + 1),
                      10,
                    )
                    if (Number.isNaN(targetPosition)) return
                    movePageToIndex(pageId, targetPosition)
                    setMoveTargets({})
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation()
                    const targetPosition = Number.parseInt(
                      moveTargets[pageId] ?? String(index + 1),
                      10,
                    )
                    if (Number.isNaN(targetPosition)) return
                    movePageToIndex(pageId, targetPosition)
                    setMoveTargets({})
                  }}
                >
                  {copy.leftPanel.move}
                </Button>
              </div>
              <PageThumbnail
                pageOrderIndex={index}
                metrics={state.pageMetrics[pageId]}
                pdfDocRef={pdfDocRef}
                pdfDocVersion={pdfDocVersion}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

interface PageThumbnailProps {
  pageOrderIndex: number
  metrics?: {
    width: number
    height: number
    pageIndex: number
    sourceIndex: number
  }
  pdfDocRef: React.MutableRefObject<Map<number, any> | null>
  pdfDocVersion: number
}

function PageThumbnail({
  metrics,
  pageOrderIndex,
  pdfDocRef,
  pdfDocVersion,
}: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false

    async function renderThumbnail() {
      const canvas = canvasRef.current
      const pdfDoc = pdfDocRef.current?.get(metrics?.sourceIndex ?? 0)
      if (!canvas || !pdfDoc) return

      const pageIndex = metrics?.pageIndex ?? pageOrderIndex
      const page = await pdfDoc.getPage(pageIndex + 1)
      if (cancelled) return

      const targetWidth = 140
      const targetHeight =
        metrics?.width && metrics?.height
          ? (metrics.height / metrics.width) * targetWidth
          : 180
      const sourceWidth = metrics?.width ?? page.view?.[2] ?? targetWidth
      const scale = targetWidth / sourceWidth
      const viewport = page.getViewport({ scale })

      const context = canvas.getContext("2d")
      if (!context) return

      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${targetWidth}px`
      canvas.style.height = `${targetHeight}px`
      context.clearRect(0, 0, canvas.width, canvas.height)

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch (err) {
          console.warn("Failed to cancel thumbnail render", err)
        }
      }

      const renderTask = page.render({ canvasContext: context, viewport })
      renderTaskRef.current = renderTask
      try {
        await renderTask.promise
      } catch (error: any) {
        if (
          error?.name !== "RenderingCancelledException" &&
          !error?.message?.toLowerCase().includes("rendering cancelled")
        ) {
          throw error
        }
      } finally {
        renderTaskRef.current = null
      }
    }

    renderThumbnail()

    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch (err) {
          console.warn("Failed to cancel thumbnail render on cleanup", err)
        }
        renderTaskRef.current = null
      }
    }
  }, [metrics, pageOrderIndex, pdfDocRef, pdfDocVersion])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded border border-border bg-muted"
    />
  )
}
