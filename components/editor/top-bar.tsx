"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileUp, Download, FolderOpen, FileDown } from "lucide-react"
import type { PDFState } from "@/hooks/use-pdf-state"

interface TopBarProps {
  pdfState: PDFState
}

export function TopBar({ pdfState }: TopBarProps) {
  const { loadPDF, saveState, loadState, exportPDF, state, updateLanguage } = pdfState

  const handleImportPDF = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/pdf"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        await loadPDF(file)
      }
    }
    input.click()
  }

  const handleSaveJSON = () => {
    const json = saveState()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "pdf-state.json"
    a.click()
    URL.revokeObjectURL(url)
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
        Import PDF
      </Button>
      <Button onClick={handleSaveJSON} variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        Save JSON
      </Button>
      <Button onClick={handleLoadJSON} variant="outline" size="sm">
        <FolderOpen className="mr-2 h-4 w-4" />
        Load JSON
      </Button>
      <div className="ml-2 h-8 w-px bg-border" />
      <Button onClick={exportPDF} variant="default" size="sm" disabled={!state.originalPdfSources.length}>
        <FileDown className="mr-2 h-4 w-4" />
        Export PDF
      </Button>
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleSaveJSON}>
              <Download className="mr-2 h-4 w-4" />
              Save JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLoadJSON}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Load JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Language</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => updateLanguage("en")}
              className={state.language === "en" ? "font-semibold text-primary" : ""}
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateLanguage("es")}
              className={state.language === "es" ? "font-semibold text-primary" : ""}
            >
              Español
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
