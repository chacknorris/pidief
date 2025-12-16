"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Trash2, Type, Highlighter, Minus, AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react"
import type { PDFState } from "@/hooks/use-pdf-state"

interface RightPanelProps {
  pdfState: PDFState
}

export function RightPanel({ pdfState }: RightPanelProps) {
  const {
    state,
    currentPageId,
    selectedElement,
    updateElement,
    deleteElement,
    addHighlight,
    addUnderline,
    updatePagination,
  } = pdfState

  const currentPage = currentPageId ? state.pages[currentPageId] : null
  const allElements = currentPage
    ? [...(currentPage.texts || []), ...(currentPage.highlights || []), ...(currentPage.underlines || [])]
    : []
  const element = allElements.find((el) => el.id === selectedElement)

  return (
    <div className="flex w-80 flex-col border-l border-border bg-sidebar">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold text-sidebar-foreground">Properties</h2>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-4">
        {/* Add Elements */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add Element</h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex flex-col gap-1 h-auto py-3 bg-transparent"
              onClick={() => {
                const x = 100
                const y = 100
                pdfState.addTextElement(x, y)
              }}
            >
              <Type className="h-4 w-4" />
              <span className="text-xs">Text</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex flex-col gap-1 h-auto py-3 bg-transparent"
              onClick={() => addHighlight()}
            >
              <Highlighter className="h-4 w-4" />
              <span className="text-xs">Highlight</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex flex-col gap-1 h-auto py-3 bg-transparent"
              onClick={() => addUnderline()}
            >
              <Minus className="h-4 w-4" />
              <span className="text-xs">Underline</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Element Properties */}
        {element && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected Element</h3>
              <Button size="sm" variant="ghost" onClick={() => deleteElement(element.id)} className="h-7 w-7 p-0">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Text Properties */}
            {"content" in element && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fontSize" className="text-xs">
                    Font Size
                  </Label>
                  <Input
                    id="fontSize"
                    type="number"
                    value={element.fontSize}
                    onChange={(e) => updateElement(element.id, { fontSize: Number.parseInt(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color" className="text-xs">
                    Color
                  </Label>
                  <Input
                    id="color"
                    type="color"
                    value={element.color}
                    onChange={(e) => updateElement(element.id, { color: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="bold" className="text-xs">
                    Bold
                  </Label>
                  <Switch
                    id="bold"
                    checked={element.bold}
                    onCheckedChange={(checked) => updateElement(element.id, { bold: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Text Alignment</Label>
                  <div className="grid grid-cols-4 gap-1">
                    <Button
                      size="sm"
                      variant={element.textAlign === "left" ? "default" : "outline"}
                      className="h-8 w-full p-0"
                      onClick={() => updateElement(element.id, { textAlign: "left" })}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={element.textAlign === "center" ? "default" : "outline"}
                      className="h-8 w-full p-0"
                      onClick={() => updateElement(element.id, { textAlign: "center" })}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={element.textAlign === "right" ? "default" : "outline"}
                      className="h-8 w-full p-0"
                      onClick={() => updateElement(element.id, { textAlign: "right" })}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={element.textAlign === "justify" ? "default" : "outline"}
                      className="h-8 w-full p-0"
                      onClick={() => updateElement(element.id, { textAlign: "justify" })}
                    >
                      <AlignJustify className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Highlight Properties */}
            {"opacity" in element && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="highlightColor" className="text-xs">
                    Color
                  </Label>
                  <Input
                    id="highlightColor"
                    type="color"
                    value={element.color}
                    onChange={(e) => updateElement(element.id, { color: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opacity" className="text-xs">
                    Opacity: {Math.round(element.opacity * 100)}%
                  </Label>
                  <Slider
                    id="opacity"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[element.opacity]}
                    onValueChange={([value]) => updateElement(element.id, { opacity: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width" className="text-xs">
                    Width
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    value={element.width}
                    onChange={(e) => updateElement(element.id, { width: Number.parseInt(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-xs">
                    Height
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    value={element.height}
                    onChange={(e) => updateElement(element.id, { height: Number.parseInt(e.target.value) })}
                    className="h-8"
                  />
                </div>
              </>
            )}

            {/* Underline Properties */}
            {"width" in element && !("opacity" in element) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="underlineColor" className="text-xs">
                    Color
                  </Label>
                  <Input
                    id="underlineColor"
                    type="color"
                    value={element.color}
                    onChange={(e) => updateElement(element.id, { color: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="underlineWidth" className="text-xs">
                    Width
                  </Label>
                  <Input
                    id="underlineWidth"
                    type="number"
                    value={element.width}
                    onChange={(e) => updateElement(element.id, { width: Number.parseInt(e.target.value) })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="underlineHeight" className="text-xs">
                    Height
                  </Label>
                  <Input
                    id="underlineHeight"
                    type="number"
                    value={element.height}
                    onChange={(e) => updateElement(element.id, { height: Number.parseInt(e.target.value) })}
                    className="h-8"
                  />
                </div>
              </>
            )}
          </div>
        )}

        <Separator />

        {/* Pagination Settings */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Page Numbering</h3>
          <div className="flex items-center justify-between">
            <Label htmlFor="paginationEnabled" className="text-xs">
              Enable Numbering
            </Label>
            <Switch
              id="paginationEnabled"
              checked={state.pagination.enabled}
              onCheckedChange={(checked) => updatePagination({ enabled: checked })}
            />
          </div>
          {state.pagination.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="position" className="text-xs">
                  Position
                </Label>
                <Select
                  value={state.pagination.position}
                  onValueChange={(value: any) => updatePagination({ position: value })}
                >
                  <SelectTrigger id="position" className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-center">Bottom Center</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startAt" className="text-xs">
                  Start At
                </Label>
                <Input
                  id="startAt"
                  type="number"
                  value={state.pagination.startAt}
                  onChange={(e) => updatePagination({ startAt: Number.parseInt(e.target.value) })}
                  className="h-8"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
