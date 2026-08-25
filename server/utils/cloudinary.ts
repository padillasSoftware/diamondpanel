import { createHash } from 'node:crypto'

type CloudinaryUploadInput = {
  file: Buffer
  contentType: string
  folder: string
  publicId: string
  tags?: string[]
}

type CloudinaryUploadResponse = {
  secure_url: string
  public_id: string
}

function getCloudinaryConfig() {
  const config = useRuntimeConfig()
  const cloudName = String(config.cloudinaryCloudName || '').trim()
  const apiKey = String(config.cloudinaryApiKey || '').trim()
  const apiSecret = String(config.cloudinaryApiSecret || '')
  const folder = cleanCloudinaryPath(String(config.cloudinaryFolder || 'diamondpanel'))

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder,
    isConfigured: Boolean(cloudName && apiKey && apiSecret)
  }
}

export function isCloudinaryConfigured() {
  return getCloudinaryConfig().isConfigured
}

export function assertCloudinaryConfiguredForProduction() {
  if (isCloudinaryConfigured() || process.env.NODE_ENV !== 'production') return

  throw createError({
    statusCode: 500,
    statusMessage: 'Cloudinary is required for image uploads in production'
  })
}

export async function uploadImageToCloudinary(input: CloudinaryUploadInput) {
  const config = getCloudinaryConfig()

  if (!config.isConfigured) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Cloudinary is not configured'
    })
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const params: Record<string, string> = {
    folder: [config.folder, cleanCloudinaryPath(input.folder)].filter(Boolean).join('/'),
    invalidate: 'true',
    overwrite: 'true',
    public_id: cleanCloudinaryPath(input.publicId),
    timestamp
  }

  if (input.tags?.length) {
    params.tags = input.tags.map(cleanCloudinaryPath).filter(Boolean).join(',')
  }

  const formData = new FormData()

  formData.set('file', `data:${input.contentType};base64,${input.file.toString('base64')}`)
  formData.set('api_key', config.apiKey)

  for (const [key, value] of Object.entries(params)) {
    formData.set(key, value)
  }

  formData.set('signature', signCloudinaryParams(params, config.apiSecret))

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')

    throw createError({
      statusCode: 502,
      statusMessage: `Cloudinary upload failed${message ? `: ${message}` : ''}`
    })
  }

  const payload = await response.json() as CloudinaryUploadResponse

  return {
    url: payload.secure_url,
    publicId: payload.public_id
  }
}

function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
  const payload = Object.entries(params)
    .filter(([, value]) => Boolean(value))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}

function cleanCloudinaryPath(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9/_-]+/gi, '-')
    .replace(/\/+/g, '/')
    .replace(/^[-/]+|[-/]+$/g, '')
    .toLowerCase()
}
