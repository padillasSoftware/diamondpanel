import { prisma } from '../utils/db'
import { GameStatus, PlayerStatus, SeasonStatus, TeamBranch, TeamCategory, TeamMemberRole } from '../generated/prisma/enums'

type TeamBranchValue = (typeof TeamBranch)[keyof typeof TeamBranch]
type TeamCategoryValue = (typeof TeamCategory)[keyof typeof TeamCategory]

type TeamStanding = {
  team: {
    id: string
    name: string
    shortName: string | null
    slug: string
    logoUrl: string | null
    primaryColor: string | null
    secondaryColor: string | null
    category: TeamCategoryValue
    branch: TeamBranchValue
  }
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

export async function getActiveSeason() {
  const activeSeason = await prisma.season.findFirst({
    where: { status: SeasonStatus.ACTIVE },
    orderBy: [
      { startsAt: 'desc' },
      { year: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  if (activeSeason) return activeSeason

  return prisma.season.findFirst({
    orderBy: [
      { year: 'desc' },
      { createdAt: 'desc' }
    ]
  })
}

export async function getActiveSeasonOrThrow() {
  const season = await getActiveSeason()

  if (!season) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No seasons found'
    })
  }

  return season
}

export async function getTeamsForSeason(options: { seasonId?: string, category?: string, branch?: string } = {}) {
  const season = options.seasonId ? { id: options.seasonId } : await getActiveSeasonOrThrow()
  const category = getCategoryFilter(options.category)
  const branch = getBranchFilter(options.branch)

  return prisma.team.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(branch ? { branch } : {}),
      seasons: {
        some: {
          seasonId: season.id
        }
      }
    },
    orderBy: [
      { category: 'asc' },
      { branch: 'asc' },
      { name: 'asc' }
    ],
    select: {
      id: true,
      name: true,
      shortName: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      managerName: true,
      category: true,
      branch: true,
      status: true,
      players: {
        where: {
          status: PlayerStatus.ACTIVE,
          memberRole: TeamMemberRole.PLAYER
        },
        orderBy: [
          { number: 'asc' },
          { lastName: 'asc' }
        ],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          number: true,
          memberRole: true,
          position: true,
          bats: true,
          throws: true,
          status: true
        }
      }
    }
  })
}

export async function getTeamBySlug(slug: string) {
  return prisma.team.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      shortName: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      managerName: true,
      category: true,
      branch: true,
      status: true,
      seasons: {
        select: {
          season: {
            select: {
              id: true,
              name: true,
              year: true,
              status: true
            }
          }
        }
      },
      players: {
        where: {
          status: PlayerStatus.ACTIVE,
          memberRole: TeamMemberRole.PLAYER
        },
        orderBy: [
          { number: 'asc' },
          { lastName: 'asc' }
        ],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          number: true,
          memberRole: true,
          position: true,
          bats: true,
          throws: true,
          status: true
        }
      }
    }
  })
}

export async function getUpcomingGames(options: { seasonId?: string, category?: string, branch?: string, limit?: number } = {}) {
  const season = options.seasonId ? { id: options.seasonId } : await getActiveSeasonOrThrow()
  const category = getCategoryFilter(options.category)
  const branch = getBranchFilter(options.branch)
  const teamRelationFilter = getTeamRelationFilter(category, branch)
  const limit = options.limit ?? 10

  return prisma.game.findMany({
    where: {
      seasonId: season.id,
      ...(teamRelationFilter
        ? {
            homeTeam: { is: teamRelationFilter },
            awayTeam: { is: teamRelationFilter }
          }
        : {}),
      status: {
        in: [GameStatus.SCHEDULED, GameStatus.POSTPONED]
      }
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
    select: {
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
        select: teamSummarySelect
      },
      awayTeam: {
        select: teamSummarySelect
      }
    }
  })
}

export async function getRecentResults(options: { seasonId?: string, category?: string, branch?: string, limit?: number } = {}) {
  const season = options.seasonId ? { id: options.seasonId } : await getActiveSeasonOrThrow()
  const category = getCategoryFilter(options.category)
  const branch = getBranchFilter(options.branch)
  const teamRelationFilter = getTeamRelationFilter(category, branch)
  const limit = options.limit ?? 10

  return prisma.game.findMany({
    where: {
      seasonId: season.id,
      status: GameStatus.FINAL,
      ...(teamRelationFilter
        ? {
            homeTeam: { is: teamRelationFilter },
            awayTeam: { is: teamRelationFilter }
          }
        : {}),
      result: {
        isNot: null
      }
    },
    orderBy: { scheduledAt: 'desc' },
    take: limit,
    select: {
      id: true,
      round: true,
      scheduledAt: true,
      status: true,
      field: {
        select: {
          id: true,
          name: true
        }
      },
      homeTeam: {
        select: teamSummarySelect
      },
      awayTeam: {
        select: teamSummarySelect
      },
      result: {
        select: {
          id: true,
          homeScore: true,
          awayScore: true,
          innings: true,
          isForfeit: true,
          recordedAt: true
        }
      }
    }
  })
}

export async function getStandings(options: { seasonId?: string, category?: string, branch?: string } = {}) {
  const season = options.seasonId ? { id: options.seasonId } : await getActiveSeasonOrThrow()
  const category = getCategoryFilter(options.category)
  const branch = getBranchFilter(options.branch)
  const teamRelationFilter = getTeamRelationFilter(category, branch)
  const teams = await getTeamsForSeason({ seasonId: season.id, category, branch })
  const finalGames = await prisma.game.findMany({
    where: {
      seasonId: season.id,
      status: GameStatus.FINAL,
      ...(teamRelationFilter
        ? {
            homeTeam: { is: teamRelationFilter },
            awayTeam: { is: teamRelationFilter }
          }
        : {}),
      result: {
        isNot: null
      }
    },
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      scheduledAt: true,
      homeTeamId: true,
      awayTeamId: true,
      result: {
        select: {
          homeScore: true,
          awayScore: true
        }
      }
    }
  })

  const standings = new Map<string, TeamStanding>()
  const streaks = new Map<string, string[]>()

  for (const team of teams) {
    standings.set(team.id, {
      team: {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        slug: team.slug,
        logoUrl: team.logoUrl,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        category: team.category,
        branch: team.branch
      },
      played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      runsFor: 0,
      runsAgainst: 0,
      runDifferential: 0,
      winPercentage: 0,
      winPercentageText: '.000',
      streak: '-'
    })
    streaks.set(team.id, [])
  }

  for (const game of finalGames) {
    if (!game.result) continue

    applyGameResult({
      standings,
      streaks,
      teamId: game.homeTeamId,
      runsFor: game.result.homeScore,
      runsAgainst: game.result.awayScore
    })

    applyGameResult({
      standings,
      streaks,
      teamId: game.awayTeamId,
      runsFor: game.result.awayScore,
      runsAgainst: game.result.homeScore
    })
  }

  return [...standings.values()]
    .map((standing) => {
      const winPercentage = standing.played
        ? (standing.wins + standing.ties * 0.5) / standing.played
        : 0

      return {
        ...standing,
        runDifferential: standing.runsFor - standing.runsAgainst,
        winPercentage,
        winPercentageText: formatWinPercentage(winPercentage),
        streak: formatStreak(streaks.get(standing.team.id) ?? [])
      }
    })
    .sort(compareStandings)
    .map((standing, index) => ({
      rank: index + 1,
      ...standing
    }))
}

const teamSummarySelect = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  logoUrl: true,
  primaryColor: true,
  secondaryColor: true,
  category: true,
  branch: true
} as const

function getCategoryFilter(category?: string) {
  const normalized = category?.trim().toUpperCase()

  if (
    normalized === TeamCategory.A
    || normalized === TeamCategory.B
    || normalized === TeamCategory.C
    || normalized === TeamCategory.D
    || normalized === TeamCategory.E
    || normalized === TeamCategory.R
  ) {
    return normalized as TeamCategoryValue
  }

  return undefined
}

function getBranchFilter(branch?: string) {
  const normalized = branch?.trim().toUpperCase()

  if (normalized === TeamBranch.VARONIL || normalized === TeamBranch.FEMENIL) {
    return normalized as TeamBranchValue
  }

  return undefined
}

function getTeamRelationFilter(category?: TeamCategoryValue, branch?: TeamBranchValue) {
  if (!category && !branch) return undefined

  return {
    ...(category ? { category } : {}),
    ...(branch ? { branch } : {})
  }
}

function applyGameResult(input: {
  standings: Map<string, TeamStanding>
  streaks: Map<string, string[]>
  teamId: string
  runsFor: number
  runsAgainst: number
}) {
  const standing = input.standings.get(input.teamId)
  if (!standing) return

  standing.played += 1
  standing.runsFor += input.runsFor
  standing.runsAgainst += input.runsAgainst

  if (input.runsFor > input.runsAgainst) {
    standing.wins += 1
    input.streaks.get(input.teamId)?.push('W')
  } else if (input.runsFor < input.runsAgainst) {
    standing.losses += 1
    input.streaks.get(input.teamId)?.push('L')
  } else {
    standing.ties += 1
    input.streaks.get(input.teamId)?.push('T')
  }
}

function formatWinPercentage(value: number) {
  if (value >= 1) return '1.000'

  return `.${Math.round(value * 1000).toString().padStart(3, '0')}`
}

function formatStreak(results: string[]) {
  const latest = results.at(-1)

  if (!latest) return '-'

  let count = 0

  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (results[index] !== latest) break
    count += 1
  }

  return `${latest}${count}`
}

function compareStandings(a: TeamStanding, b: TeamStanding) {
  return b.winPercentage - a.winPercentage
    || b.wins - a.wins
    || b.runDifferential - a.runDifferential
    || b.runsFor - a.runsFor
    || a.team.name.localeCompare(b.team.name)
}
