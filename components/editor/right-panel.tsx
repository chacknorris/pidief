"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Trash2, Type, Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify, ArrowRight } from "lucide-react"
import type { PDFState } from "@/hooks/use-pdf-state"
import { getCopy } from "@/lib/i18n"

interface RightPanelProps {
  pdfState: PDFState
}

export function RightPanel({ pdfState }: RightPanelProps) {
  const {
    state,
    currentPageId,
    selectedElements,
    addMode,
    setAddMode,
    updateElement,
    deleteElement,
    deleteElements,
    addHighlight,
    addArrow,
    updatePagination,
    updatePageFooter,
  } = pdfState

  const currentPage = currentPageId ? state.pages[currentPageId] : null
  const copy = getCopy(state.language)
  const allElements = currentPage
    ? [...(currentPage.texts || []), ...(currentPage.highlights || []), ...(currentPage.arrows || [])]
    : []
  const primaryElementId = selectedElements[selectedElements.length - 1] || null
  const element = allElements.find((el) => el.id === primaryElementId)
  const multiSelected = selectedElements.length > 1
  const footer = currentPage?.footer ?? { number: "", detail: "" }

  return (
    <div className="flex w-80 flex-col border-l border-border bg-sidebar">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold text-sidebar-foreground">{copy.rightPanel.properties}</h2>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-4">
        {/* Add Elements */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.rightPanel.addElement}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex flex-col gap-1 h-auto py-3 bg-transparent"
              onClick={() => setAddMode(addMode === "text" ? null : "text")}
            >
              <Type className="h-4 w-4" />
              <span className="text-xs">{copy.rightPanel.text(addMode === "text")}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex flex-col gap-1 h-auto py-3 bg-transparent"
              onClick={() => addHighlight()}
            >
              <Highlighter className="h-4 w-4" />
              <span className="text-xs">{copy.rightPanel.highlight}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex flex-col gap-1 h-auto py-3 bg-transparent"
              onClick={() => addArrow()}
            >
              <ArrowRight className="h-4 w-4" />
              <span className="text-xs">{copy.rightPanel.arrow}</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Element Properties */}
        {(element || multiSelected) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.rightPanel.selected(selectedElements.length)}
                </h3>
                {multiSelected && (
                  <p className="text-xs text-muted-foreground">
                    {copy.rightPanel.multiHint}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  multiSelected && selectedElements.length
                    ? deleteElements(selectedElements)
                    : element
                      ? deleteElement(element.id)
                      : undefined
                }
                className="h-7 w-7 p-0"
                disabled={!element && !multiSelected}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Text Properties */}
            {element && "content" in element && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fontSize" className="text-xs">
                    {copy.rightPanel.fontSize}
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
                    {copy.rightPanel.color}
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
                    {copy.rightPanel.bold}
                  </Label>
                  <Switch
                    id="bold"
                    checked={element.bold}
                    onCheckedChange={(checked) => updateElement(element.id, { bold: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{copy.rightPanel.textAlign}</Label>
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
            {element && "opacity" in element && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="highlightColor" className="text-xs">
                    {copy.rightPanel.highlightFillColor}
                  </Label>
                  <Input
                    id="highlightColor"
                    type="color"
                    value={element.fillColor ?? element.color}
                    onChange={(e) =>
                      updateElement(element.id, { fillColor: e.target.value, color: e.target.value })
                    }
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="highlightStyle" className="text-xs">
                    {copy.rightPanel.highlightStyle}
                  </Label>
                  <Select
                    value={element.style ?? "fill"}
                    onValueChange={(value) => updateElement(element.id, { style: value })}
                  >
                    <SelectTrigger id="highlightStyle" className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fill">{copy.rightPanel.highlightStyleFill}</SelectItem>
                      <SelectItem value="border">{copy.rightPanel.highlightStyleBorder}</SelectItem>
                      <SelectItem value="both">{copy.rightPanel.highlightStyleBoth}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opacity" className="text-xs">
                    {copy.rightPanel.highlightFillOpacity(element.fillOpacity ?? element.opacity)}
                  </Label>
                  <Slider
                    id="opacity"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[element.fillOpacity ?? element.opacity]}
                    onValueChange={([value]) =>
                      updateElement(element.id, { fillOpacity: value, opacity: value })
                    }
                  />
                </div>
                {element.style !== "fill" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="highlightBorderColor" className="text-xs">
                        {copy.rightPanel.highlightBorderColor}
                      </Label>
                      <Input
                        id="highlightBorderColor"
                        type="color"
                        value={element.borderColor ?? element.color}
                        onChange={(e) => updateElement(element.id, { borderColor: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="borderOpacity" className="text-xs">
                        {copy.rightPanel.highlightBorderOpacity(element.borderOpacity ?? element.opacity)}
                      </Label>
                      <Slider
                        id="borderOpacity"
                        min={0}
                        max={1}
                        step={0.1}
                        value={[element.borderOpacity ?? element.opacity]}
                        onValueChange={([value]) => updateElement(element.id, { borderOpacity: value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="borderWidth" className="text-xs">
                        {copy.rightPanel.highlightBorderWidth}
                      </Label>
                      <Input
                        id="borderWidth"
                        type="number"
                        value={element.borderWidth}
                        onChange={(e) => updateElement(element.id, { borderWidth: Number.parseInt(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="width" className="text-xs">
                    {copy.rightPanel.width}
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
                    {copy.rightPanel.height}
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

            {/* Arrow Properties */}
            {element && "thickness" in element && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="arrowColor" className="text-xs">
                    {copy.rightPanel.color}
                  </Label>
                  <Input
                    id="arrowColor"
                    type="color"
                    value={element.color}
                    onChange={(e) => updateElement(element.id, { color: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{copy.rightPanel.thickness}</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={element.thickness === t ? "default" : "outline"}
                        className="h-8 w-full p-0"
                        onClick={() => updateElement(element.id, { thickness: t })}
                      >
                        {t}px
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <Separator />

        {/* Pagination Settings */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.rightPanel.pagination.title}
          </h3>
          <div className="flex items-center justify-between">
            <Label htmlFor="paginationEnabled" className="text-xs">
              {copy.rightPanel.pagination.enable}
            </Label>
            <Switch
              id="paginationEnabled"
              checked={state.pagination.enabled}
              onCheckedChange={(checked) => updatePagination({ enabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="paginationBackground" className="text-xs">
              {copy.rightPanel.pagination.background}
            </Label>
            <Switch
              id="paginationBackground"
              checked={state.pagination.backgroundBox}
              onCheckedChange={(checked) => updatePagination({ backgroundBox: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position" className="text-xs">
              {copy.rightPanel.pagination.position}
            </Label>
            <Select
              value={state.pagination.position}
              onValueChange={(value: any) => updatePagination({ position: value })}
            >
              <SelectTrigger id="position" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-center">{copy.rightPanel.pagination.bottomCenter}</SelectItem>
                <SelectItem value="bottom-right">{copy.rightPanel.pagination.bottomRight}</SelectItem>
                <SelectItem value="top-right">{copy.rightPanel.pagination.topRight}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.pagination.enabled && (
            <div className="space-y-2">
              <Label htmlFor="startAt" className="text-xs">
                {copy.rightPanel.pagination.startAt}
              </Label>
              <Input
                id="startAt"
                type="number"
                value={state.pagination.startAt}
                onChange={(e) => updatePagination({ startAt: Number.parseInt(e.target.value) })}
                className="h-8"
              />
            </div>
          )}
          {!state.pagination.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="manualNumber" className="text-xs">
                  {copy.rightPanel.pagination.manualNumber}
                </Label>
                <Input
                  id="manualNumber"
                  value={footer.number}
                  onChange={(e) =>
                    currentPageId ? updatePageFooter(currentPageId, { number: e.target.value }) : undefined
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualDetail" className="text-xs">
                  {copy.rightPanel.pagination.manualDetail}
                </Label>
                <Input
                  id="manualDetail"
                  value={footer.detail}
                  onChange={(e) =>
                    currentPageId ? updatePageFooter(currentPageId, { detail: e.target.value }) : undefined
                  }
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
