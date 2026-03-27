"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileUp, FileDown, Download, FolderOpen } from "lucide-react"
import type { PDFState } from "@/types/pdf"
import { getCopy } from "@/lib/i18n"
import { saveBlobToUserDestination } from "@/lib/file-save"

interface TopBarProps {
  pdfState: PDFState
}

export function TopBar({ pdfState }: TopBarProps) {
  const {
    loadPDF,
    exportPDF,
    exportEditablePDF,
    state,
    updateLanguage,
    saveState,
    loadState,
  } = pdfState
  const copy = getCopy(state.language)

  const handleImportPDF = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/pdf"
    input.multiple = true
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      for (const file of files) {
        await loadPDF(file)
      }
    }
    input.click()
  }

  const handleSaveJSON = async () => {
    const json = saveState()
    const suggested =
      state.document?.name?.replace(/\.pdf$/i, "") || "pdf-state"
    const blob = new Blob([json], { type: "application/json" })
    await saveBlobToUserDestination(blob, {
      suggestedName: `${suggested}.json`,
      types: [
        {
          description: "JSON",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    })
  }

  const handleLoadJSON = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        loadState(text)
      }
    }
    input.click()
  }

  return (
    <div className="flex h-14 items-center gap-2 border-b border-border bg-card px-4">
      <Button onClick={handleImportPDF} variant="outline" size="sm">
        <FileUp className="mr-2 h-4 w-4" />
        {copy.topBar.import}
      </Button>
      <div className="ml-2 h-8 w-px bg-border" />
      <Button
        onClick={exportPDF}
        variant="default"
        size="sm"
        disabled={!state.originalPdfSources.length}
      >
        <FileDown className="mr-2 h-4 w-4" />
        {copy.topBar.export}
      </Button>
      <Button
        onClick={exportEditablePDF}
        variant="outline"
        size="sm"
        disabled={!state.originalPdfSources.length}
      >
        <Download className="mr-2 h-4 w-4" />
        {copy.topBar.exportEditable}
      </Button>
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              {copy.topBar.menu}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{copy.topBar.menu}</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleSaveJSON}>
              <Download className="mr-2 h-4 w-4" />
              {copy.rightPanel.save}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLoadJSON}>
              <FolderOpen className="mr-2 h-4 w-4" />
              {copy.rightPanel.load}
            </DropdownMenuItem>
            <DropdownMenuLabel>{copy.topBar.language}</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => updateLanguage("en")}
              className={
                state.language === "en" ? "font-semibold text-primary" : ""
              }
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateLanguage("es")}
              className={
                state.language === "es" ? "font-semibold text-primary" : ""
              }
            >
              Español
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
