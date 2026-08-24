import { readFile } from 'node:fs/promises'
import { getTeamLogoExtension, getTeamLogoPath, teamLogoContentTypes } from '../../../utils/team-logos'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename') || ''
  const extension = getTeamLogoExtension(filename)

  if (!extension) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Logo not found'
    })
  }

  try {
    const file = await readFile(getTeamLogoPath(filename))

    setHeader(event, 'Content-Type', teamLogoContentTypes[extension] || 'application/octet-stream')
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

    return file
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Logo not found'
    })
  }
})
