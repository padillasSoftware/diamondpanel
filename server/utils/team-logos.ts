import { join } from 'node:path'

export const teamLogoPublicPrefix = '/uploads/team-logos/'

export const teamLogoContentTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp'
} as const

export type TeamLogoExtension = keyof typeof teamLogoContentTypes

const teamLogoFilenamePattern = /^team-[a-z0-9]+-[a-f0-9-]+\.(png|jpg|webp)$/

export function getTeamLogoUploadDir() {
  return process.env.TEAM_LOGO_UPLOAD_DIR || join(process.cwd(), 'public', 'uploads', 'team-logos')
}

export function getTeamLogoPath(filename: string) {
  return join(getTeamLogoUploadDir(), filename)
}

export function getTeamLogoExtension(filename: string) {
  const match = teamLogoFilenamePattern.exec(filename)

  return match?.[1] as TeamLogoExtension | undefined
}
