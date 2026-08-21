import { GameStatus } from '../../../generated/prisma/enums'
import { prisma } from '../../../utils/db'
import {
  adminResultGameSelect,
  buildResultPayload,
  getActiveSeasonForResults
} from '../../../utils/results'
import { requireAdmin } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
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
        status: true,
        homeTeamId: true,
        awayTeamId: true
      }
    })

    if (!game) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Game not found'
      })
    }

    const payload = buildResultPayload(body, game)
    const result = await tx.gameResult.upsert({
      where: {
        gameId: game.id
      },
      update: {
        ...payload.result,
        recordedById: user.id,
        recordedAt: new Date()
      },
      create: {
        gameId: game.id,
        ...payload.result,
        recordedById: user.id
      },
      select: {
        id: true
      }
    })

    await tx.gameBattingHighlight.deleteMany({
      where: {
        gameResultId: result.id
      }
    })

    if (payload.highlights.length) {
      await tx.gameBattingHighlight.createMany({
        data: payload.highlights.map(highlight => ({
          gameResultId: result.id,
          teamId: highlight.teamId,
          playerId: highlight.playerId,
          playerName: highlight.playerName,
          side: highlight.side,
          order: highlight.order,
          atBats: highlight.atBats,
          hits: highlight.hits,
          homeRuns: highlight.homeRuns
        }))
      })
    }

    await tx.game.update({
      where: {
        id: game.id
      },
      data: {
        status: GameStatus.FINAL
      }
    })

    return tx.game.findUniqueOrThrow({
      where: {
        id: game.id
      },
      select: adminResultGameSelect
    })
  })
})
