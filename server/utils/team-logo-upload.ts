import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import type { H3Event } from 'h3'
import { assertCloudinaryConfiguredForProduction, isCloudinaryConfigured, uploadImageToCloudinary } from './cloudinary'
import {
  getTeamLogoExtension,
  getTeamLogoPath,
  getTeamLogoUploadDir,
  teamLogoContentTypes,
  teamLogoPublicPrefix,
  type TeamLogoExtension
} from './team-logos'

const maxTeamLogoSize = 3 * 1024 * 1024
const allowedLogoExtensions = new Set<TeamLogoExtension>(['png', 'jpg', 'webp'])

type UploadedPart = NonNullable<Awaited<ReturnType<typeof readMultipartFormData>>>[number]

function detectLogoExtension(part: UploadedPart): TeamLogoExtension {
  const mimeType = part.type?.toLowerCase()

  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'

  const extension = part.filename?.split('.').pop()?.toLowerCase()

  if (allowedLogoExtensions.has(extension as TeamLogoExtension)) {
    return extension as TeamLogoExtension
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Logo must be a PNG, JPG or WebP image'
  })
}

function safeTeamId(teamId: string) {
  return teamId.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'team'
}

export async function storeTeamLogoUpload(event: H3Event, teamId: string) {
  const formData = await readMultipartFormData(event)
  const logo = formData?.find(part => part.name === 'logo')

  if (!logo?.data?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Logo file is required'
    })
  }

  if (logo.data.byteLength > maxTeamLogoSize) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Logo must be 3MB or smaller'
    })
  }

  const extension = detectLogoExtension(logo)

  assertCloudinaryConfiguredForProduction()

  if (isCloudinaryConfigured()) {
    const uploaded = await uploadImageToCloudinary({
      file: logo.data,
      contentType: teamLogoContentTypes[extension],
      folder: 'team-logos',
      publicId: `team-${safeTeamId(teamId)}`,
      tags: ['team-logo', teamId]
    })

    return uploaded.url
  }

  const filename = `team-${safeTeamId(teamId)}-${randomUUID()}.${extension}`

  await mkdir(getTeamLogoUploadDir(), { recursive: true })
  await writeFile(getTeamLogoPath(filename), logo.data)

  return `${teamLogoPublicPrefix}${filename}`
}

export async function removeUploadedTeamLogo(logoUrl?: string | null) {
  if (!logoUrl?.startsWith(teamLogoPublicPrefix)) return

  const filename = logoUrl.slice(teamLogoPublicPrefix.length)

  if (!getTeamLogoExtension(filename)) return

  await unlink(getTeamLogoPath(filename)).catch(() => undefined)
}
