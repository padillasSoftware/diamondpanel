import { create } from 'fontkitten'
import { resultCardFontBase64 } from './result-card-font-data'
import type { Font, Glyph } from 'fontkitten'

type ResultCardTextAnchor = 'start' | 'middle' | 'end'

type ResultCardTextPathOptions = {
  text: string
  x: number
  y: number
  fontSize: number
  fill: string
  anchor?: ResultCardTextAnchor
  stroke?: string
  strokeWidth?: number
  paintOrder?: 'stroke'
}

let resultCardFont: Font | null = null

export function resultCardTextWidth(text: string, fontSize: number) {
  const font = getResultCardFont()
  const printableText = textForFont(font, text)
  const scale = fontSize / font.unitsPerEm

  return glyphsForText(font, printableText).reduce((width, glyph) => width + glyph.advanceWidth * scale, 0)
}

export function resultCardTextPath(options: ResultCardTextPathOptions) {
  const font = getResultCardFont()
  const text = textForFont(font, options.text)
  const fontSize = options.fontSize
  const scale = fontSize / font.unitsPerEm
  const width = resultCardTextWidth(text, fontSize)
  const startX = textStartX(options.x, width, options.anchor ?? 'start')
  const paths: string[] = []
  let cursorX = startX

  for (const glyph of glyphsForText(font, text)) {
    const path = glyph.path
      .scale(scale)
      .transform(1, 0, 0, -1, cursorX, options.y)
      .toSVG()

    if (path) paths.push(path)

    cursorX += glyph.advanceWidth * scale
  }

  if (!paths.length) return ''

  const strokeAttributes = options.stroke
    ? ` stroke="${options.stroke}" stroke-width="${options.strokeWidth ?? 0}"${options.paintOrder ? ` paint-order="${options.paintOrder}"` : ''}`
    : ''

  return `<path d="${paths.join('')}" fill="${options.fill}"${strokeAttributes}/>`
}

function getResultCardFont() {
  resultCardFont ??= create(Buffer.from(resultCardFontBase64, 'base64')) as Font

  return resultCardFont
}

function glyphsForText(font: Font, text: string) {
  return font.glyphsForString(text) as Glyph[]
}

function textForFont(font: Font, text: string) {
  const fallback = font.hasGlyphForCodePoint('?'.codePointAt(0) ?? 0) ? '?' : ' '
  const cleanText = text.trim() ? text.normalize('NFC') : '~'

  return Array.from(cleanText)
    .map((character) => {
      const codePoint = character.codePointAt(0)

      return codePoint && font.hasGlyphForCodePoint(codePoint) ? character : fallback
    })
    .join('')
}

function textStartX(x: number, width: number, anchor: ResultCardTextAnchor) {
  if (anchor === 'middle') return x - width / 2
  if (anchor === 'end') return x - width

  return x
}
