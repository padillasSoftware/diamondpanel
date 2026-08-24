import { join } from 'node:path'

export const leagueLogoPublicPrefix = '/uploads/league-logos/'

export function getLeagueLogoUploadDir() {
  return process.env.LEAGUE_LOGO_UPLOAD_DIR || join(process.cwd(), 'public', 'uploads', 'league-logos')
}

export function getLeagueLogoPath(filename: string) {
  return join(getLeagueLogoUploadDir(), filename)
}
