import { readFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import sharp from 'sharp'
import { getLeagueLogoPath, leagueLogoPublicPrefix } from '../../../../utils/league-logos'
import { requireAdmin } from '../../../../utils/session'
import { getTeamLogoPath, teamLogoPublicPrefix } from '../../../../utils/team-logos'
import { getResultCardGameId, loadResultCardSvg } from './card.svg.get'
import type { H3Event } from 'h3'

const imageHrefPattern = /<image\b[^>]*\shref="([^"]+)"/g

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const gameId = getResultCardGameId(event)
  const { filename, svg } = await loadResultCardSvg(event, gameId)
  const inlinedSvg = await inlineSvgImages(svg, event)
  const png = await sharp(Buffer.from(inlinedSvg)).png().toBuffer()

  event.node.res.setHeader('Content-Type', 'image/png')
  event.node.res.setHeader('Cache-Control', 'no-store')
  event.node.res.setHeader('Content-Disposition', `inline; filename="${filename}.png"`)

  return png
})

async function inlineSvgImages(svg: string, event: H3Event) {
  const hrefs = [...new Set([...svg.matchAll(imageHrefPattern)].map(match => match[1]).filter(isString))]
  let output = svg

  for (const href of hrefs) {
    if (href.startsWith('data:')) continue

    const dataUri = await resolveImageDataUri(decodeXmlAttribute(href), event)

    if (!dataUri) continue

    output = output.replaceAll(`href="${href}"`, `href="${dataUri}"`)
  }

  return output
}

async function resolveImageDataUri(href: string, event: H3Event) {
  const buffer = await loadImageBuffer(href, event)

  if (!buffer) return null

  const png = await sharp(buffer, { failOn: 'none' }).png().toBuffer()

  return `data:image/png;base64,${png.toString('base64')}`
}

async function loadImageBuffer(href: string, event: H3Event) {
  const localBuffer = await loadLocalImageBuffer(href)

  if (localBuffer) return localBuffer

  const url = imageUrl(href, event)
  const response = await fetch(url)

  if (!response.ok) return null

  return Buffer.from(await response.arrayBuffer())
}

async function loadLocalImageBuffer(href: string) {
  if (!href.startsWith('/')) return null

  const uploadBuffer = await loadUploadImageBuffer(href)

  if (uploadBuffer) return uploadBuffer

  const relativePath = safePublicPath(href)

  if (!relativePath) return null

  const candidates = [
    join(process.cwd(), 'public', relativePath),
    join(process.cwd(), '.output', 'public', relativePath)
  ]

  for (const candidate of candidates) {
    try {
      return await readFile(candidate)
    } catch {
      // Try the next known public-assets location.
    }
  }

  return null
}

async function loadUploadImageBuffer(href: string) {
  try {
    if (href.startsWith(teamLogoPublicPrefix)) {
      return await readFile(getTeamLogoPath(href.slice(teamLogoPublicPrefix.length)))
    }

    if (href.startsWith(leagueLogoPublicPrefix)) {
      return await readFile(getLeagueLogoPath(href.slice(leagueLogoPublicPrefix.length)))
    }
  } catch {
    return null
  }

  return null
}

function imageUrl(href: string, event: H3Event) {
  if (/^https?:\/\//i.test(href)) return href

  return new URL(href, getRequestURL(event).origin).toString()
}

function safePublicPath(href: string) {
  const pathname = href.split('?')[0]?.split('#')[0] ?? ''
  const normalized = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '')

  if (!normalized || normalized.includes('\0') || normalized.startsWith('..')) return null

  return normalized.replace(/^\/+/, '')
}

function decodeXmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}
