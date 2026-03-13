"use client"
import { TopBar } from "./top-bar"
import { LeftPanel } from "./left-panel"
import { CenterCanvas } from "./center-canvas"
import { RightPanel } from "./right-panel"
import { usePDFState } from "@/hooks/use-pdf-state"

export function PDFEditor() {
  const pdfState = usePDFState()

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar pdfState={pdfState} />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel pdfState={pdfState} />
        <CenterCanvas pdfState={pdfState} />
        <RightPanel pdfState={pdfState} />
      </div>
    </div>
  )
}
