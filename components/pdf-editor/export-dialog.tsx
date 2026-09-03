"use client"

import { useState } from "react"
import { Download, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { saveBlobToUserDestination } from "@/lib/file-save"
import type { ExportArtifact, ExportProfile, ExportRequest } from "@/types/pdf"

interface ExportDialogProps {
  open: boolean
  initialProfile: ExportProfile
  onOpenChange: (open: boolean) => void
  buildExportPDF: (request: ExportRequest) => Promise<ExportArtifact | null>
  copy: {
    title: string
    description: string
    profile: string
    standard: string
    standardDescription: string
    email: string
    emailDescription: string
    targetSize: string
    targetHint: string
    dpi: string
    quality: string
    measure: string
    measuring: string
    download: string
    cancel: string
    measured: (size: string) => string
    withinTarget: (target: string) => string
    overTarget: (target: string) => string
    warning: string
  }
}

const DEFAULT_DPI = 120
const DEFAULT_QUALITY = 0.72
const DEFAULT_TARGET_SIZE_MB = 10

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ExportDialog({
  open,
  initialProfile,
  onOpenChange,
  buildExportPDF,
  copy,
}: ExportDialogProps) {
  const [profile, setProfile] = useState<ExportProfile>(initialProfile)
  const [dpi, setDpi] = useState(DEFAULT_DPI)
  const [quality, setQuality] = useState(DEFAULT_QUALITY)
  const [targetSizeMb, setTargetSizeMb] = useState(DEFAULT_TARGET_SIZE_MB)
  const [artifact, setArtifact] = useState<ExportArtifact | null>(null)
  const [isMeasuring, setIsMeasuring] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setProfile(initialProfile)
      setDpi(DEFAULT_DPI)
      setQuality(DEFAULT_QUALITY)
      setTargetSizeMb(DEFAULT_TARGET_SIZE_MB)
      setArtifact(null)
    }
    onOpenChange(nextOpen)
  }

  const request: ExportRequest = {
    profile,
    emailDpi: dpi,
    emailQuality: quality,
  }

  const handleMeasure = async () => {
    setIsMeasuring(true)
    setArtifact(null)
    try {
      setArtifact(await buildExportPDF(request))
    } finally {
      setIsMeasuring(false)
    }
  }

  const handleDownload = async () => {
    if (!artifact) return
    const saved = await saveBlobToUserDestination(artifact.blob, {
      suggestedName: artifact.fileName,
      types: [
        {
          description: "PDF",
          accept: { "application/pdf": [".pdf"] },
        },
      ],
    })
    if (saved) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="exportProfile">{copy.profile}</Label>
            <Select
              value={profile}
              onValueChange={(value) => {
                setProfile(value as ExportProfile)
                setArtifact(null)
              }}
            >
              <SelectTrigger id="exportProfile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  <div>
                    <div>{copy.standard}</div>
                    <div className="text-xs text-muted-foreground">
                      {copy.standardDescription}
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div>
                    <div>{copy.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {copy.emailDescription}
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="targetSizeMb">{copy.targetSize}</Label>
              <Input
                id="targetSizeMb"
                type="number"
                min={0.1}
                max={1000}
                step={0.5}
                value={targetSizeMb}
                onChange={(event) => {
                  setTargetSizeMb(
                    Math.max(
                      0.1,
                      Math.min(1000, Number(event.target.value) || 0.1),
                    ),
                  )
                }}
                className="h-8 w-24"
              />
            </div>
            <p className="text-xs text-muted-foreground">{copy.targetHint}</p>
          </div>

          {profile === "email" && (
            <div className="space-y-4 rounded-md border border-border bg-muted/30 p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="emailDpi">{copy.dpi}</Label>
                  <Input
                    id="emailDpi"
                    type="number"
                    min={72}
                    max={180}
                    step={12}
                    value={dpi}
                    onChange={(event) => {
                      setDpi(
                        Math.max(
                          72,
                          Math.min(180, Number(event.target.value) || 72),
                        ),
                      )
                      setArtifact(null)
                    }}
                    className="h-8 w-24"
                  />
                </div>
                <Slider
                  min={72}
                  max={180}
                  step={12}
                  value={[dpi]}
                  onValueChange={([value]) => {
                    setDpi(value)
                    setArtifact(null)
                  }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="emailQuality">{copy.quality}</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(quality * 100)}%
                  </span>
                </div>
                <Slider
                  id="emailQuality"
                  min={0.4}
                  max={0.9}
                  step={0.04}
                  value={[quality]}
                  onValueChange={([value]) => {
                    setQuality(value)
                    setArtifact(null)
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{copy.warning}</p>
            </div>
          )}

          {artifact && (
            <div
              className={`rounded-md border p-4 ${
                artifact.sizeBytes <= targetSizeMb * 1024 * 1024
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-amber-500/40 bg-amber-500/5"
              }`}
            >
              <p className="text-sm font-semibold">
                {copy.measured(formatBytes(artifact.sizeBytes))}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {artifact.fileName}
              </p>
              <p
                className={`mt-2 text-xs font-medium ${
                  artifact.sizeBytes <= targetSizeMb * 1024 * 1024
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                {artifact.sizeBytes <= targetSizeMb * 1024 * 1024
                  ? copy.withinTarget(String(targetSizeMb))
                  : copy.overTarget(String(targetSizeMb))}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleMeasure()}
            disabled={isMeasuring}
          >
            <Gauge className="h-4 w-4" />
            {isMeasuring ? copy.measuring : copy.measure}
          </Button>
          <Button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!artifact || isMeasuring}
          >
            <Download className="h-4 w-4" />
            {copy.download}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
