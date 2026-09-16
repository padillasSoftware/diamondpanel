import { readFile } from 'node:fs/promises'
import { getPlayerPhotoExtension, getPlayerPhotoPath, playerPhotoContentTypes } from '../../../utils/player-photos'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename') || ''
  const extension = getPlayerPhotoExtension(filename)

  if (!extension) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Foto no encontrada'
    })
  }

  try {
    const file = await readFile(getPlayerPhotoPath(filename))

    setHeader(event, 'Content-Type', playerPhotoContentTypes[extension] || 'application/octet-stream')
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

    return file
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Foto no encontrada'
    })
  }
})
