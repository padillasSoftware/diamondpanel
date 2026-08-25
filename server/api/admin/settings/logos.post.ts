import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { prisma } from '../../../utils/db'
import { assertCloudinaryConfiguredForProduction, isCloudinaryConfigured, uploadImageToCloudinary } from '../../../utils/cloudinary'
import {
  getLeagueLogoPath,
  getLeagueLogoUploadDir,
  leagueLogoPublicPrefix
} from '../../../utils/league-logos'
import { requireAdmin } from '../../../utils/session'

const settingsId = 'default'
const maxLogoSize = 3 * 1024 * 1024

type LogoSlot = 'primary' | 'secondary'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const parts = await readMultipartFormData(event)

  if (!parts?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Selecciona una imagen.'
    })
  }

  const slotPart = parts.find(part => part.name === 'slot')
  const logoPart = parts.find(part => part.name === 'logo')
  const slot = cleanLogoSlot(slotPart?.data.toString('utf8'))

  if (!logoPart?.data?.byteLength) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Selecciona una imagen.'
    })
  }

  if (logoPart.data.byteLength > maxLogoSize) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El logo no puede pesar más de 3 MB.'
    })
  }

  const extension = detectLogoExtension(logoPart.type, logoPart.data)

  if (!extension) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Solo puedes subir logos PNG, JPG o WebP.'
    })
  }

  const currentSettings = await prisma.leagueSettings.findUnique({
    where: { id: settingsId },
    select: {
      primaryLogoUrl: true,
      secondaryLogoUrl: true
    }
  })
  let publicUrl: string

  assertCloudinaryConfiguredForProduction()

  if (isCloudinaryConfigured()) {
    const uploaded = await uploadImageToCloudinary({
      file: logoPart.data,
      contentType: logoContentType(extension),
      folder: 'league-logos',
      publicId: `${slot}-logo`,
      tags: ['league-logo', slot]
    })

    publicUrl = uploaded.url
  } else {
    const filename = `${slot}-${randomUUID()}${extension}`

    publicUrl = `${leagueLogoPublicPrefix}${filename}`

    await mkdir(getLeagueLogoUploadDir(), { recursive: true })
    await writeFile(getLeagueLogoPath(filename), logoPart.data)
  }

  const updatedSettings = await prisma.leagueSettings.upsert({
    where: { id: settingsId },
    update: logoFieldData(slot, publicUrl),
    create: {
      id: settingsId,
      ...logoFieldData(slot, publicUrl)
    },
    select: {
      primaryLogoUrl: true,
      secondaryLogoUrl: true
    }
  })

  await removePreviousLogo(slot === 'primary'
    ? currentSettings?.primaryLogoUrl
    : currentSettings?.secondaryLogoUrl)

  return {
    logoUrl: publicUrl,
    settings: updatedSettings
  }
})

function cleanLogoSlot(value: string | undefined): LogoSlot {
  const slot = value?.trim()

  if (slot === 'primary' || slot === 'secondary') return slot

  throw createError({
    statusCode: 400,
    statusMessage: 'Logo inválido.'
  })
}

function logoFieldData(slot: LogoSlot, publicUrl: string) {
  return slot === 'primary'
    ? { primaryLogoUrl: publicUrl }
    : { secondaryLogoUrl: publicUrl }
}

function detectLogoExtension(type: string | undefined, data: Buffer) {
  if (
    type === 'image/png'
    && data.length >= 8
    && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
  ) {
    return '.png'
  }

  if (
    type === 'image/jpeg'
    && data.length >= 3
    && data[0] === 0xFF
    && data[1] === 0xD8
    && data[2] === 0xFF
  ) {
    return '.jpg'
  }

  if (
    type === 'image/webp'
    && data.length >= 12
    && data.toString('ascii', 0, 4) === 'RIFF'
    && data.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return '.webp'
  }

  return ''
}

function logoContentType(extension: string) {
  if (extension === '.png') return 'image/png'
  if (extension === '.jpg') return 'image/jpeg'
  if (extension === '.webp') return 'image/webp'

  return 'application/octet-stream'
}

async function removePreviousLogo(publicUrl: string | null | undefined) {
  if (!publicUrl?.startsWith(leagueLogoPublicPrefix)) return

  try {
    await unlink(getLeagueLogoPath(publicUrl.slice(leagueLogoPublicPrefix.length)))
  } catch {
    // If the old file is already gone, keeping the new logo saved is enough.
  }
}
