import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import type { H3Event } from 'h3'
import { assertCloudinaryConfiguredForProduction, isCloudinaryConfigured, uploadImageToCloudinary } from './cloudinary'
import {
  getPlayerPhotoExtension,
  getPlayerPhotoPath,
  getPlayerPhotoUploadDir,
  playerPhotoContentTypes,
  playerPhotoPublicPrefix,
  type PlayerPhotoExtension
} from './player-photos'

const maxPlayerPhotoSize = 3 * 1024 * 1024
const allowedPhotoExtensions = new Set<PlayerPhotoExtension>(['png', 'jpg', 'webp'])

type UploadedPart = NonNullable<Awaited<ReturnType<typeof readMultipartFormData>>>[number]

function detectPhotoExtension(part: UploadedPart): PlayerPhotoExtension {
  const mimeType = part.type?.toLowerCase()

  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'

  const extension = part.filename?.split('.').pop()?.toLowerCase()

  if (allowedPhotoExtensions.has(extension as PlayerPhotoExtension)) {
    return extension as PlayerPhotoExtension
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'La foto debe ser PNG, JPG o WebP.'
  })
}

function safePlayerId(playerId: string) {
  return playerId.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'player'
}

export async function storePlayerPhotoUpload(event: H3Event, playerId: string) {
  const formData = await readMultipartFormData(event)
  const photo = formData?.find(part => part.name === 'photo')

  if (!photo?.data?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Selecciona una foto.'
    })
  }

  if (photo.data.byteLength > maxPlayerPhotoSize) {
    throw createError({
      statusCode: 413,
      statusMessage: 'La foto debe pesar máximo 3 MB.'
    })
  }

  const extension = detectPhotoExtension(photo)

  assertCloudinaryConfiguredForProduction()

  if (isCloudinaryConfigured()) {
    const uploaded = await uploadImageToCloudinary({
      file: photo.data,
      contentType: playerPhotoContentTypes[extension],
      folder: 'player-photos',
      publicId: `player-${safePlayerId(playerId)}`,
      tags: ['player-photo', playerId]
    })

    return uploaded.url
  }

  const filename = `player-${safePlayerId(playerId)}-${randomUUID()}.${extension}`

  await mkdir(getPlayerPhotoUploadDir(), { recursive: true })
  await writeFile(getPlayerPhotoPath(filename), photo.data)

  return `${playerPhotoPublicPrefix}${filename}`
}

export async function removeUploadedPlayerPhoto(photoUrl?: string | null) {
  if (!photoUrl?.startsWith(playerPhotoPublicPrefix)) return

  const filename = photoUrl.slice(playerPhotoPublicPrefix.length)

  if (!getPlayerPhotoExtension(filename)) return

  await unlink(getPlayerPhotoPath(filename)).catch(() => undefined)
}
