"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileUp, FileDown } from "lucide-react"
import type { PDFState } from "@/hooks/use-pdf-state"
import { getCopy } from "@/lib/i18n"

interface TopBarProps {
  pdfState: PDFState
}

export function TopBar({ pdfState }: TopBarProps) {
  const { loadPDF, exportPDF, state, updateLanguage } = pdfState
  const copy = getCopy(state.language)

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

  return (
    <div className="flex h-14 items-center gap-2 border-b border-border bg-card px-4">
      <Button onClick={handleImportPDF} variant="outline" size="sm">
        <FileUp className="mr-2 h-4 w-4" />
        {copy.topBar.import}
      </Button>
      <div className="ml-2 h-8 w-px bg-border" />
      <Button onClick={exportPDF} variant="default" size="sm" disabled={!state.originalPdfSources.length}>
        <FileDown className="mr-2 h-4 w-4" />
        {copy.topBar.export}
      </Button>
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              {copy.topBar.menu}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{copy.topBar.language}</DropdownMenuLabel>
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
