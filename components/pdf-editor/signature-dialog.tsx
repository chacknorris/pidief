"use client"

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PenLine, Upload } from "lucide-react"
import type { SignatureStroke } from "@/types/pdf"

interface SignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateDrawing: (strokes: SignatureStroke[], name: string) => void
  onCreateFile: (file: File, name: string) => Promise<void>
  copy: {
    signature: string
    signatureHelp: string
    drawSignature: string
    uploadSignature: string
    clearSignature: string
    signatureName: string
    signatureEmpty: string
    useSignature: string
  }
}

const CANVAS_WIDTH = 560
const CANVAS_HEIGHT = 220

function drawSignature(
  canvas: HTMLCanvasElement,
  strokes: SignatureStroke[],
  draft: SignatureStroke | null,
) {
  const context = canvas.getContext("2d")
  if (!context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.lineCap = "round"
  context.lineJoin = "round"

  for (const stroke of [...strokes, ...(draft ? [draft] : [])]) {
    if (!stroke.points.length) continue
    context.strokeStyle = stroke.color
    context.lineWidth = stroke.width
    context.beginPath()
    context.moveTo(stroke.points[0].x, stroke.points[0].y)
    stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y))
    if (stroke.points.length === 1)
      context.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y)
    context.stroke()
  }
}

export function SignatureDialog({
  open,
  onOpenChange,
  onCreateDrawing,
  onCreateFile,
  copy,
}: SignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [strokes, setStrokes] = useState<SignatureStroke[]>([])
  const [draft, setDraft] = useState<SignatureStroke | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [name, setName] = useState("")
  const [tab, setTab] = useState("draw")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (canvasRef.current) drawSignature(canvasRef.current, strokes, draft)
  }, [strokes, draft, open])

  const getPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDrawing(true)
    setDraft({ points: [getPoint(event)], color: "#162338", width: 3 })
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const point = getPoint(event)
    setDraft((current) =>
      current ? { ...current, points: [...current.points, point] } : current,
    )
  }

  const finishStroke = () => {
    if (!draft) return
    setStrokes((current) => [...current, draft])
    setDraft(null)
    setIsDrawing(false)
  }

  const handleCreateDrawing = () => {
    if (!strokes.length && !draft) return
    const finalStrokes = draft ? [...strokes, draft] : strokes
    onCreateDrawing(finalStrokes, name.trim() || copy.signature)
    onOpenChange(false)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    await onCreateFile(file, name.trim() || copy.signature)
    onOpenChange(false)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setStrokes([])
      setDraft(null)
      setName("")
      setTab("draw")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.signature}</DialogTitle>
          <DialogDescription>{copy.signatureHelp}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signatureName">{copy.signatureName}</Label>
            <Input
              id="signatureName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={copy.signature}
            />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw">
                <PenLine className="h-4 w-4" />
                {copy.drawSignature}
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4" />
                {copy.uploadSignature}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="draw" className="space-y-3">
              <div className="overflow-hidden rounded-md border bg-white">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="h-auto min-h-40 w-full touch-none cursor-crosshair"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishStroke}
                  onPointerCancel={finishStroke}
                  aria-label={copy.signature}
                />
              </div>
              {!strokes.length && !draft && (
                <p className="text-xs text-muted-foreground">
                  {copy.signatureEmpty}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStrokes([])
                  setDraft(null)
                }}
              >
                {copy.clearSignature}
              </Button>
            </TabsContent>
            <TabsContent value="upload" className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {copy.uploadSignature}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG conserva transparencia; JPG se optimiza para reducir peso.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          {tab === "draw" && (
            <Button
              type="button"
              onClick={handleCreateDrawing}
              disabled={!strokes.length && !draft}
            >
              {copy.useSignature}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
