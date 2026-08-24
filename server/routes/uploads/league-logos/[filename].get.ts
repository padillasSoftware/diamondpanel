import { readFile } from 'node:fs/promises'
import { getLeagueLogoPath } from '../../../utils/league-logos'

const contentTypes: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp'
}

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename') || ''
  const match = /^(primary|secondary)-[a-f0-9-]+\.(png|jpg|webp)$/.exec(filename)

  if (!match) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Logo not found'
    })
  }

  const extension = match[2] as keyof typeof contentTypes

  try {
    const file = await readFile(getLeagueLogoPath(filename))

    setHeader(event, 'Content-Type', contentTypes[extension] || 'application/octet-stream')
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

    return file
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Logo not found'
    })
  }
})
