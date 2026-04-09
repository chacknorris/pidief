"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  insertPagesIntoOrder,
  movePageInOrder,
  cloneDocumentState,
  createEmptyPageData,
  createInitialDocumentState,
} from "../lib/pdf-state"
import { getPdfJs } from "../lib/pdfjs"
import { findPidiefStateAttachment } from "../lib/editable-pdf"
import { saveBlobToUserDestination } from "../lib/file-save"
import { createImageElementFromFile } from "../lib/image-utils"
import {
  extractTextBlocksFromPage,
  inferTextBlockColors,
} from "../lib/pdf-text"
import { isTextFontFamily } from "../lib/text-fonts"
import { getCopy } from "../lib/i18n"
import type {
  ArrowElement,
  DocumentState,
  HighlightElement,
  PageData,
  PdfTextReplacementElement,
  PDFState,
  TextElement,
} from "../types/pdf"

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64")
  }

  let binary = ""
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64")
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }

  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function serializeDocumentState(state: DocumentState): string {
  const serializableState = {
    ...state,
    originalPdfBytes: state.originalPdfBytes
      ? arrayBufferToBase64(state.originalPdfBytes)
      : null,
    originalPdfSources: state.originalPdfSources.map((src) =>
      arrayBufferToBase64(src),
    ),
  }
  return JSON.stringify(serializableState, null, 2)
}

export function deserializeDocumentState(
  json: string,
): { state: DocumentState; currentPageId: string | null } | null {
  try {
    const loadedState = JSON.parse(json) as Record<string, any>

    const decodedSources = Array.isArray(loadedState.originalPdfSources)
      ? loadedState.originalPdfSources
          .map((src: unknown) =>
            typeof src === "string" ? base64ToArrayBuffer(src) : null,
          )
          .filter((src): src is ArrayBuffer => Boolean(src))
      : []

    const decodedOriginalPdf =
      typeof loadedState.originalPdfBytes === "string"
        ? base64ToArrayBuffer(loadedState.originalPdfBytes)
        : null

    const nextPageMetrics =
      loadedState.pageMetrics && typeof loadedState.pageMetrics === "object"
        ? loadedState.pageMetrics
        : {}

    const nextCurrentPageId = loadedState.document?.pageOrder?.[0] ?? null

    const coordinateSpace: DocumentState["coordinateSpace"] =
      loadedState.coordinateSpace === "pdf" ? "pdf" : "legacy-612"

    const legacyManualNumber =
      typeof loadedState.pagination?.manualNumber === "string"
        ? loadedState.pagination.manualNumber
        : ""
    const legacyManualDetail =
      typeof loadedState.pagination?.manualDetail === "string"
        ? loadedState.pagination.manualDetail
        : ""

    const normalizedPages: Record<string, PageData> = {}
    if (loadedState.pages && typeof loadedState.pages === "object") {
      Object.entries(loadedState.pages as Record<string, any>).forEach(
        ([id, page]) => {
          const footerSource =
            page.footer && typeof page.footer === "object" ? page.footer : {}
          const footer = {
            number:
              typeof footerSource.number === "string"
                ? footerSource.number
                : legacyManualNumber,
            detail:
              typeof footerSource.detail === "string"
                ? footerSource.detail
                : legacyManualDetail,
          }
          normalizedPages[id] = {
            texts: (page.texts || []).map((text: any) => ({
              ...text,
              fontFamily: isTextFontFamily(text.fontFamily)
                ? text.fontFamily
                : "Arial",
            })),
            highlights: (page.highlights || []).map((highlight: any) => ({
              ...highlight,
              style:
                highlight.style === "border" || highlight.style === "both"
                  ? highlight.style
                  : "fill",
              borderWidth:
                typeof highlight.borderWidth === "number"
                  ? highlight.borderWidth
                  : 2,
              fillColor:
                typeof highlight.fillColor === "string"
                  ? highlight.fillColor
                  : (highlight.color ?? "#ffff00"),
              fillOpacity:
                typeof highlight.fillOpacity === "number"
                  ? highlight.fillOpacity
                  : (highlight.opacity ?? 0.3),
              borderColor:
                typeof highlight.borderColor === "string"
                  ? highlight.borderColor
                  : (highlight.color ?? "#ff0000"),
              borderOpacity:
                typeof highlight.borderOpacity === "number"
                  ? highlight.borderOpacity
                  : 1,
            })),
            arrows: (page.arrows || []).map((ar: any) => ({
              ...ar,
              angle: typeof ar.angle === "number" ? ar.angle : 0,
            })),
            images: (page.images || [])
              .filter((image: any) => image && typeof image.src === "string")
              .map((image: any) => ({
                ...image,
                mimeType:
                  image.mimeType === "image/png" ||
                  image.mimeType === "image/jpeg"
                    ? image.mimeType
                    : "image/png",
                originalWidth:
                  typeof image.originalWidth === "number"
                    ? image.originalWidth
                    : typeof image.width === "number"
                      ? image.width
                      : 100,
                originalHeight:
                  typeof image.originalHeight === "number"
                    ? image.originalHeight
                    : typeof image.height === "number"
                      ? image.height
                      : 100,
                lockedAspectRatio:
                  typeof image.lockedAspectRatio === "boolean"
                    ? image.lockedAspectRatio
                    : true,
              })),
            textReplacements: (page.textReplacements || []).map(
              (replacement: any) => ({
                ...replacement,
                fontFamily: isTextFontFamily(replacement.fontFamily)
                  ? replacement.fontFamily
                  : "Arial",
                lineHeight:
                  typeof replacement.lineHeight === "number"
                    ? replacement.lineHeight
                    : typeof replacement.height === "number"
                      ? replacement.height
                      : typeof replacement.fontSize === "number"
                        ? replacement.fontSize * 1.1
                        : 16,
                baselineOffset:
                  typeof replacement.baselineOffset === "number"
                    ? replacement.baselineOffset
                    : typeof replacement.fontSize === "number"
                      ? replacement.fontSize * 0.82
                      : 13,
                bold:
                  typeof replacement.bold === "boolean"
                    ? replacement.bold
                    : false,
                italic:
                  typeof replacement.italic === "boolean"
                    ? replacement.italic
                    : false,
                textAlign:
                  replacement.textAlign === "center" ||
                  replacement.textAlign === "right"
                    ? replacement.textAlign
                    : "left",
                sourceX:
                  typeof replacement.sourceX === "number"
                    ? replacement.sourceX
                    : typeof replacement.x === "number"
                      ? replacement.x
                      : 0,
                sourceY:
                  typeof replacement.sourceY === "number"
                    ? replacement.sourceY
                    : typeof replacement.y === "number"
                      ? replacement.y
                      : 0,
                sourceWidth:
                  typeof replacement.sourceWidth === "number"
                    ? replacement.sourceWidth
                    : typeof replacement.width === "number"
                      ? replacement.width
                      : 0,
                sourceHeight:
                  typeof replacement.sourceHeight === "number"
                    ? replacement.sourceHeight
                    : typeof replacement.height === "number"
                      ? replacement.height
                      : 0,
                backgroundColor:
                  typeof replacement.backgroundColor === "string"
                    ? replacement.backgroundColor
                    : "transparent",
                maskEnabled:
                  typeof replacement.maskEnabled === "boolean"
                    ? replacement.maskEnabled
                    : true,
                maskColor:
                  typeof replacement.maskColor === "string"
                    ? replacement.maskColor
                    : "#ffffff",
              }),
            ),
            extractedTextBlocks: (page.extractedTextBlocks || [])
              .filter((block: any) => block && typeof block.text === "string")
              .map((block: any) => ({
                ...block,
                lineHeight:
                  typeof block.lineHeight === "number"
                    ? block.lineHeight
                    : typeof block.height === "number"
                      ? block.height
                      : typeof block.fontSize === "number"
                        ? block.fontSize * 1.1
                        : 16,
                baselineOffset:
                  typeof block.baselineOffset === "number"
                    ? block.baselineOffset
                    : typeof block.fontSize === "number"
                      ? block.fontSize * 0.82
                      : 13,
                fontFamily: isTextFontFamily(block.fontFamily)
                  ? block.fontFamily
                  : "Arial",
                color:
                  typeof block.color === "string" ? block.color : "#000000",
                backgroundColor:
                  typeof block.backgroundColor === "string"
                    ? block.backgroundColor
                    : "#ffffff",
                sourceFontName:
                  typeof block.sourceFontName === "string"
                    ? block.sourceFontName
                    : null,
                sourceFontFamily:
                  typeof block.sourceFontFamily === "string"
                    ? block.sourceFontFamily
                    : null,
                bold: typeof block.bold === "boolean" ? block.bold : false,
                italic:
                  typeof block.italic === "boolean" ? block.italic : false,
              })),
            footer,
          }
        },
      )
    }

    const pageIds = Object.keys(normalizedPages)
    const canMigrateLegacy =
      coordinateSpace === "legacy-612" &&
      pageIds.length > 0 &&
      pageIds.every(
        (id) => nextPageMetrics[id]?.width && nextPageMetrics[id]?.height,
      )

    const migratePage = (page: PageData, scale: number): PageData => ({
      texts: page.texts.map((text) => ({
        ...text,
        x: text.x * scale,
        y: text.y * scale,
        width: text.width * scale,
        height: text.height * scale,
        fontSize: text.fontSize * scale,
      })),
      highlights: page.highlights.map((highlight) => ({
        ...highlight,
        x: highlight.x * scale,
        y: highlight.y * scale,
        width: highlight.width * scale,
        height: highlight.height * scale,
        borderWidth: (highlight.borderWidth ?? 2) * scale,
      })),
      arrows: page.arrows.map((arrow) => ({
        ...arrow,
        x: arrow.x * scale,
        y: arrow.y * scale,
        width: arrow.width * scale,
        height: arrow.height * scale,
        thickness: arrow.thickness * scale,
        angle: typeof arrow.angle === "number" ? arrow.angle : 0,
      })),
      images: page.images.map((image) => ({
        ...image,
        x: image.x * scale,
        y: image.y * scale,
        width: image.width * scale,
        height: image.height * scale,
      })),
      textReplacements: page.textReplacements.map((replacement) => ({
        ...replacement,
        x: replacement.x * scale,
        y: replacement.y * scale,
        width: replacement.width * scale,
        height: replacement.height * scale,
        sourceX: replacement.sourceX * scale,
        sourceY: replacement.sourceY * scale,
        sourceWidth: replacement.sourceWidth * scale,
        sourceHeight: replacement.sourceHeight * scale,
        fontSize: replacement.fontSize * scale,
        lineHeight: replacement.lineHeight * scale,
        baselineOffset: replacement.baselineOffset * scale,
      })),
      extractedTextBlocks: page.extractedTextBlocks.map((block) => ({
        ...block,
        x: block.x * scale,
        y: block.y * scale,
        width: block.width * scale,
        height: block.height * scale,
        fontSize: block.fontSize * scale,
        lineHeight: block.lineHeight * scale,
        baselineOffset: block.baselineOffset * scale,
      })),
      footer: page.footer,
    })

    const migratedPages: Record<string, PageData> = {}
    if (canMigrateLegacy) {
      pageIds.forEach((id) => {
        const metrics = nextPageMetrics[id]
        const scale = metrics.width / 612
        migratedPages[id] = migratePage(normalizedPages[id], scale)
      })
    } else {
      pageIds.forEach((id) => {
        migratedPages[id] = normalizedPages[id]
      })
    }

    const restoredPagination = {
      backgroundBox: false,
      ...loadedState.pagination,
    }
    const restoredDocument =
      loadedState.document &&
      typeof loadedState.document === "object" &&
      Array.isArray(loadedState.document.pageOrder)
        ? {
            name:
              typeof loadedState.document.name === "string"
                ? loadedState.document.name
                : "document.pdf",
            createdAt:
              typeof loadedState.document.createdAt === "string"
                ? loadedState.document.createdAt
                : new Date().toISOString(),
            pageOrder: loadedState.document.pageOrder.filter(
              (pageId: unknown): pageId is string => typeof pageId === "string",
            ),
          }
        : null

    const restoredState: DocumentState = {
      document: restoredDocument,
      pages: migratedPages,
      pagination: {
        ...restoredPagination,
      },
      language: loadedState.language === "es" ? "es" : "en",
      coordinateSpace: canMigrateLegacy ? "pdf" : coordinateSpace,
      originalPdfBytes: decodedOriginalPdf,
      originalPdfSources: decodedSources,
      pageMetrics: nextPageMetrics,
    }

    return { state: restoredState, currentPageId: nextCurrentPageId }
  } catch (error) {
    console.error("Failed to load state:", error)
    return null
  }
}

export function usePDFState(): PDFState {
  const [state, setState] = useState<DocumentState>(createInitialDocumentState)
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [addMode, setAddMode] = useState<PDFState["addMode"]>(null)
  const historyRef = useRef<DocumentState[]>([])
  const copy = getCopy(state.language)

  const pushHistory = useCallback((snapshot: DocumentState) => {
    historyRef.current = [
      ...historyRef.current.slice(-19),
      cloneDocumentState(snapshot),
    ]
  }, [])

  const toggleElementSelection = useCallback(
    (id: string, additive: boolean) => {
      setSelectedElements((prev) => {
        if (additive) {
          return prev.includes(id)
            ? prev.filter((el) => el !== id)
            : [...prev, id]
        }
        return [id]
      })
    },
    [],
  )

  const clearSelection = useCallback(() => setSelectedElements([]), [])

  const loadPDF = useCallback(
    async (file: File, insertAtIndex?: number) => {
      try {
        // Read the file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        // Keep a stable copy to avoid buffer detachment when sending data to pdf.js workers
        const originalPdfBytes = arrayBuffer.slice(0)

        // Dynamically import PDF.js and configure its worker once on the client.
        const pdfjsLib = await getPdfJs()

        // Load PDF with pdfjs-dist
        // Use a clone for pdf.js to avoid detaching the stored buffer
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) })
        const pdfDocument = await loadingTask.promise
        const embeddedStateJson = findPidiefStateAttachment(
          await pdfDocument.getAttachments(),
        )

        if (
          !state.document &&
          typeof insertAtIndex !== "number" &&
          embeddedStateJson
        ) {
          const restored = deserializeDocumentState(embeddedStateJson)
          if (restored) {
            setState({
              ...restored.state,
              document: restored.state.document
                ? {
                    ...restored.state.document,
                    name: file.name,
                  }
                : restored.state.document,
            })
            setCurrentPageId(restored.currentPageId)
            setSelectedElements([])
            setAddMode(null)
            return restored.state.document?.pageOrder.length ?? 0
          }
        }

        const pageCount = pdfDocument.numPages
        const pageOrder: string[] = []
        const pages: Record<string, PageData> = {}
        const pageMetricsBase: Record<
          string,
          {
            width: number
            height: number
            pageIndex: number
            transform?: number[]
          }
        > = {}

        // Extract page metrics
        for (let i = 1; i <= pageCount; i++) {
          const page = await pdfDocument.getPage(i)
          const viewport = page.getViewport({ scale: 1.0 })
          const textContent = await page.getTextContent()
          let extractedTextBlocks = extractTextBlocksFromPage(
            textContent.items as Array<{
              str?: string
              transform?: number[]
              width?: number
              height?: number
              fontName?: string
              hasEOL?: boolean
            }>,
            textContent.styles as Record<
              string,
              {
                fontFamily?: string
                ascent?: number
                descent?: number
              }
            >,
            {
              transform: Array.from(viewport.transform || []),
            },
            pdfjsLib,
          )

          if (
            typeof document !== "undefined" &&
            extractedTextBlocks.length > 0
          ) {
            const colorCanvas = document.createElement("canvas")
            colorCanvas.width = Math.ceil(viewport.width)
            colorCanvas.height = Math.ceil(viewport.height)
            const colorContext = colorCanvas.getContext("2d", {
              willReadFrequently: true,
            })

            if (colorContext) {
              await page.render({
                canvas: colorCanvas,
                canvasContext: colorContext,
                viewport,
              }).promise

              extractedTextBlocks = inferTextBlockColors(
                extractedTextBlocks,
                colorContext.getImageData(
                  0,
                  0,
                  colorCanvas.width,
                  colorCanvas.height,
                ),
              )
            }
          }

          const pageId = `page-${Date.now()}-${i}`
          pageOrder.push(pageId)
          pages[pageId] = {
            ...createEmptyPageData(),
            extractedTextBlocks,
          }
          pageMetricsBase[pageId] = {
            width: viewport.width,
            height: viewport.height,
            pageIndex: i - 1, // zero-based index to reference the original PDF page
            transform: Array.from(viewport.transform || []),
          }
        }

        let insertedFirstPageId: string | null = null
        setState((prev) => {
          pushHistory(prev)
          const isFirst = !prev.document
          const sourceIndex = prev.originalPdfSources.length
          const pageMetrics = Object.fromEntries(
            Object.entries(pageMetricsBase).map(([pageId, metrics]) => [
              pageId,
              {
                ...metrics,
                sourceIndex,
              },
            ]),
          )
          const insertionIndex = isFirst
            ? 0
            : typeof insertAtIndex === "number"
              ? insertAtIndex
              : prev.document!.pageOrder.length
          const mergedPageOrder = isFirst
            ? pageOrder
            : insertPagesIntoOrder(
                prev.document!.pageOrder,
                pageOrder,
                insertionIndex,
              )
          const mergedPages = isFirst ? pages : { ...prev.pages, ...pages }
          const mergedMetrics = isFirst
            ? pageMetrics
            : { ...prev.pageMetrics, ...pageMetrics }
          insertedFirstPageId = pageOrder[0] ?? null

          return {
            document: isFirst
              ? {
                  name: file.name,
                  createdAt: new Date().toISOString(),
                  pageOrder: mergedPageOrder,
                }
              : {
                  ...prev.document!,
                  pageOrder: mergedPageOrder,
                },
            pages: mergedPages,
            pagination: prev.pagination,
            language: prev.language,
            coordinateSpace: prev.coordinateSpace ?? "pdf",
            // Keep legacy field for compatibility (first PDF only)
            originalPdfBytes: prev.originalPdfBytes ?? originalPdfBytes,
            originalPdfSources: [...prev.originalPdfSources, originalPdfBytes],
            pageMetrics: mergedMetrics,
          }
        })
        setCurrentPageId((prev) => prev ?? insertedFirstPageId)
        return pageCount
      } catch (error) {
        console.error("Failed to load PDF:", error)
        alert("Failed to load PDF. Please try again.")
        return 0
      }
    },
    [pushHistory, state.document],
  )

  const saveState = useCallback(() => serializeDocumentState(state), [state])

  const loadState = useCallback((json: string) => {
    const restored = deserializeDocumentState(json)
    if (!restored) return

    setState(restored.state)
    setCurrentPageId(restored.currentPageId)
    setSelectedElements([])
    setAddMode(null)
  }, [])

  useEffect(() => {
    const browserLang =
      typeof navigator !== "undefined" &&
      navigator.language?.toLowerCase().startsWith("es")
        ? "es"
        : "en"
    setState((prev) => {
      if (prev.language !== "en" || prev.document) return prev
      return { ...prev, language: browserLang }
    })
  }, [])

  const updateLanguage = useCallback(
    (lang: DocumentState["language"]) => {
      setState((prev) => {
        if (prev.language === lang) return prev
        pushHistory(prev)
        return { ...prev, language: lang }
      })
    },
    [pushHistory],
  )

  const addTextElement = useCallback(
    (x: number, y: number) => {
      if (!currentPageId) return

      const newText: TextElement = {
        id: `text-${Date.now()}`,
        type: "text",
        x,
        y,
        width: 200,
        height: 40,
        content: "New Text",
        fontFamily: "Arial",
        fontSize: 16,
        color: "#000000",
        bold: false,
        textAlign: "left",
      }

      setState((prev) => {
        pushHistory(prev)
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              ...prev.pages[currentPageId],
              texts: [...(prev.pages[currentPageId]?.texts || []), newText],
            },
          },
        }
      })
      setSelectedElements([newText.id])
    },
    [currentPageId, pushHistory],
  )

  const addImageElement = useCallback(
    async (file: File, position?: { x: number; y: number }) => {
      if (!currentPageId) return

      const pageMetrics = state.pageMetrics[currentPageId]
      if (!pageMetrics) return

      try {
        const image = await createImageElementFromFile(file, {
          width: pageMetrics.width,
          height: pageMetrics.height,
        }, position)

        setState((prev) => {
          pushHistory(prev)
          return {
            ...prev,
            pages: {
              ...prev.pages,
              [currentPageId]: {
                ...prev.pages[currentPageId],
                images: [...(prev.pages[currentPageId]?.images || []), image],
              },
            },
          }
        })
        setSelectedElements([image.id])
      } catch (error) {
        console.error("Failed to add image:", error)
        alert("Failed to add image. Please use a PNG or JPG file.")
      }
    },
    [currentPageId, pushHistory, state.pageMetrics],
  )

  const addTextReplacementFromBlock = useCallback(
    (blockId: string) => {
      if (!currentPageId) return

      setState((prev) => {
        const page = prev.pages[currentPageId] ?? createEmptyPageData()
        const sourceBlock = page.extractedTextBlocks.find(
          (block) => block.id === blockId,
        )
        if (!sourceBlock) return prev

        const existingReplacement = page.textReplacements.find(
          (replacement) => replacement.sourceBlockId === blockId,
        )
        if (existingReplacement) {
          setSelectedElements([existingReplacement.id])
          return prev
        }

        const replacement: PdfTextReplacementElement = {
          id: `pdf-text-replacement-${Date.now()}`,
          type: "pdf-text-replacement",
          sourceBlockId: sourceBlock.id,
          sourceText: sourceBlock.text,
          replacementText: sourceBlock.text,
          x: sourceBlock.x,
          y: sourceBlock.y,
          width: sourceBlock.width,
          height: sourceBlock.height,
          sourceX: sourceBlock.x,
          sourceY: sourceBlock.y,
          sourceWidth: sourceBlock.width,
          sourceHeight: sourceBlock.height,
          fontFamily: sourceBlock.fontFamily,
          fontSize: sourceBlock.fontSize,
          lineHeight: sourceBlock.lineHeight,
          baselineOffset: sourceBlock.baselineOffset,
          color: sourceBlock.color,
          bold: sourceBlock.bold,
          italic: sourceBlock.italic,
          textAlign: "left",
          backgroundColor: "transparent",
          maskEnabled: true,
          maskColor: sourceBlock.backgroundColor,
        }

        pushHistory(prev)
        setSelectedElements([replacement.id])
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              ...page,
              textReplacements: [...page.textReplacements, replacement],
            },
          },
        }
      })
    },
    [currentPageId, pushHistory],
  )

  const addHighlight = useCallback(() => {
    if (!currentPageId) return

    const newHighlight: HighlightElement = {
      id: `highlight-${Date.now()}`,
      type: "highlight",
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      color: "#ffff00",
      opacity: 0.3,
      fillColor: "#ffff00",
      fillOpacity: 0.3,
      borderColor: "#ff0000",
      borderOpacity: 1,
      style: "both",
      borderWidth: 2,
    }

    setState((prev) => {
      pushHistory(prev)
      return {
        ...prev,
        pages: {
          ...prev.pages,
          [currentPageId]: {
            ...prev.pages[currentPageId],
            highlights: [
              ...(prev.pages[currentPageId]?.highlights || []),
              newHighlight,
            ],
          },
        },
      }
    })
    setSelectedElements([newHighlight.id])
  }, [currentPageId, pushHistory])

  const addArrow = useCallback(() => {
    if (!currentPageId) return

    const newArrow: ArrowElement = {
      id: `arrow-${Date.now()}`,
      type: "arrow",
      x: 80,
      y: 120,
      width: 220,
      height: 40,
      color: "#000000",
      thickness: 2,
      angle: 0,
    }

    setState((prev) => {
      pushHistory(prev)
      return {
        ...prev,
        pages: {
          ...prev.pages,
          [currentPageId]: {
            ...prev.pages[currentPageId],
            arrows: [...(prev.pages[currentPageId]?.arrows || []), newArrow],
          },
        },
      }
    })
    setSelectedElements([newArrow.id])
  }, [currentPageId, pushHistory])

  const updateElements = useCallback(
    (updates: Record<string, any>) => {
      if (!currentPageId) return

      setState((prev) => {
        pushHistory(prev)
        const page = prev.pages[currentPageId] ?? createEmptyPageData()
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              texts: page.texts.map((el) =>
                updates[el.id] ? { ...el, ...updates[el.id] } : el,
              ),
              highlights: page.highlights.map((el) =>
                updates[el.id] ? { ...el, ...updates[el.id] } : el,
              ),
              arrows: page.arrows.map((el) =>
                updates[el.id] ? { ...el, ...updates[el.id] } : el,
              ),
              images: page.images.map((el) =>
                updates[el.id] ? { ...el, ...updates[el.id] } : el,
              ),
              textReplacements: page.textReplacements.map((el) =>
                updates[el.id] ? { ...el, ...updates[el.id] } : el,
              ),
              extractedTextBlocks: page.extractedTextBlocks,
              footer: page.footer,
            },
          },
        }
      })
    },
    [currentPageId],
  )

  const updateElement = useCallback(
    (id: string, updates: any) => {
      updateElements({ [id]: updates })
    },
    [updateElements],
  )

  const deleteElement = useCallback(
    (id: string) => {
      if (!id) return
      if (!currentPageId) return

      setState((prev) => {
        pushHistory(prev)
        const page = prev.pages[currentPageId] ?? createEmptyPageData()
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              texts: page.texts.filter((el) => el.id !== id),
              highlights: page.highlights.filter((el) => el.id !== id),
              arrows: page.arrows.filter((el) => el.id !== id),
              images: page.images.filter((el) => el.id !== id),
              textReplacements: page.textReplacements.filter(
                (el) => el.id !== id,
              ),
              extractedTextBlocks: page.extractedTextBlocks,
              footer: page.footer,
            },
          },
        }
      })
      clearSelection()
    },
    [clearSelection, currentPageId],
  )

  const deleteElements = useCallback(
    (ids: string[]) => {
      if (!currentPageId || !ids.length) return

      setState((prev) => {
        pushHistory(prev)
        const page = prev.pages[currentPageId] ?? createEmptyPageData()
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [currentPageId]: {
              texts: page.texts.filter((el) => !ids.includes(el.id)),
              highlights: page.highlights.filter((el) => !ids.includes(el.id)),
              arrows: page.arrows.filter((el) => !ids.includes(el.id)),
              images: page.images.filter((el) => !ids.includes(el.id)),
              textReplacements: page.textReplacements.filter(
                (el) => !ids.includes(el.id),
              ),
              extractedTextBlocks: page.extractedTextBlocks,
              footer: page.footer,
            },
          },
        }
      })
      clearSelection()
    },
    [clearSelection, currentPageId],
  )

  const duplicatePage = useCallback((pageId: string) => {
    setState((prev) => {
      if (!prev.document) return prev

      pushHistory(prev)
      const newPageId = `page-${Date.now()}`
      const pageIndex = prev.document.pageOrder.indexOf(pageId)
      const newPageOrder = [...prev.document.pageOrder]
      newPageOrder.splice(pageIndex + 1, 0, newPageId)

      return {
        ...prev,
        document: {
          ...prev.document,
          pageOrder: newPageOrder,
        },
        pages: {
          ...prev.pages,
          [newPageId]: JSON.parse(JSON.stringify(prev.pages[pageId])),
        },
        pageMetrics: {
          ...prev.pageMetrics,
          [newPageId]: prev.pageMetrics[pageId],
        },
      }
    })
  }, [])

  const deletePage = useCallback(
    (pageId: string) => {
      let nextPageId: string | null = null
      let changed = false

      setState((prev) => {
        if (!prev.document || prev.document.pageOrder.length === 1) return prev

        pushHistory(prev)
        const newPageOrder = prev.document.pageOrder.filter(
          (id) => id !== pageId,
        )
        const newPages = { ...prev.pages }
        delete newPages[pageId]

        const removedIndex = prev.document.pageOrder.indexOf(pageId)
        const fallbackIndex = Math.min(removedIndex, newPageOrder.length - 1)
        nextPageId = newPageOrder[fallbackIndex] ?? null
        changed = true

        return {
          ...prev,
          document: {
            ...prev.document,
            pageOrder: newPageOrder,
          },
          pages: newPages,
          pageMetrics: Object.fromEntries(
            Object.entries(prev.pageMetrics).filter(([id]) => id !== pageId),
          ),
        }
      })

      if (changed) {
        setCurrentPageId(nextPageId)
        setSelectedElements([])
      }
    },
    [setCurrentPageId, setSelectedElements],
  )

  const movePageToIndex = useCallback(
    (pageId: string, targetPosition: number) => {
      setState((prev) => {
        if (!prev.document) return prev

        const nextPageOrder = movePageInOrder(
          prev.document.pageOrder,
          pageId,
          Math.max(0, targetPosition - 1),
        )

        if (nextPageOrder.join("|") === prev.document.pageOrder.join("|")) {
          return prev
        }

        pushHistory(prev)
        return {
          ...prev,
          document: {
            ...prev.document,
            pageOrder: nextPageOrder,
          },
        }
      })
    },
    [pushHistory],
  )

  const reorderPages = useCallback(
    (draggedId: string, targetId: string) => {
      setState((prev) => {
        if (!prev.document) return prev

        const targetIndex = prev.document.pageOrder.indexOf(targetId)
        if (targetIndex < 0) return prev
        const newPageOrder = movePageInOrder(
          prev.document.pageOrder,
          draggedId,
          targetIndex,
        )
        if (newPageOrder.join("|") === prev.document.pageOrder.join("|")) {
          return prev
        }

        pushHistory(prev)
        return {
          ...prev,
          document: {
            ...prev.document,
            pageOrder: newPageOrder,
          },
        }
      })
    },
    [pushHistory],
  )

  const updatePagination = useCallback(
    (updates: Partial<DocumentState["pagination"]>) => {
      setState((prev) => {
        pushHistory(prev)
        return {
          ...prev,
          pagination: {
            ...prev.pagination,
            ...updates,
          },
        }
      })
    },
    [pushHistory],
  )

  const updatePageFooter = useCallback(
    (pageId: string, updates: Partial<PageData["footer"]>) => {
      if (!pageId) return

      setState((prev) => {
        const page = prev.pages[pageId]
        if (!page) return prev
        pushHistory(prev)
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [pageId]: {
              ...page,
              footer: {
                ...page.footer,
                ...updates,
              },
            },
          },
        }
      })
    },
    [pushHistory],
  )

  const exportPDF = useCallback(async () => {
    if (!state.originalPdfSources.length || !state.document) {
      alert("No PDF loaded to export")
      return
    }

    try {
      // Dynamically import exportFinalPDF to avoid SSR issues
      const { exportFinalPDF } = await import("@/lib/pdf-export")

      // Generate the final PDF
      const pdfBytes = await exportFinalPDF(state.originalPdfSources, state)

      // Ask for filename, fallback to original name with suffix
      const defaultName =
        state.document.name.replace(/\.pdf$/i, "") + "-edited.pdf"
      const downloadablePdf = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
      ) as ArrayBuffer
      const blob = new Blob([downloadablePdf], { type: "application/pdf" })
      const saved = await saveBlobToUserDestination(blob, {
        suggestedName: defaultName,
        types: [
          {
            description: "PDF",
            accept: {
              "application/pdf": [".pdf"],
            },
          },
        ],
      })
      if (!saved) return
    } catch (error) {
      console.error("Failed to export PDF:", error)
      alert("Failed to export PDF. Please try again.")
    }
  }, [state])

  const buildPageExport = useCallback(
    async (pageId: string) => {
      if (!state.originalPdfSources.length || !state.document) {
        return null
      }

      const page = state.pages[pageId]
      const metric = state.pageMetrics[pageId]
      if (!page || !metric) return null

      const { exportFinalPDF } = await import("@/lib/pdf-export")

      const pageLabel = state.document.pageOrder.indexOf(pageId)
      const baseName = state.document.name.replace(/\.pdf$/i, "")
      const fileName =
        pageLabel >= 0
          ? `${baseName}-page-${pageLabel + 1}.pdf`
          : `${baseName}-page.pdf`

      const singlePageState: DocumentState = {
        ...state,
        document: {
          ...state.document,
          pageOrder: [pageId],
        },
        pages: {
          [pageId]: page,
        },
        pageMetrics: {
          [pageId]: metric,
        },
      }

      const pdfBytes = await exportFinalPDF(
        state.originalPdfSources,
        singlePageState,
      )
      const downloadablePdf = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
      ) as ArrayBuffer

      return {
        blob: new Blob([downloadablePdf], { type: "application/pdf" }),
        fileName,
      }
    },
    [state],
  )

  const exportPagePDF = useCallback(
    async (pageId: string) => {
      try {
        const result = await buildPageExport(pageId)
        if (!result) {
          alert("No page available to export")
          return
        }

        const saved = await saveBlobToUserDestination(result.blob, {
          suggestedName: result.fileName,
          types: [
            {
              description: "PDF",
              accept: {
                "application/pdf": [".pdf"],
              },
            },
          ],
        })
        if (!saved) return
      } catch (error) {
        console.error("Failed to export page PDF:", error)
        alert("Failed to export page PDF. Please try again.")
      }
    },
    [buildPageExport],
  )

  const extractPage = useCallback(
    async (pageId: string) => {
      if (!state.document || state.document.pageOrder.length === 1) {
        alert("You need at least one page in the document")
        return
      }

      try {
        const result = await buildPageExport(pageId)
        if (!result) {
          alert("No page available to extract")
          return
        }

        const saved = await saveBlobToUserDestination(result.blob, {
          suggestedName: result.fileName,
          types: [
            {
              description: "PDF",
              accept: {
                "application/pdf": [".pdf"],
              },
            },
          ],
        })
        if (!saved) return

        deletePage(pageId)
      } catch (error) {
        console.error("Failed to extract page:", error)
        alert("Failed to extract page. Please try again.")
      }
    },
    [buildPageExport, deletePage, state.document],
  )

  const exportEditablePDF = useCallback(async () => {
    if (!state.originalPdfSources.length || !state.document) {
      alert("No PDF loaded to export")
      return
    }

    try {
      const { exportEditablePDF: buildEditablePDF } =
        await import("@/lib/pdf-export")

      const serializedState = serializeDocumentState(state)
      const pdfBytes = await buildEditablePDF(
        state.originalPdfSources,
        state,
        serializedState,
      )

      const defaultName =
        state.document.name.replace(/\.pdf$/i, "") + "-editable.pdf"
      const downloadablePdf = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
      ) as ArrayBuffer
      const blob = new Blob([downloadablePdf], { type: "application/pdf" })
      const saved = await saveBlobToUserDestination(blob, {
        suggestedName: defaultName,
        types: [
          {
            description: "PDF",
            accept: {
              "application/pdf": [".pdf"],
            },
          },
        ],
      })
      if (!saved) return
    } catch (error) {
      console.error("Failed to export editable PDF:", error)
      alert("Failed to export editable PDF. Please try again.")
    }
  }, [copy.topBar.saveEditablePrompt, state])

  const undo = useCallback(() => {
    const snapshot = historyRef.current.pop()
    if (!snapshot) return
    setState(snapshot)
    const nextPage =
      snapshot.document &&
      currentPageId &&
      snapshot.document.pageOrder.includes(currentPageId)
        ? currentPageId
        : (snapshot.document?.pageOrder[0] ?? null)
    setCurrentPageId(nextPage)
    setSelectedElements([])
  }, [currentPageId])

  return {
    state,
    currentPageId,
    selectedElements,
    addMode,
    loadPDF,
    saveState,
    loadState,
    exportPDF,
    exportEditablePDF,
    exportPagePDF,
    extractPage,
    buildPageExport,
    setCurrentPageId,
    setSelectedElements,
    toggleElementSelection,
    setAddMode,
    addTextElement,
    addImageElement,
    addTextReplacementFromBlock,
    addHighlight,
    addArrow,
    updateElement,
    updateElements,
    deleteElement,
    deleteElements,
    duplicatePage,
    deletePage,
    movePageToIndex,
    reorderPages,
    updatePagination,
    updatePageFooter,
    updateLanguage,
    undo,
  }
}
