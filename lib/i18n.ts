export type Lang = "en" | "es"

type Copy = {
  topBar: {
    import: string
    export: string
    exportEditable: string
    exportEmail: string
    exportEmailWarning: string
    exportPreparing: string
    exportedSize: (size: string) => string
    menu: string
    language: string
    savePrompt?: string
    saveEditablePrompt?: string
  }
  exportDialog: {
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
  leftPanel: {
    pages: string
    empty: string
    moveTo: string
    move: string
    dropPdf: string
    dragCopyPreparing: string
    dragCopyReady: string
  }
  canvas: {
    noPdfTitle: string
    noPdfSubtitle: string
    pageLabel: (current: number, total: number) => string
    dropImage: string
  }
  rightPanel: {
    properties: string
    save: string
    load: string
    addElement: string
    text: (placing: boolean) => string
    image: string
    signature: string
    signatureHelp: string
    drawSignature: string
    uploadSignature: string
    clearSignature: string
    useSignature: string
    useOnAllPages: string
    signatureName: string
    signatureEmpty: string
    highlight: string
    arrow: string
    selected: (count: number) => string
    multiHint: string
    fontFamily: string
    fontSize: string
    color: string
    bold: string
    textAlign: string
    highlightOpacity: (value: number) => string
    highlightStyle: string
    highlightStyleFill: string
    highlightStyleBorder: string
    highlightStyleBoth: string
    highlightFillColor: string
    highlightFillOpacity: (value: number) => string
    highlightBorderColor: string
    highlightBorderOpacity: (value: number) => string
    highlightBorderWidth: string
    width: string
    height: string
    lockAspectRatio: string
    thickness: string
    pagination: {
      title: string
      enable: string
      background: string
      position: string
      startAt: string
      manualNumber: string
      manualDetail: string
      bottomCenter: string
      bottomRight: string
      topRight: string
    }
  }
}

const copy: Record<Lang, Copy> = {
  en: {
    topBar: {
      import: "Import PDF",
      export: "Export PDF",
      exportEditable: "Save Editable PDF",
      exportEmail: "Export for email (compact)",
      exportEmailWarning:
        "Compact export rasterizes pages to reduce size. Text will no longer be selectable. Continue?",
      exportPreparing: "Preparing PDF...",
      exportedSize: (size) => `Exported PDF: ${size}`,
      menu: "Menu",
      language: "Language",
      savePrompt: "File name",
      saveEditablePrompt: "Editable PDF name",
    },
    exportDialog: {
      title: "Measure export",
      description:
        "Choose the output profile, measure the exact PDF size, then download it.",
      profile: "Export profile",
      standard: "Standard",
      standardDescription: "Preserves selectable text and vector content.",
      email: "Email / compact",
      emailDescription: "Smaller image-based PDF. Text will not be selectable.",
      targetSize: "Target limit (MB)",
      targetHint: "Used only to validate the measured result.",
      dpi: "Resolution (DPI)",
      quality: "JPEG quality",
      measure: "Measure export",
      measuring: "Measuring...",
      download: "Download measured PDF",
      cancel: "Cancel",
      measured: (size) => `Measured size: ${size}`,
      withinTarget: (target) => `Within the ${target} MB target`,
      overTarget: (target) => `Above the ${target} MB target`,
      warning:
        "The compact profile rasterizes every page and may remove selectable text, forms, and interactive content.",
    },
    leftPanel: {
      pages: "Pages",
      empty: "No PDF loaded",
      moveTo: "Move to",
      move: "Move",
      dropPdf: "Drop PDF files here to insert pages",
      dragCopyPreparing: "Preparing page copy...",
      dragCopyReady: "Ready to drag a page copy",
    },
    canvas: {
      noPdfTitle: "No PDF loaded",
      noPdfSubtitle: "Import a PDF to get started",
      pageLabel: (current, total) => `Page ${current} of ${total}`,
      dropImage:
        "Drop PNG or JPG files here to insert them into the current page",
    },
    rightPanel: {
      properties: "Properties",
      save: "Save JSON",
      load: "Load JSON",
      addElement: "Add Element",
      text: (placing) => (placing ? "Click to place" : "Text"),
      image: "Image",
      signature: "Signature",
      signatureHelp:
        "Draw a signature or load a transparent PNG/JPG. It stays in this session.",
      drawSignature: "Draw",
      uploadSignature: "Load image",
      clearSignature: "Clear",
      useSignature: "Use on current page",
      useOnAllPages: "Use on all pages",
      signatureName: "Signature name",
      signatureEmpty: "Draw at least one stroke first.",
      highlight: "Highlight",
      arrow: "Arrow",
      selected: (count) =>
        count > 1 ? `Selected (${count})` : "Selected Element",
      multiHint:
        "Shift or Cmd/Ctrl + click to add/remove elements and move them together.",
      fontFamily: "Font Family",
      fontSize: "Font Size",
      color: "Color",
      bold: "Bold",
      textAlign: "Text Alignment",
      highlightOpacity: (value) => `Opacity: ${Math.round(value * 100)}%`,
      highlightStyle: "Highlight Style",
      highlightStyleFill: "Fill",
      highlightStyleBorder: "Border",
      highlightStyleBoth: "Both",
      highlightFillColor: "Fill Color",
      highlightFillOpacity: (value) =>
        `Fill Opacity: ${Math.round(value * 100)}%`,
      highlightBorderColor: "Border Color",
      highlightBorderOpacity: (value) =>
        `Border Opacity: ${Math.round(value * 100)}%`,
      highlightBorderWidth: "Border Width",
      width: "Width",
      height: "Height",
      lockAspectRatio: "Lock aspect ratio",
      thickness: "Thickness",
      pagination: {
        title: "Page Numbering",
        enable: "Enable Numbering",
        background: "Background Box",
        position: "Position",
        startAt: "Start At",
        manualNumber: "Number",
        manualDetail: "Detail",
        bottomCenter: "Bottom Center",
        bottomRight: "Bottom Right",
        topRight: "Top Right",
      },
    },
  },
  es: {
    topBar: {
      import: "Importar PDF",
      export: "Exportar PDF",
      exportEditable: "Guardar PDF editable",
      exportEmail: "Exportar para correo (compacto)",
      exportEmailWarning:
        "La exportación compacta rasteriza las páginas para reducir el peso. El texto dejará de ser seleccionable. ¿Continuar?",
      exportPreparing: "Preparando PDF...",
      exportedSize: (size) => `PDF exportado: ${size}`,
      menu: "Menú",
      language: "Idioma",
      savePrompt: "Nombre del archivo",
      saveEditablePrompt: "Nombre del PDF editable",
    },
    exportDialog: {
      title: "Medir exportación",
      description:
        "Elige el perfil, mide el peso exacto del PDF y luego descárgalo.",
      profile: "Perfil de exportación",
      standard: "Estándar",
      standardDescription:
        "Conserva el texto seleccionable y el contenido vectorial.",
      email: "Correo / compacto",
      emailDescription:
        "PDF más pequeño basado en imágenes. El texto no será seleccionable.",
      targetSize: "Límite objetivo (MB)",
      targetHint: "Solo se usa para validar el resultado medido.",
      dpi: "Resolución (DPI)",
      quality: "Calidad JPEG",
      measure: "Medir exportación",
      measuring: "Midiendo...",
      download: "Descargar PDF medido",
      cancel: "Cancelar",
      measured: (size) => `Tamaño medido: ${size}`,
      withinTarget: (target) => `Dentro del objetivo de ${target} MB`,
      overTarget: (target) => `Sobre el objetivo de ${target} MB`,
      warning:
        "El perfil compacto rasteriza cada página y puede eliminar texto seleccionable, formularios y contenido interactivo.",
    },
    leftPanel: {
      pages: "Páginas",
      empty: "No hay PDF cargado",
      moveTo: "Mover a",
      move: "Mover",
      dropPdf: "Suelta archivos PDF aquí para insertar páginas",
      dragCopyPreparing: "Preparando copia de la página...",
      dragCopyReady: "Listo para arrastrar una copia de la página",
    },
    canvas: {
      noPdfTitle: "No hay PDF cargado",
      noPdfSubtitle: "Importa un PDF para comenzar",
      pageLabel: (current, total) => `Página ${current} de ${total}`,
      dropImage:
        "Suelta archivos PNG o JPG aquí para insertarlos en la página actual",
    },
    rightPanel: {
      properties: "Propiedades",
      save: "Guardar JSON",
      load: "Cargar JSON",
      addElement: "Agregar elemento",
      text: (placing) => (placing ? "Click para colocar" : "Texto"),
      image: "Imagen",
      signature: "Firma",
      signatureHelp:
        "Dibuja una firma o carga un PNG/JPG transparente. Se mantiene en esta sesión.",
      drawSignature: "Dibujar",
      uploadSignature: "Cargar imagen",
      clearSignature: "Limpiar",
      useSignature: "Usar en página actual",
      useOnAllPages: "Usar en todas las páginas",
      signatureName: "Nombre de la firma",
      signatureEmpty: "Dibuja al menos un trazo primero.",
      highlight: "Resaltado",
      arrow: "Flecha",
      selected: (count) =>
        count > 1 ? `Seleccionados (${count})` : "Elemento seleccionado",
      multiHint:
        "Shift o Cmd/Ctrl + click para sumar/quitar elementos y moverlos en bloque.",
      fontFamily: "Fuente",
      fontSize: "Tamaño de fuente",
      color: "Color",
      bold: "Negrita",
      textAlign: "Alineación",
      highlightOpacity: (value) => `Opacidad: ${Math.round(value * 100)}%`,
      highlightStyle: "Estilo de resaltado",
      highlightStyleFill: "Relleno",
      highlightStyleBorder: "Borde",
      highlightStyleBoth: "Ambos",
      highlightFillColor: "Color de relleno",
      highlightFillOpacity: (value) =>
        `Opacidad del relleno: ${Math.round(value * 100)}%`,
      highlightBorderColor: "Color del borde",
      highlightBorderOpacity: (value) =>
        `Opacidad del borde: ${Math.round(value * 100)}%`,
      highlightBorderWidth: "Grosor del borde",
      width: "Ancho",
      height: "Alto",
      lockAspectRatio: "Bloquear proporción",
      thickness: "Grosor",
      pagination: {
        title: "Numeración de página",
        enable: "Habilitar numeración",
        background: "Caja de fondo",
        position: "Posición",
        startAt: "Comienza en",
        manualNumber: "Número",
        manualDetail: "Detalle",
        bottomCenter: "Abajo centro",
        bottomRight: "Abajo derecha",
        topRight: "Arriba derecha",
      },
    },
  },
}

export function getCopy(lang: Lang): Copy {
  return copy[lang] ?? copy.en
}
