export type Lang = "en" | "es"

type Copy = {
  topBar: {
    import: string
    export: string
    menu: string
    language: string
    savePrompt?: string
  }
  leftPanel: {
    pages: string
    empty: string
  }
  canvas: {
    noPdfTitle: string
    noPdfSubtitle: string
    pageLabel: (current: number, total: number) => string
  }
  rightPanel: {
    properties: string
    save: string
    load: string
    addElement: string
    text: (placing: boolean) => string
    highlight: string
    arrow: string
    selected: (count: number) => string
    multiHint: string
    fontSize: string
    color: string
    bold: string
    textAlign: string
    highlightOpacity: (value: number) => string
    width: string
    height: string
    thickness: string
    pagination: {
      title: string
      enable: string
      background: string
      position: string
      startAt: string
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
    menu: "Menu",
    language: "Language",
    savePrompt: "File name",
  },
    leftPanel: {
      pages: "Pages",
      empty: "No PDF loaded",
    },
    canvas: {
      noPdfTitle: "No PDF loaded",
      noPdfSubtitle: "Import a PDF to get started",
      pageLabel: (current, total) => `Page ${current} of ${total}`,
    },
    rightPanel: {
      properties: "Properties",
      save: "Save JSON",
      load: "Load JSON",
      addElement: "Add Element",
      text: (placing) => (placing ? "Click to place" : "Text"),
      highlight: "Highlight",
      arrow: "Arrow",
      selected: (count) => (count > 1 ? `Selected (${count})` : "Selected Element"),
      multiHint: "Shift or Cmd/Ctrl + click to add/remove elements and move them together.",
      fontSize: "Font Size",
      color: "Color",
      bold: "Bold",
      textAlign: "Text Alignment",
      highlightOpacity: (value) => `Opacity: ${Math.round(value * 100)}%`,
      width: "Width",
      height: "Height",
      thickness: "Thickness",
      pagination: {
        title: "Page Numbering",
        enable: "Enable Numbering",
        background: "Background Box",
        position: "Position",
        startAt: "Start At",
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
    menu: "Menú",
    language: "Idioma",
    savePrompt: "Nombre del archivo",
  },
    leftPanel: {
      pages: "Páginas",
      empty: "No hay PDF cargado",
    },
    canvas: {
      noPdfTitle: "No hay PDF cargado",
      noPdfSubtitle: "Importa un PDF para comenzar",
      pageLabel: (current, total) => `Página ${current} de ${total}`,
    },
    rightPanel: {
      properties: "Propiedades",
      save: "Guardar JSON",
      load: "Cargar JSON",
      addElement: "Agregar elemento",
      text: (placing) => (placing ? "Click para colocar" : "Texto"),
      highlight: "Resaltado",
      arrow: "Flecha",
      selected: (count) => (count > 1 ? `Seleccionados (${count})` : "Elemento seleccionado"),
      multiHint: "Shift o Cmd/Ctrl + click para sumar/quitar elementos y moverlos en bloque.",
      fontSize: "Tamaño de fuente",
      color: "Color",
      bold: "Negrita",
      textAlign: "Alineación",
      highlightOpacity: (value) => `Opacidad: ${Math.round(value * 100)}%`,
      width: "Ancho",
      height: "Alto",
      thickness: "Grosor",
      pagination: {
        title: "Numeración de página",
        enable: "Habilitar numeración",
        background: "Caja de fondo",
        position: "Posición",
        startAt: "Comienza en",
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
