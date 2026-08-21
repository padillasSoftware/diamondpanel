import { GameBattingHighlightSide, GameStatus, PlayerStatus, SeasonStatus, TeamMemberRole } from '../generated/prisma/enums'
import type { Prisma } from '../generated/prisma/client'
import { cleanNumber, cleanOptionalText, cleanRequiredText } from './validation'

const maxHighlightsPerSide = 3

export const resultPlayerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  number: true,
  position: true,
  status: true,
  memberRole: true,
  teamId: true
} as const

export const adminResultGameSelect = {
  id: true,
  round: true,
  scheduledAt: true,
  status: true,
  notes: true,
  field: {
    select: {
      id: true,
      name: true
    }
  },
  homeTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      category: true,
      branch: true,
      players: {
        where: {
          status: PlayerStatus.ACTIVE,
          memberRole: TeamMemberRole.PLAYER
        },
        orderBy: [
          { number: 'asc' },
          { firstName: 'asc' },
          { lastName: 'asc' }
        ],
        select: resultPlayerSelect
      }
    }
  },
  awayTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      category: true,
      branch: true,
      players: {
        where: {
          status: PlayerStatus.ACTIVE,
          memberRole: TeamMemberRole.PLAYER
        },
        orderBy: [
          { number: 'asc' },
          { firstName: 'asc' },
          { lastName: 'asc' }
        ],
        select: resultPlayerSelect
      }
    }
  },
  result: {
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      innings: true,
      isForfeit: true,
      recordedAt: true,
      notes: true,
      winningPitcherId: true,
      losingPitcherId: true,
      winningPitcherName: true,
      losingPitcherName: true,
      winningPitcher: {
        select: resultPlayerSelect
      },
      losingPitcher: {
        select: resultPlayerSelect
      },
      battingHighlights: {
        orderBy: [
          { side: 'asc' },
          { order: 'asc' }
        ],
        select: {
          id: true,
          side: true,
          order: true,
          atBats: true,
          hits: true,
          homeRuns: true,
          teamId: true,
          playerId: true,
          playerName: true,
          player: {
            select: resultPlayerSelect
          }
        }
      }
    }
  }
} satisfies Prisma.GameSelect

type ResultGameForValidation = {
  id: string
  status: (typeof GameStatus)[keyof typeof GameStatus]
  homeTeamId: string
  awayTeamId: string
}

type HighlightInput = {
  side: (typeof GameBattingHighlightSide)[keyof typeof GameBattingHighlightSide]
  order: number
  teamId: string
  playerId: string | null
  playerName: string
  atBats: number
  hits: number
  homeRuns: number
}

function cleanScore(value: unknown, field: string) {
  const score = cleanNumber(value, { min: 0, max: 999, field })

  if (score === null) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is required`
    })
  }

  return score
}

function readHighlightRows(body: Record<string, unknown>, key: 'winnerHighlights' | 'loserHighlights') {
  const value = body[key]

  if (value === undefined || value === null) return []

  if (!Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Batting highlights must be a list'
    })
  }

  if (value.length > maxHighlightsPerSide) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only 3 batting highlights are allowed per team'
    })
  }

  return value
}

function cleanHighlightRows(input: {
  rows: unknown[]
  side: (typeof GameBattingHighlightSide)[keyof typeof GameBattingHighlightSide]
  teamId: string
}) {
  const rows: HighlightInput[] = []
  const seenPlayerNames = new Set<string>()

  input.rows.forEach((item, index) => {
    const row = typeof item === 'object' && item ? item as Record<string, unknown> : {}
    const playerName = cleanOptionalText(row.playerName, 80)

    if (!playerName) return

    const normalizedName = playerName.toLowerCase()
    if (seenPlayerNames.has(normalizedName)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'A batting highlight name cannot be repeated'
      })
    }

    const atBats = cleanNumber(row.atBats, { min: 0, max: 20, field: 'At bats' }) ?? 0
    const hits = cleanNumber(row.hits, { min: 0, max: 20, field: 'Hits' }) ?? 0
    const homeRuns = cleanNumber(row.homeRuns, { min: 0, max: 20, field: 'Home runs' }) ?? 0

    if (hits > atBats) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Hits cannot be greater than at bats'
      })
    }

    if (homeRuns > hits) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Home runs cannot be greater than hits'
      })
    }

    seenPlayerNames.add(normalizedName)
    rows.push({
      side: input.side,
      order: index + 1,
      teamId: input.teamId,
      playerId: null,
      playerName,
      atBats,
      hits,
      homeRuns
    })
  })

  return rows
}

export async function getActiveSeasonForResults(prisma: Prisma.TransactionClient) {
  return prisma.season.findFirst({
    where: { status: SeasonStatus.ACTIVE },
    orderBy: [
      { startsAt: 'desc' },
      { year: 'desc' }
    ],
    select: {
      id: true,
      name: true,
      year: true
    }
  })
}

export function buildResultPayload(body: Record<string, unknown>, game: ResultGameForValidation) {
  if (game.status === GameStatus.CANCELLED) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Cannot capture a result for a cancelled game'
    })
  }

  const homeScore = cleanScore(body.homeScore, 'Home score')
  const awayScore = cleanScore(body.awayScore, 'Away score')
  const isForfeit = Boolean(body.isForfeit)

  if (homeScore === awayScore) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Winner and loser are required, so tied scores are not allowed here'
    })
  }

  const innings = cleanNumber(body.innings, { min: 1, max: 20, field: 'Innings' })
  const winnerTeamId = homeScore > awayScore ? game.homeTeamId : game.awayTeamId
  const loserTeamId = homeScore > awayScore ? game.awayTeamId : game.homeTeamId

  if (isForfeit) {
    const hasDefaultScore = (homeScore === 7 && awayScore === 0) || (awayScore === 7 && homeScore === 0)

    if (!hasDefaultScore) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Default results must be saved as 7-0 for the winning team'
      })
    }

    return {
      result: {
        homeScore,
        awayScore,
        innings,
        isForfeit,
        winningPitcherId: null,
        losingPitcherId: null,
        winningPitcherName: null,
        losingPitcherName: null,
        notes: cleanOptionalText(body.notes, 300)
      },
      highlights: []
    }
  }

  const winningPitcherName = cleanRequiredText(body.winningPitcherName, 'Winning pitcher', 80)
  const losingPitcherName = cleanRequiredText(body.losingPitcherName, 'Losing pitcher', 80)

  const highlights = [
    ...cleanHighlightRows({
      rows: readHighlightRows(body, 'winnerHighlights'),
      side: GameBattingHighlightSide.WINNER,
      teamId: winnerTeamId
    }),
    ...cleanHighlightRows({
      rows: readHighlightRows(body, 'loserHighlights'),
      side: GameBattingHighlightSide.LOSER,
      teamId: loserTeamId
    })
  ]

  return {
    result: {
      homeScore,
      awayScore,
      innings,
      isForfeit,
      winningPitcherId: null,
      losingPitcherId: null,
      winningPitcherName,
      losingPitcherName,
      notes: cleanOptionalText(body.notes, 300)
    },
    highlights
  }
}
