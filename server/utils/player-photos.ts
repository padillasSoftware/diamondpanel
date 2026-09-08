import { join } from 'node:path'

export const playerPhotoPublicPrefix = '/uploads/player-photos/'

export const playerPhotoContentTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp'
} as const

export type PlayerPhotoExtension = keyof typeof playerPhotoContentTypes

const playerPhotoFilenamePattern = /^player-[a-z0-9]+-[a-f0-9-]+\.(png|jpg|webp)$/

export function getPlayerPhotoUploadDir() {
  return process.env.PLAYER_PHOTO_UPLOAD_DIR || join(process.cwd(), 'public', 'uploads', 'player-photos')
}

export function getPlayerPhotoPath(filename: string) {
  return join(getPlayerPhotoUploadDir(), filename)
}

export function getPlayerPhotoExtension(filename: string) {
  const match = playerPhotoFilenamePattern.exec(filename)

  return match?.[1] as PlayerPhotoExtension | undefined
}
