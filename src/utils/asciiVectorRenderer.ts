const FACE_CHARACTERS = new Set(['█'])
const SHADOW_CHARACTERS = new Set(['═', '║', '╔', '╗', '╚', '╝'])

const DEFAULT_FONT_FAMILY = 'Courier New, Monaco, Menlo, monospace'
const DEFAULT_FONT_SIZE = 12
const DEFAULT_LINE_HEIGHT = 13.2
const DEFAULT_PADDING = 16
const DEFAULT_PIXEL_RATIO = 4
const DEFAULT_THRESHOLD = 160
const DEFAULT_SHADOW_OFFSET_X = 1.25
const DEFAULT_SHADOW_OFFSET_Y = 1.5
const DEFAULT_FACE_GAP_BRIDGE = 2

export interface AsciiVectorRenderOptions {
  backgroundColor?: string
  fillColor?: string
  outlineColor?: string
  fontFamily?: string
  fontSize?: number
  lineHeight?: number
  padding?: number
  pixelRatio?: number
  threshold?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
}

export interface AsciiVectorRenderResult {
  svg: string
  width: number
  height: number
}

interface TextMetricsResult {
  maxWidth: number
  ascent: number
  descent: number
}

interface RectShape {
  x: number
  y: number
  width: number
  height: number
}

const trimTrailingBlankLines = (asciiArt: string): string[] => {
  const lines = asciiArt.replace(/\r\n/g, '\n').split('\n')

  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines
}

const splitAsciiLayers = (lines: string[]): { faceLines: string[]; shadowLines: string[] } => ({
  faceLines: lines.map((line) =>
    [...line].map((char) => (FACE_CHARACTERS.has(char) ? char : ' ')).join(''),
  ),
  shadowLines: lines.map((line) =>
    [...line].map((char) => (SHADOW_CHARACTERS.has(char) ? char : ' ')).join(''),
  ),
})

const measureTextBlock = (
  lines: string[],
  fontSize: number,
  fontFamily: string,
): TextMetricsResult => {
  const fallbackMetrics = {
    maxWidth: Math.max(...lines.map((line) => line.length), 0) * fontSize * 0.6,
    ascent: fontSize * 0.8,
    descent: fontSize * 0.2,
  }

  if (typeof document === 'undefined') {
    return fallbackMetrics
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    return fallbackMetrics
  }

  context.font = `${fontSize}px ${fontFamily}`

  const maxWidth = Math.max(...lines.map((line) => context.measureText(line).width), 0)
  const sampleMetrics = context.measureText('█')

  return {
    maxWidth,
    ascent:
      sampleMetrics.fontBoundingBoxAscent ||
      sampleMetrics.actualBoundingBoxAscent ||
      fallbackMetrics.ascent,
    descent:
      sampleMetrics.fontBoundingBoxDescent ||
      sampleMetrics.actualBoundingBoxDescent ||
      fallbackMetrics.descent,
  }
}

const bridgeSmallHorizontalGaps = (binaryMap: boolean[][], maxGapWidth: number): boolean[][] => {
  const bridgedMap = binaryMap.map((row) => [...row])

  for (let y = 0; y < bridgedMap.length; y++) {
    let x = 0

    while (x < bridgedMap[y].length) {
      if (bridgedMap[y][x]) {
        x++
        continue
      }

      let gapEnd = x
      while (gapEnd < bridgedMap[y].length && !bridgedMap[y][gapEnd]) {
        gapEnd++
      }

      const gapWidth = gapEnd - x
      const hasLeft = x > 0 && bridgedMap[y][x - 1]
      const hasRight = gapEnd < bridgedMap[y].length && bridgedMap[y][gapEnd]

      if (hasLeft && hasRight && gapWidth <= maxGapWidth) {
        for (let fillX = x; fillX < gapEnd; fillX++) {
          bridgedMap[y][fillX] = true
        }
      }

      x = gapEnd
    }
  }

  return bridgedMap
}

const snapToDevicePixel = (value: number, pixelRatio: number): number =>
  Math.round(value * pixelRatio) / pixelRatio

const findLargestRectangle = (
  binaryMap: boolean[][],
  startX: number,
  startY: number,
  processedPixels: Set<string>,
): RectShape => {
  if (!binaryMap[startY] || !binaryMap[startY][startX]) {
    return { x: startX, y: startY, width: 0, height: 0 }
  }

  let maxWidth = 0
  for (let x = startX; x < binaryMap[startY].length; x++) {
    if (binaryMap[startY][x] && !processedPixels.has(`${x},${startY}`)) {
      maxWidth++
    } else {
      break
    }
  }

  if (maxWidth === 0) {
    return { x: startX, y: startY, width: 0, height: 0 }
  }

  let maxHeight = 1
  for (let y = startY + 1; y < binaryMap.length; y++) {
    let canExtend = true
    for (let x = startX; x < startX + maxWidth; x++) {
      if (!binaryMap[y] || !binaryMap[y][x] || processedPixels.has(`${x},${y}`)) {
        canExtend = false
        break
      }
    }

    if (canExtend) {
      maxHeight++
    } else {
      break
    }
  }

  let bestArea = maxWidth * maxHeight
  let bestRect = { x: startX, y: startY, width: maxWidth, height: maxHeight }

  for (let width = maxWidth - 1; width > 0; width--) {
    let height = 1

    for (let y = startY + 1; y < binaryMap.length; y++) {
      let canExtend = true
      for (let x = startX; x < startX + width; x++) {
        if (!binaryMap[y] || !binaryMap[y][x] || processedPixels.has(`${x},${y}`)) {
          canExtend = false
          break
        }
      }

      if (canExtend) {
        height++
      } else {
        break
      }
    }

    const area = width * height
    if (area > bestArea) {
      bestArea = area
      bestRect = { x: startX, y: startY, width, height }
    }
  }

  return bestRect
}

const vectorizeBinaryMap = (
  binaryMap: boolean[][],
  pixelRatio: number,
): RectShape[] => {
  const processedPixels = new Set<string>()
  const rects: RectShape[] = []

  for (let y = 0; y < binaryMap.length; y++) {
    for (let x = 0; x < binaryMap[y].length; x++) {
      const key = `${x},${y}`
      if (!binaryMap[y][x] || processedPixels.has(key)) {
        continue
      }

      const rect = findLargestRectangle(binaryMap, x, y, processedPixels)
      if (rect.width === 0 || rect.height === 0) {
        continue
      }

      rects.push({
        x: rect.x / pixelRatio,
        y: rect.y / pixelRatio,
        width: rect.width / pixelRatio,
        height: rect.height / pixelRatio,
      })

      for (let py = rect.y; py < rect.y + rect.height; py++) {
        for (let px = rect.x; px < rect.x + rect.width; px++) {
          processedPixels.add(`${px},${py}`)
        }
      }
    }
  }

  return rects
}

const renderLayerToBinaryMap = (
  lines: string[],
  canvasWidth: number,
  canvasHeight: number,
  options: {
    fontFamily: string
    fontSize: number
    lineHeight: number
    pixelRatio: number
    threshold: number
    startX: number
    startY: number
    bridgeGapWidth?: number
  },
): boolean[][] => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(canvasWidth * options.pixelRatio))
  canvas.height = Math.max(1, Math.ceil(canvasHeight * options.pixelRatio))

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to create rendering context for ASCII vectorization.')
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#000000'
  context.font = `${options.fontSize * options.pixelRatio}px ${options.fontFamily}`
  context.textBaseline = 'alphabetic'
  context.imageSmoothingEnabled = false

  lines.forEach((line, index) => {
    if (!line.trim()) {
      return
    }

    const x = snapToDevicePixel(options.startX, options.pixelRatio) * options.pixelRatio
    const y =
      snapToDevicePixel(options.startY + index * options.lineHeight, options.pixelRatio) *
      options.pixelRatio

    context.fillText(
      line,
      x,
      y,
    )
  })

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  let binaryMap: boolean[][] = Array.from({ length: canvas.height }, () =>
    Array.from({ length: canvas.width }, () => false),
  )

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4
      const alpha = data[index + 3]
      binaryMap[y][x] = alpha >= options.threshold
    }
  }

  if (options.bridgeGapWidth && options.bridgeGapWidth > 0) {
    binaryMap = bridgeSmallHorizontalGaps(binaryMap, options.bridgeGapWidth)
  }

  return binaryMap
}

const rectsToSvg = (rects: RectShape[], color: string): string =>
  rects.length === 0
    ? ''
    : `<g fill="${color}">
    ${rects
      .map(
        (rect) =>
          `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}"/>`,
      )
      .join('\n    ')}
  </g>`

export const canRenderAsciiAsVector = (asciiArt: string): boolean => {
  const visibleChars = [...asciiArt.replace(/\s/g, '')]

  return (
    visibleChars.length > 0 &&
    visibleChars.every((char) => FACE_CHARACTERS.has(char) || SHADOW_CHARACTERS.has(char)) &&
    visibleChars.some((char) => FACE_CHARACTERS.has(char)) &&
    visibleChars.some((char) => SHADOW_CHARACTERS.has(char))
  )
}

export const renderAsciiAsVectorSvg = (
  asciiArt: string,
  options: AsciiVectorRenderOptions = {},
): AsciiVectorRenderResult => {
  if (!canRenderAsciiAsVector(asciiArt)) {
    throw new Error('ASCII art contains unsupported characters for vector rendering.')
  }

  if (typeof document === 'undefined') {
    throw new Error('ASCII vector rendering requires a browser environment.')
  }

  const lines = trimTrailingBlankLines(asciiArt)
  const backgroundColor = options.backgroundColor ?? '#ffffff'
  const fillColor = options.fillColor ?? '#111111'
  const outlineColor = options.outlineColor ?? '#5a5a5a'
  const fontFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE
  const lineHeight = options.lineHeight ?? DEFAULT_LINE_HEIGHT
  const padding = options.padding ?? DEFAULT_PADDING
  const pixelRatio = options.pixelRatio ?? DEFAULT_PIXEL_RATIO
  const threshold = options.threshold ?? DEFAULT_THRESHOLD
  const shadowOffsetX = options.shadowOffsetX ?? DEFAULT_SHADOW_OFFSET_X
  const shadowOffsetY = options.shadowOffsetY ?? DEFAULT_SHADOW_OFFSET_Y

  const { faceLines, shadowLines } = splitAsciiLayers(lines)
  const { maxWidth, ascent, descent } = measureTextBlock(lines, fontSize, fontFamily)
  const baselineY = padding + ascent
  const width = Math.ceil(maxWidth + padding * 2 + shadowOffsetX)
  const height = Math.ceil(lines.length * lineHeight + padding * 2 + descent + shadowOffsetY)

  const shadowMap = renderLayerToBinaryMap(shadowLines, width, height, {
    fontFamily,
    fontSize,
    lineHeight,
    pixelRatio,
    threshold,
    startX: padding + shadowOffsetX,
    startY: baselineY + shadowOffsetY,
  })

  const faceMap = renderLayerToBinaryMap(faceLines, width, height, {
    fontFamily,
    fontSize,
    lineHeight,
    pixelRatio,
    threshold,
    startX: padding,
    startY: baselineY,
    bridgeGapWidth: DEFAULT_FACE_GAP_BRIDGE,
  })

  const shadowRects = vectorizeBinaryMap(shadowMap, pixelRatio)
  const faceRects = vectorizeBinaryMap(faceMap, pixelRatio)

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="${backgroundColor}"/>
  ${rectsToSvg(shadowRects, outlineColor)}
  ${rectsToSvg(faceRects, fillColor)}
</svg>`

  return { svg, width, height }
}
