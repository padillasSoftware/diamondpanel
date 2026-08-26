import { PlayerStatus, TeamMemberRole } from '../../../../generated/prisma/enums'
import { prisma } from '../../../../utils/db'
import {
  adminResultGameSelect,
  buildLineupPayload,
  getActiveSeasonForResults
} from '../../../../utils/results'
import { requireAdmin } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const gameId = getRouterParam(event, 'gameId')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game id is required'
    })
  }

  const body = await readBody<Record<string, unknown>>(event)

  return prisma.$transaction(async (tx) => {
    const season = await getActiveSeasonForResults(tx)

    if (!season) {
      throw createError({
        statusCode: 409,
        statusMessage: 'An active season is required'
      })
    }

    const game = await tx.game.findFirst({
      where: {
        id: gameId,
        seasonId: season.id
      },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        lineupEntries: {
          select: {
            id: true
          }
        }
      }
    })

    if (!game) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Game not found'
      })
    }

    assertOfflineLineupHasNotChanged(body, game.lineupEntries.map(entry => entry.id))

    const lineup = buildLineupPayload(body, game)
    const playerIds = [...new Set(lineup.map(entry => entry.playerId))]

    if (playerIds.length) {
      const validPlayers = await tx.player.findMany({
        where: {
          id: { in: playerIds },
          status: PlayerStatus.ACTIVE,
          memberRole: TeamMemberRole.PLAYER,
          OR: [
            { teamId: game.homeTeamId },
            { teamId: game.awayTeamId }
          ]
        },
        select: {
          id: true,
          teamId: true
        }
      })
      const validPlayerTeam = new Map(validPlayers.map(player => [player.id, player.teamId]))

      for (const entry of lineup) {
        if (validPlayerTeam.get(entry.playerId) !== entry.teamId) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Lineup players must belong to the selected game teams'
          })
        }
      }
    }

    await tx.gameLineupEntry.deleteMany({
      where: {
        gameId: game.id,
        teamId: {
          in: [game.homeTeamId, game.awayTeamId]
        }
      }
    })

    if (lineup.length) {
      await tx.gameLineupEntry.createMany({
        data: lineup.map(entry => ({
          gameId: game.id,
          teamId: entry.teamId,
          playerId: entry.playerId,
          battingOrder: entry.battingOrder
        }))
      })
    }

    return tx.game.findUniqueOrThrow({
      where: {
        id: game.id
      },
      select: adminResultGameSelect
    })
  })
})

function assertOfflineLineupHasNotChanged(body: Record<string, unknown>, currentEntryIds: string[]) {
  const expectedEntryIds = readOfflineExpectedLineupEntryIds(body.offlineExpectedLineupEntryIds)

  if (!expectedEntryIds) return

  const expectedKey = [...expectedEntryIds].sort().join('|')
  const currentKey = [...currentEntryIds].sort().join('|')

  if (expectedKey !== currentKey) {
    throw createError({
      statusCode: 409,
      statusMessage: 'El lineup fue modificado en otro dispositivo. Revisa el partido antes de sincronizar.'
    })
  }
}

function readOfflineExpectedLineupEntryIds(value: unknown) {
  if (value === undefined) return null
  if (!Array.isArray(value)) return null

  return value.filter((item): item is string => typeof item === 'string')
}
