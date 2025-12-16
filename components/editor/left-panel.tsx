"use client"

import type React from "react"
import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Copy, Trash2 } from "lucide-react"
import type { PDFState } from "@/hooks/use-pdf-state"
import { cn } from "@/lib/utils"

interface LeftPanelProps {
  pdfState: PDFState
}

export function LeftPanel({ pdfState }: LeftPanelProps) {
  const { state, currentPageId, setCurrentPageId, duplicatePage, deletePage, reorderPages } = pdfState
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  if (!state.document) {
    return (
      <div className="w-64 border-r border-border bg-sidebar p-4">
        <p className="text-sm text-muted-foreground">No PDF loaded</p>
      </div>
    )
  }

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", pageId)
    e.currentTarget.classList.add("opacity-50")
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50")
    setDragOverId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDragEnter = (pageId: string) => {
    setDragOverId(pageId)
  }

  const handleDrop = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault()
    const draggedPageId = e.dataTransfer.getData("text/plain")
    if (draggedPageId !== targetPageId) {
      reorderPages(draggedPageId, targetPageId)
    }
    setDragOverId(null)
  }

  return (
    <div className="flex w-64 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold text-sidebar-foreground">Pages</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {state.document.pageOrder.map((pageId, index) => (
            <div
              key={pageId}
              draggable
              onDragStart={(e) => handleDragStart(e, pageId)}
              onDragEnd={handleDragEnd}
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
                <span className="text-xs font-medium text-card-foreground">Page {index + 1}</span>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                    disabled={state.document.pageOrder.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="aspect-[3/4] rounded border border-border bg-muted" />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
