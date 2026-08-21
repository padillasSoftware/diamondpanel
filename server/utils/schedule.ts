import { GameStatus, SeasonStatus, TeamBranch, TeamCategory, TeamStatus } from '../generated/prisma/enums'
import type { Prisma } from '../generated/prisma/client'
import { cleanEnum, cleanNumber, cleanOptionalText, cleanRequiredText } from './validation'

const leagueTimeZone = 'America/Tijuana'
const maxConfiguredRounds = 12

type TeamBranchValue = (typeof TeamBranch)[keyof typeof TeamBranch]
type TeamCategoryValue = (typeof TeamCategory)[keyof typeof TeamCategory]
type GameStatusValue = (typeof GameStatus)[keyof typeof GameStatus]

type DateParts = {
  year: number
  month: number
  day: number
}

export const scheduleTeamSelect = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  logoUrl: true,
  primaryColor: true,
  secondaryColor: true,
  category: true,
  branch: true,
  status: true
} as const

export const adminScheduleGameSelect = {
  id: true,
  round: true,
  scheduledAt: true,
  status: true,
  notes: true,
  field: {
    select: {
      id: true,
      name: true,
      address: true
    }
  },
  homeTeam: {
    select: scheduleTeamSelect
  },
  awayTeam: {
    select: scheduleTeamSelect
  },
  result: {
    select: {
      id: true
    }
  }
} as const

export const scheduleCategories = [
  TeamCategory.A,
  TeamCategory.B,
  TeamCategory.C,
  TeamCategory.D,
  TeamCategory.E,
  TeamCategory.R
] as const

export const scheduleBranches = [
  TeamBranch.VARONIL,
  TeamBranch.FEMENIL
] as const

const leagueDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: leagueTimeZone
})

const timeZoneOffsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: leagueTimeZone,
  timeZoneName: 'shortOffset'
})

function parseDateParts(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

function formatDateParts(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(value: string, days: number) {
  const parts = parseDateParts(value)

  if (!parts) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Week start is invalid'
    })
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  date.setUTCDate(date.getUTCDate() + days)

  return formatDateParts(date)
}

function getLeagueOffsetMinutes(date: Date) {
  const timeZonePart = timeZoneOffsetFormatter
    .formatToParts(date)
    .find(part => part.type === 'timeZoneName')?.value

  if (!timeZonePart || timeZonePart === 'GMT') return 0

  const match = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(timeZonePart)

  if (!match) return 0

  const sign = match[1] === '-' ? -1 : 1
  const hours = Number(match[2])
  const minutes = Number(match[3] ?? '0')

  return sign * (hours * 60 + minutes)
}

function zonedDateTimeToUtc(parts: DateParts & { hour: number, minute: number }) {
  const utcValue = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  const offsetMinutes = getLeagueOffsetMinutes(new Date(utcValue))

  return new Date(utcValue - offsetMinutes * 60_000)
}

export function formatLeagueDate(value: Date) {
  const parts = Object.fromEntries(
    leagueDateFormatter.formatToParts(value).map(part => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

export function getDefaultWeekStart() {
  return normalizeWeekStart(formatLeagueDate(new Date()))
}

export function normalizeWeekStart(value?: unknown) {
  const dateValue = Array.isArray(value) ? value[0] : value
  const rawValue = typeof dateValue === 'string' && dateValue.trim()
    ? dateValue.trim()
    : formatLeagueDate(new Date())
  const parts = parseDateParts(rawValue)

  if (!parts) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Week start is invalid'
    })
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - daysSinceMonday)

  return formatDateParts(date)
}

export function getWeekRange(weekStartValue?: unknown) {
  const weekStart = normalizeWeekStart(weekStartValue)
  const weekEnd = addDays(weekStart, 7)
  const startParts = parseDateParts(weekStart)
  const endParts = parseDateParts(weekEnd)

  if (!startParts || !endParts) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Week range is invalid'
    })
  }

  return {
    weekStart,
    weekEnd,
    startsAt: zonedDateTimeToUtc({ ...startParts, hour: 0, minute: 0 }),
    endsAt: zonedDateTimeToUtc({ ...endParts, hour: 0, minute: 0 })
  }
}

export function addLeagueDays(value: string, days: number) {
  return addDays(value, days)
}

export function createLeagueDateTime(dateValue: string, hour: number, minute = 0) {
  const parts = parseDateParts(dateValue)

  if (!parts || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Schedule slot is invalid'
    })
  }

  return zonedDateTimeToUtc({ ...parts, hour, minute })
}

export function cleanScheduleDateTime(value: unknown, field = 'Scheduled date') {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is required`
    })
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim())

  if (!match) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is invalid`
    })
  }

  const parts = parseDateParts(`${match[1]}-${match[2]}-${match[3]}`)
  const hour = Number(match[4])
  const minute = Number(match[5])

  if (!parts || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is invalid`
    })
  }

  return zonedDateTimeToUtc({ ...parts, hour, minute })
}

export function cleanScheduleRound(value: unknown, fallback?: number | null) {
  const round = cleanNumber(value, { min: 1, max: 999, field: 'Rol' }) ?? fallback

  if (!round) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rol number is required'
    })
  }

  return round
}

export function cleanScheduleStatus(value: unknown, fallback: GameStatusValue = GameStatus.SCHEDULED) {
  return cleanEnum(GameStatus, value, 'Status') ?? fallback
}

export function cleanFieldId(value: unknown, fallback?: string | null) {
  if (value === undefined) return fallback ?? null

  return cleanOptionalText(value, 80)
}

export function cleanScheduleNotes(value: unknown, fallback?: string | null) {
  if (value === undefined) return fallback ?? null

  return cleanOptionalText(value, 300)
}

export function cleanTeamId(value: unknown, field: string, fallback?: string) {
  if (value === undefined && fallback) return fallback

  return cleanRequiredText(value, field, 80)
}

export function assertScheduledInsideWeek(scheduledAt: Date, startsAt: Date, endsAt: Date) {
  if (scheduledAt < startsAt || scheduledAt >= endsAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'The game must be scheduled inside the selected week'
    })
  }
}

export async function getActiveSeasonForSchedule(prisma: Prisma.TransactionClient) {
  const season = await prisma.season.findFirst({
    where: { status: SeasonStatus.ACTIVE },
    orderBy: [
      { startsAt: 'desc' },
      { year: 'desc' }
    ],
    select: {
      id: true,
      name: true,
      year: true,
      startsAt: true,
      endsAt: true
    }
  })

  if (!season) {
    throw createError({
      statusCode: 409,
      statusMessage: 'An active season is required before scheduling games'
    })
  }

  return season
}

export function getSuggestedRound(games: { round: number | null }[], latestRound?: number | null) {
  const weekRound = games.reduce((highestRound, game) => Math.max(highestRound, game.round ?? 0), 0)

  if (weekRound > 0) return weekRound

  return (latestRound ?? 0) + 1
}

export async function getScheduleTeams(prisma: Prisma.TransactionClient, seasonId: string) {
  return prisma.team.findMany({
    where: {
      status: TeamStatus.ACTIVE,
      seasons: {
        some: { seasonId }
      }
    },
    orderBy: [
      { category: 'asc' },
      { branch: 'asc' },
      { name: 'asc' }
    ],
    select: scheduleTeamSelect
  })
}

export async function assertFieldAvailable(prisma: Prisma.TransactionClient, fieldId: string | null) {
  if (!fieldId) return

  const field = await prisma.field.findFirst({
    where: {
      id: fieldId,
      isActive: true
    },
    select: { id: true }
  })

  if (!field) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Selected field is invalid or inactive'
    })
  }
}

export async function getScheduleTeamPair(
  prisma: Prisma.TransactionClient,
  seasonId: string,
  homeTeamId: string,
  awayTeamId: string
) {
  if (homeTeamId === awayTeamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Home and away teams must be different'
    })
  }

  const teams = await prisma.team.findMany({
    where: {
      id: { in: [homeTeamId, awayTeamId] },
      status: TeamStatus.ACTIVE,
      seasons: {
        some: { seasonId }
      }
    },
    select: scheduleTeamSelect
  })
  const homeTeam = teams.find(team => team.id === homeTeamId)
  const awayTeam = teams.find(team => team.id === awayTeamId)

  if (!homeTeam || !awayTeam) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Both teams must be active and assigned to the active season'
    })
  }

  if (homeTeam.category !== awayTeam.category || homeTeam.branch !== awayTeam.branch) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Teams must belong to the same category and branch'
    })
  }

  return {
    homeTeam,
    awayTeam,
    category: homeTeam.category,
    branch: homeTeam.branch
  }
}

export async function assertScheduleConflicts(input: {
  prisma: Prisma.TransactionClient
  scheduledAt: Date
  fieldId: string | null
  homeTeamId: string
  awayTeamId: string
  excludedGameId?: string
}) {
  const excludedFilter = input.excludedGameId ? { id: { not: input.excludedGameId } } : {}
  const teamConflict = await input.prisma.game.findFirst({
    where: {
      ...excludedFilter,
      scheduledAt: input.scheduledAt,
      status: { not: GameStatus.CANCELLED },
      OR: [
        { homeTeamId: { in: [input.homeTeamId, input.awayTeamId] } },
        { awayTeamId: { in: [input.homeTeamId, input.awayTeamId] } }
      ]
    },
    select: { id: true }
  })

  if (teamConflict) {
    throw createError({
      statusCode: 409,
      statusMessage: 'One of the selected teams already has a game at that time'
    })
  }

  if (!input.fieldId) return

  const fieldConflict = await input.prisma.game.findFirst({
    where: {
      ...excludedFilter,
      fieldId: input.fieldId,
      scheduledAt: input.scheduledAt,
      status: { not: GameStatus.CANCELLED }
    },
    select: { id: true }
  })

  if (fieldConflict) {
    throw createError({
      statusCode: 409,
      statusMessage: 'The selected field already has a game at that time'
    })
  }
}

export async function getConfiguredRounds(
  prisma: Prisma.TransactionClient,
  seasonId: string,
  category: TeamCategoryValue,
  branch: TeamBranchValue
) {
  const config = await prisma.scheduleRoundConfig.findUnique({
    where: {
      seasonId_category_branch: {
        seasonId,
        category,
        branch
      }
    },
    select: {
      rounds: true
    }
  })

  return config?.rounds ?? 1
}

export async function getPairGameCount(input: {
  prisma: Prisma.TransactionClient
  seasonId: string
  homeTeamId: string
  awayTeamId: string
  excludedGameId?: string
}) {
  return input.prisma.game.count({
    where: {
      seasonId: input.seasonId,
      ...(input.excludedGameId ? { id: { not: input.excludedGameId } } : {}),
      status: { not: GameStatus.CANCELLED },
      OR: [
        {
          homeTeamId: input.homeTeamId,
          awayTeamId: input.awayTeamId
        },
        {
          homeTeamId: input.awayTeamId,
          awayTeamId: input.homeTeamId
        }
      ]
    }
  })
}

export async function assertPairRoundLimit(input: {
  prisma: Prisma.TransactionClient
  seasonId: string
  homeTeamId: string
  awayTeamId: string
  category: TeamCategoryValue
  branch: TeamBranchValue
  status: GameStatusValue
  excludedGameId?: string
}) {
  if (input.status === GameStatus.CANCELLED) return

  const [configuredRounds, existingPairGames] = await Promise.all([
    getConfiguredRounds(input.prisma, input.seasonId, input.category, input.branch),
    getPairGameCount(input)
  ])

  if (existingPairGames >= configuredRounds) {
    throw createError({
      statusCode: 409,
      statusMessage: `This matchup already reached the configured limit of ${configuredRounds} role(s)`
    })
  }
}

export async function getMaxPairGamesForGroup(input: {
  prisma: Prisma.TransactionClient
  seasonId: string
  category: TeamCategoryValue
  branch: TeamBranchValue
}) {
  const games = await input.prisma.game.findMany({
    where: {
      seasonId: input.seasonId,
      status: { not: GameStatus.CANCELLED },
      homeTeam: {
        is: {
          category: input.category,
          branch: input.branch
        }
      },
      awayTeam: {
        is: {
          category: input.category,
          branch: input.branch
        }
      }
    },
    select: {
      homeTeamId: true,
      awayTeamId: true
    }
  })
  const pairCounts = new Map<string, number>()

  for (const game of games) {
    const pairKey = [game.homeTeamId, game.awayTeamId].sort().join(':')

    pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1)
  }

  return Math.max(0, ...pairCounts.values())
}

export async function getScheduleConfigs(prisma: Prisma.TransactionClient, seasonId: string) {
  const [storedConfigs, teams] = await Promise.all([
    prisma.scheduleRoundConfig.findMany({
      where: { seasonId },
      select: {
        id: true,
        category: true,
        branch: true,
        rounds: true
      }
    }),
    prisma.team.findMany({
      where: {
        status: TeamStatus.ACTIVE,
        seasons: {
          some: { seasonId }
        }
      },
      select: {
        category: true,
        branch: true
      }
    })
  ])
  const storedConfigByGroup = new Map(storedConfigs.map(config => [`${config.category}:${config.branch}`, config]))
  const teamCountByGroup = new Map<string, number>()

  for (const team of teams) {
    const key = `${team.category}:${team.branch}`
    teamCountByGroup.set(key, (teamCountByGroup.get(key) ?? 0) + 1)
  }

  return scheduleCategories.flatMap(category =>
    scheduleBranches.map((branch) => {
      const key = `${category}:${branch}`
      const config = storedConfigByGroup.get(key)

      return {
        id: config?.id ?? null,
        category,
        branch,
        rounds: config?.rounds ?? 1,
        teamCount: teamCountByGroup.get(key) ?? 0
      }
    })
  )
}

export function cleanScheduleConfigRows(value: unknown) {
  if (!Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Configuration must be a list'
    })
  }

  return value.map((item) => {
    const row = typeof item === 'object' && item ? item as Record<string, unknown> : {}
    const category = cleanEnum(TeamCategory, row.category, 'Category')
    const branch = cleanEnum(TeamBranch, row.branch, 'Branch')
    const rounds = cleanNumber(row.rounds, { min: 1, max: maxConfiguredRounds, field: 'Rounds' })

    if (!category || !branch || !rounds) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Each configuration needs category, branch and rounds'
      })
    }

    return {
      category,
      branch,
      rounds
    }
  })
}
