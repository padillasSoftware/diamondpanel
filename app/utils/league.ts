export type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
export type TeamBranch = 'VARONIL' | 'FEMENIL'
export type TeamCategory = 'A' | 'B' | 'C' | 'D' | 'E' | 'R'
export type TeamMemberRole = 'PLAYER' | 'MANAGER' | 'COACH'
export type GameBattingHighlightSide = 'WINNER' | 'LOSER'
export type PlayoffEligibilityMode = 'LINEUP_GAMES' | 'OPEN_ROSTER'

export const TEAM_CATEGORY_VALUES: TeamCategory[] = ['A', 'B', 'C', 'D', 'E', 'R']

export const TEAM_CATEGORY_OPTIONS: { label: string, value: 'ALL' | TeamCategory }[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Categoría A', value: 'A' },
  { label: 'Categoría B', value: 'B' },
  { label: 'Categoría C', value: 'C' },
  { label: 'Categoría D', value: 'D' },
  { label: 'Categoría E', value: 'E' },
  { label: 'Categoría R', value: 'R' }
]

export const TEAM_BRANCH_OPTIONS: { label: string, value: 'ALL' | TeamBranch }[] = [
  { label: 'Ambas ramas', value: 'ALL' },
  { label: 'Varonil', value: 'VARONIL' },
  { label: 'Femenil', value: 'FEMENIL' }
]

export const TEAM_MEMBER_ROLE_OPTIONS: { label: string, value: TeamMemberRole }[] = [
  { label: 'Jugador', value: 'PLAYER' },
  { label: 'Manejador', value: 'MANAGER' },
  { label: 'Coach', value: 'COACH' }
]

export const PLAYER_POSITION_OPTIONS = [
  'FIELDER',
  'INFIELDER',
  'PITCHER',
  'CATCHER',
  'UTILITY'
]

export type Season = {
  id: string
  name: string
  year: number
  status: string
  startsAt?: string | null
  endsAt?: string | null
  playoffEligibilityMode?: PlayoffEligibilityMode
  playoffMinimumLineupGames?: number
}

export type Player = {
  id: string
  firstName: string
  lastName: string
  curp: string | null
  birthDate: string | null
  number: number | null
  memberRole: TeamMemberRole
  position: string | null
  bats: string
  throws: string
  status: string
  lineupGames?: number
  isPlayoffEligible?: boolean
}

export type AdminPlayer = Player & {
  createdAt: string
  updatedAt: string
}

export type TeamSummary = {
  id: string
  name: string
  shortName: string | null
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  category: TeamCategory
  branch: TeamBranch
  managerName?: string | null
  status?: string
  players?: Player[]
}

export type Team = TeamSummary & {
  managerName: string | null
  status: string
  players: Player[]
}

export type TeamDetail = Team & {
  playoffEligibilityMode?: PlayoffEligibilityMode
  playoffMinimumLineupGames?: number
  seasons: {
    season: Season
  }[]
}

export type Standing = {
  rank: number
  team: TeamSummary
  played: number
  wins: number
  losses: number
  ties: number
  runsFor: number
  runsAgainst: number
  runDifferential: number
  winPercentage: number
  winPercentageText: string
  streak: string
}

export type Game = {
  id: string
  round: number | null
  scheduledAt: string
  status: string
  notes?: string | null
  field: {
    id: string
    name: string
    address?: string | null
  } | null
  homeTeam: TeamSummary
  awayTeam: TeamSummary
}

export type ResultPlayer = {
  id: string
  firstName: string
  lastName: string
  number: number | null
  position: string | null
  teamId: string
}

export type BattingHighlight = {
  id: string
  side: GameBattingHighlightSide
  order: number
  atBats: number
  hits: number
  homeRuns: number
  teamId: string
  playerId: string | null
  playerName: string
  player: ResultPlayer | null
}

export type ResultGame = Game & {
  result: {
    id: string
    homeScore: number
    awayScore: number
    innings: number | null
    isForfeit: boolean
    recordedAt: string
    notes: string | null
    winningPitcherId: string | null
    losingPitcherId: string | null
    winningPitcherName: string | null
    losingPitcherName: string | null
    winningPitcher: ResultPlayer | null
    losingPitcher: ResultPlayer | null
    battingHighlights: BattingHighlight[]
  }
}

const gameDateFormatter = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Tijuana'
})

const shortDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Tijuana'
})

const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Tijuana'
})

const scheduleDayFormatter = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  timeZone: 'America/Tijuana'
})

const scheduleDateKeyFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Tijuana'
})

export function formatGameDate(value: string) {
  return gameDateFormatter.format(new Date(value))
}

export function formatScheduleDay(value: string) {
  return scheduleDayFormatter.format(new Date(value))
}

export function scheduleDateKey(value: string) {
  const parts = Object.fromEntries(
    scheduleDateKeyFormatter.formatToParts(new Date(value)).map(part => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value))
}

export function formatGameTime(value: string) {
  return timeFormatter.format(new Date(value))
}

export function formatRunDifferential(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

export function roundLabel(round: number | null) {
  return round ? `Rol #${round}` : 'Rol por definir'
}

export function teamInitials(team: TeamSummary) {
  return team.shortName ?? team.name.slice(0, 2).toUpperCase()
}

export function categoryLabel(category?: string) {
  if (category === 'A') return 'Categoría A'
  if (category === 'B') return 'Categoría B'
  if (category === 'C') return 'Categoría C'
  if (category === 'D') return 'Categoría D'
  if (category === 'E') return 'Categoría E'
  if (category === 'R') return 'Categoría R'

  return 'Sin categoría'
}

export function categoryColor(category?: string): BadgeColor {
  if (category === 'A') return 'primary'
  if (category === 'B') return 'info'
  if (category === 'C') return 'success'
  if (category === 'D') return 'warning'
  if (category === 'E') return 'error'
  if (category === 'R') return 'secondary'

  return 'neutral'
}

export function branchLabel(branch?: string) {
  if (branch === 'VARONIL') return 'Varonil'
  if (branch === 'FEMENIL') return 'Femenil'

  return 'Sin rama'
}

export function branchColor(branch?: string): BadgeColor {
  if (branch === 'VARONIL') return 'neutral'
  if (branch === 'FEMENIL') return 'secondary'

  return 'neutral'
}

export function gameStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SCHEDULED: 'Programado',
    POSTPONED: 'Suspendido',
    CANCELLED: 'Cancelado',
    FINAL: 'Final'
  }

  return labels[status] ?? status
}

export function gameStatusColor(status: string): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    SCHEDULED: 'primary',
    POSTPONED: 'warning',
    CANCELLED: 'error',
    FINAL: 'success'
  }

  return colors[status] ?? 'neutral'
}

export function teamStatusLabel(status?: string) {
  if (status === 'ACTIVE') return 'Activo'
  if (status === 'INACTIVE') return 'Inactivo'

  return 'Sin estado'
}

export function teamStatusColor(status?: string): BadgeColor {
  if (status === 'ACTIVE') return 'success'
  if (status === 'INACTIVE') return 'neutral'

  return 'neutral'
}

export function memberRoleLabel(role?: string) {
  if (role === 'PLAYER') return 'Jugador'
  if (role === 'MANAGER') return 'Manejador'
  if (role === 'COACH') return 'Coach'

  return 'Integrante'
}

export function playerPositionLabel(position?: string | null) {
  if (position === 'FIELDER') return 'Jardinero'
  if (position === 'INFIELDER') return 'Cuadro'
  if (position === 'PITCHER') return 'Pitcher'
  if (position === 'CATCHER') return 'Catcher'
  if (position === 'UTILITY') return 'Utility'

  return position || '-'
}

export function memberRoleColor(role?: string): BadgeColor {
  if (role === 'PLAYER') return 'primary'
  if (role === 'MANAGER') return 'warning'
  if (role === 'COACH') return 'info'

  return 'neutral'
}

export function scoreClass(game: ResultGame, side: 'home' | 'away') {
  const homeWon = game.result.homeScore > game.result.awayScore
  const awayWon = game.result.awayScore > game.result.homeScore

  if ((side === 'home' && homeWon) || (side === 'away' && awayWon)) {
    return 'text-emerald-700 dark:text-emerald-300'
  }

  return 'text-muted'
}

export function resultWinnerLabel(game: ResultGame) {
  if (game.result.homeScore === game.result.awayScore) return 'Empate'

  const winner = game.result.homeScore > game.result.awayScore
    ? game.homeTeam
    : game.awayTeam

  return `Ganó ${winner.shortName ?? winner.name}`
}

export function resultPlayerName(player: ResultPlayer | null | undefined) {
  if (!player) return '-'

  const number = player.number === null ? '' : `#${player.number} `

  return `${number}${player.firstName} ${player.lastName}`
}

export function resultPersonName(name: string | null | undefined, player?: ResultPlayer | null) {
  return name?.trim() || resultPlayerName(player)
}

export function battingHighlightLabel(highlight: BattingHighlight) {
  const homeRunText = highlight.homeRuns ? `, ${highlight.homeRuns} HR` : ''

  return `${resultPersonName(highlight.playerName, highlight.player)} ${highlight.hits}-${highlight.atBats}${homeRunText}`
}

export function streakLabel(streak: string) {
  if (!streak || streak === '-') return '-'

  const streakType = streak.charAt(0)
  const label = {
    W: 'G',
    L: 'P',
    T: 'E'
  }[streakType] ?? streakType

  return `${label}${streak.slice(1)}`
}

export function streakColor(streak: string): BadgeColor {
  if (streak.startsWith('W')) return 'success'
  if (streak.startsWith('L')) return 'error'
  if (streak.startsWith('T')) return 'warning'

  return 'neutral'
}

export function playerName(player: Player) {
  return `${player.firstName} ${player.lastName}`
}

export function handLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    RIGHT: 'Derecha',
    LEFT: 'Izquierda',
    SWITCH: 'Ambos',
    UNKNOWN: '-'
  }

  return value ? labels[value] ?? value : '-'
}

export function seasonStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Borrador',
    ACTIVE: 'Activa',
    ARCHIVED: 'Archivada'
  }

  return labels[status] ?? status
}

export function seasonStatusColor(status: string): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    DRAFT: 'neutral',
    ACTIVE: 'success',
    ARCHIVED: 'warning'
  }

  return colors[status] ?? 'neutral'
}
