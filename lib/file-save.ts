type PickerAcceptType = {
  description?: string
  accept: Record<string, string[]>
}

type SaveFilePickerOptions = {
  suggestedName: string
  types?: PickerAcceptType[]
}

type FileSystemWritableFileStreamLike = {
  write: (data: Blob | BufferSource | string) => Promise<void>
  close: () => Promise<void>
}

type FileSystemFileHandleLike = {
  createWritable: () => Promise<FileSystemWritableFileStreamLike>
}

type PickerCapableWindow = Window & {
  showSaveFilePicker?: (
    options: SaveFilePickerOptions,
  ) => Promise<FileSystemFileHandleLike>
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export async function saveBlobToUserDestination(
  blob: Blob,
  options: SaveFilePickerOptions,
): Promise<boolean> {
  const pickerWindow = window as PickerCapableWindow

  if (window.isSecureContext && pickerWindow.showSaveFilePicker) {
    try {
      const handle = await pickerWindow.showSaveFilePicker(options)
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return true
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return false
      }
      throw error
    }
  }

  downloadBlob(blob, options.suggestedName)
  return true
}
