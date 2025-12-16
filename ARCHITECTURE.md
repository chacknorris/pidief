# PIDIEF - Arquitectura del Editor de PDF

## Resumen Ejecutivo

PIDIEF es un **editor de PDF client-side** construido con Next.js 16, React 19 y TypeScript. El sistema funciona sobre un principio fundamental: **el PDF original es inmutable** y todas las ediciones se almacenan como **overlays en un estado JSON serializable**.

## Principios de Diseño

### 1. Inmutabilidad del PDF Original
- El PDF original nunca se modifica
- Se trata como un "fondo" inmutable
- Todas las ediciones son overlays que se aplican visualmente

### 2. Estado JSON como Fuente Única de Verdad
- Todo el estado de la aplicación es serializable a JSON
- El estado puede exportarse/importarse sin pérdida de información
- Determinismo: mismo estado JSON = misma visualización

### 3. Arquitectura Client-Side
- ❌ No hay backend
- ❌ No hay OCR
- ❌ No hay edición de texto original del PDF
- ✅ Todo se ejecuta en el navegador

## Estructura del Proyecto

```
pidief/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Layout raíz con metadata
│   ├── page.tsx                 # Página principal (renderiza PDFEditor)
│   └── globals.css              # Estilos globales
│
├── components/
│   ├── pdf-editor.tsx           # Componente raíz del editor
│   ├── editor/                  # Componentes del editor
│   │   ├── top-bar.tsx         # Barra superior (Import/Save/Load)
│   │   ├── left-panel.tsx      # Panel izquierdo (lista de páginas)
│   │   ├── center-canvas.tsx   # Canvas central (área de edición)
│   │   └── right-panel.tsx     # Panel derecho (propiedades)
│   └── ui/                      # Biblioteca Shadcn/ui (50+ componentes)
│
├── hooks/
│   └── use-pdf-state.ts         # Hook principal de estado
│
└── lib/
    └── utils.ts                 # Utilidades (cn helper)
```

## Modelo de Estado

### Estructura JSON Completa

```typescript
interface DocumentState {
  document: {
    name: string              // Nombre del archivo PDF
    createdAt: string         // Timestamp ISO 8601
    pageOrder: string[]       // Array de IDs de página (orden personalizable)
  } | null

  pages: Record<string, PageData>  // Diccionario de datos por página

  pagination: {
    enabled: boolean          // Si la numeración está activa
    position: "bottom-center" | "bottom-right" | "top-right"
    startAt: number          // Número inicial (ej: 1, 5, 10)
  }
}
```

### Tipos de Elementos Overlay

#### 1. TextElement
```typescript
{
  id: string                  // "text-{timestamp}"
  type: "text"
  x: number                   // Posición X absoluta en píxeles
  y: number                   // Posición Y absoluta en píxeles
  width: number               // Ancho en píxeles
  height: number              // Alto en píxeles
  content: string             // Contenido del texto
  fontSize: number            // Tamaño de fuente en px
  color: string               // Color hex (ej: "#000000")
  bold: boolean               // Si es negrita
  textAlign: "left" | "center" | "right" | "justify"
}
```

#### 2. HighlightElement
```typescript
{
  id: string                  // "highlight-{timestamp}"
  type: "highlight"
  x: number                   // Posición X absoluta
  y: number                   // Posición Y absoluta
  width: number               // Ancho en píxeles
  height: number              // Alto en píxeles
  color: string               // Color hex (ej: "#ffff00")
  opacity: number             // Opacidad 0-1 (ej: 0.3)
}
```

#### 3. UnderlineElement
```typescript
{
  id: string                  // "underline-{timestamp}"
  type: "underline"
  x: number                   // Posición X absoluta
  y: number                   // Posición Y absoluta
  width: number               // Ancho en píxeles (generalmente de texto)
  height: number              // Alto en píxeles (generalmente 2px)
  color: string               // Color hex (ej: "#000000")
}
```

## Sistema de Coordenadas Actual

### Canvas de Referencia
- **Tamaño fijo**: 612px × 792px (US Letter size)
- **Origen**: Top-left (0, 0)
- **Sistema**: Coordenadas absolutas en píxeles

### Zoom
- Rango: 0.5x - 2.0x (50% - 200%)
- El zoom **NO afecta las coordenadas almacenadas**
- Coordenadas se almacenan siempre a zoom 1:1

### Cálculo de Coordenadas
```typescript
// Al hacer clic en el canvas:
const rect = canvas.getBoundingClientRect()
const x = (e.clientX - rect.left) / zoom
const y = (e.clientY - rect.top) / zoom

// Las coordenadas se guardan normalizadas al zoom base
```

## Flujo de Operaciones

### 1. Importar PDF
**Archivo**: `components/editor/top-bar.tsx:52-64`

```typescript
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
```

**Flujo actual** (`hooks/use-pdf-state.ts:95-125`):
1. Usuario selecciona archivo PDF
2. Sistema crea 3 páginas mock (simuladas)
3. Inicializa estado con páginas vacías
4. **⚠️ NO se parsea el PDF real** (línea 96: "Simulate PDF loading")

### 2. Renderizado Visual
**Archivo**: `components/editor/center-canvas.tsx`

**Canvas** (líneas 186-341):
- Fondo blanco (612×792 px)
- Renderiza overlays en este orden:
  1. Highlights (líneas 199-228)
  2. Underlines (líneas 230-258)
  3. Texts (líneas 260-311)
  4. Page Numbers (líneas 313-335)

**Interacciones**:
- Click en canvas → agrega texto
- Click en elemento → selecciona elemento
- Drag & Drop → mueve elemento
- Resize handle → cambia tamaño

### 3. Gestión de Páginas
**Archivo**: `components/editor/left-panel.tsx`

**Operaciones**:
- **Reordenar**: Drag & drop de thumbnails
- **Duplicar**: Copia profunda del PageData
- **Eliminar**: Borra página y actualiza índices

### 4. Edición de Propiedades
**Archivo**: `components/editor/right-panel.tsx`

**Panel por tipo**:
- **Text**: fontSize, color, bold, textAlign
- **Highlight**: color, opacity, width, height
- **Underline**: color, width, height

### 5. Exportar/Importar Estado JSON
**Archivo**: `components/editor/top-bar.tsx`

**Exportar** (líneas 27-35):
```typescript
const handleSaveJSON = () => {
  const json = pdfState.saveState()
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "pdf-state.json"
  a.click()
}
```

**Importar** (líneas 37-50):
```typescript
const handleLoadJSON = () => {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "application/json"
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const text = await file.text()
      pdfState.loadState(text)
    }
  }
  input.click()
}
```

## Sistema de Paginación

### Configuración
```typescript
pagination: {
  enabled: boolean,           // Activar/desactivar números
  position: string,           // Posición en la página
  startAt: number            // Número inicial
}
```

### Cálculo de Número de Página
```typescript
// En center-canvas.tsx:333
const pageNumber = currentPageIndex + state.pagination.startAt
```

**Ejemplo**:
- 5 páginas en orden [page-1, page-3, page-2, page-4, page-5]
- startAt = 10
- Números mostrados: 10, 11, 12, 13, 14

## Dependencias Actuales

### Framework Core
- `next@16.0.10` - Next.js framework
- `react@19.2.0` - React 19
- `typescript@^5` - TypeScript

### UI Library
- `@radix-ui/*` - Componentes headless accesibles (20+ paquetes)
- `lucide-react` - Iconos
- `tailwindcss@4.1.9` - CSS utility-first

### PDF Libraries
- ❌ **NINGUNA INSTALADA**
- 💡 Comentario en código sugiere usar `pdf.js`

## Limitaciones Conocidas

### Funcionalidad Faltante
1. ✅ Sistema de overlays funcional
2. ✅ Persistencia de estado JSON
3. ✅ Reordenamiento de páginas
4. ✅ Edición interactiva
5. ❌ **Renderizado real de PDFs**
6. ❌ **Exportación de PDF final**
7. ❌ Undo/Redo
8. ❌ Búsqueda en PDF
9. ❌ Vista multi-página
10. ❌ Impresión

### Estado Actual
El proyecto es un **prototipo funcional** del sistema de overlays, pero:
- No puede abrir PDFs reales (solo simula 3 páginas vacías)
- No puede exportar PDFs con las ediciones aplicadas
- El canvas es un div blanco, no un render del PDF original

## Próximos Pasos (Definidos por Usuario)

### Objetivo: Habilitar Composición y Exportación de PDFs Reales

#### Fase 1: Integración de Bibliotecas
1. Instalar `pdfjs-dist` (renderizado y métricas)
2. Instalar `pdf-lib` (composición y exportación)

#### Fase 2: Almacenamiento del PDF Original
- Guardar `ArrayBuffer` del PDF al importar
- Agregar `originalPdfBytes` al estado
- Mantener referencia para exportación

#### Fase 3: Normalización de Coordenadas
**⚠️ CAMBIO CRÍTICO**
- **Actual**: Coordenadas absolutas en píxeles (x: 100, y: 200)
- **Objetivo**: Coordenadas normalizadas (x: 0.16, y: 0.25)
- **Razón**: Independencia de dimensiones reales de página

**Fórmula de conversión**:
```typescript
// Al guardar elemento:
normalizedX = absoluteX / pageWidth
normalizedY = absoluteY / pageHeight

// Al renderizar/exportar:
absoluteX = normalizedX * pageWidth
absoluteY = normalizedY * pageHeight
```

#### Fase 4: Función de Exportación
```typescript
async function exportFinalPDF(
  originalPdfBytes: ArrayBuffer,
  documentState: DocumentState
): Promise<Uint8Array> {
  // 1. Cargar PDF original con pdf-lib
  // 2. Iterar páginas según pageOrder
  // 3. Aplicar overlays por página
  // 4. Retornar PDF final como Uint8Array
}
```

#### Fase 5: Mapeo de Coordenadas PDF
**Sistema de coordenadas PDF**:
- Origen: bottom-left (0, 0)
- Y crece hacia arriba

**Sistema de coordenadas Canvas**:
- Origen: top-left (0, 0)
- Y crece hacia abajo

**Conversión**:
```typescript
pdfY = pageHeight - canvasY - elementHeight
```

#### Fase 6: Renderizado de Overlays en PDF

**Orden de renderizado**:
1. Highlights (rectangulos semi-transparentes)
2. Underlines (líneas o rectángulos delgados)
3. Texts (drawText con fuentes estándar)
4. Page Numbers (si `pagination.enabled`)

**Reglas**:
- Usar `drawRectangle` para highlights/underlines
- Usar `drawText` para texto
- Aplicar opacidad correctamente
- Fallback a fuentes estándar si bold no disponible

#### Fase 7: UI de Exportación
- Botón "Export PDF" en top-bar
- Trigger de función de exportación
- Descarga automática del archivo

### Restricciones OBLIGATORIAS
- ❌ No backend
- ❌ No OCR
- ❌ No edición de texto original del PDF
- ❌ No parsing de fuentes más allá de estándar
- ❌ No romper compatibilidad del estado JSON

### Barra de Calidad
1. ✅ PDF exportado = visualización en pantalla
2. ✅ Exportación determinista y reproducible
3. ✅ Estado JSON sigue siendo la fuente única de verdad
4. ✅ Cambio en orden de páginas → export refleja el orden
5. ✅ Cambio en zoom → export NO se rompe
6. ✅ Cargar JSON antiguo → export funciona

## Plan de Implementación Iterativo

### Iteración 1: Export con Numeración de Páginas
- Instalar dependencias
- Guardar ArrayBuffer del PDF
- Implementar exportación básica
- Renderizar solo números de página

### Iteración 2: Export con Texto
- Normalizar coordenadas para texto
- Implementar drawText en pdf-lib
- Aplicar color, tamaño, alineación

### Iteración 3: Export con Highlights y Underlines
- Normalizar coordenadas para shapes
- Implementar drawRectangle con opacity
- Validar todo el flujo end-to-end

## Notas de Implementación

### Compatibilidad hacia atrás
- Estados JSON antiguos deben seguir funcionando
- Si coordenadas no están normalizadas, normalizar en runtime
- No romper estados existentes

### Manejo de Errores
- Validar que PDF original esté disponible
- Fallback a fuentes estándar si no se encuentra la fuente
- Logging claro de errores durante exportación

### Performance
- Cargar PDF original solo una vez
- Cachear métricas de página
- Optimizar conversión de coordenadas

---

**Última actualización**: 2025-12-16
**Estado**: Documentación completa - Listo para implementación
