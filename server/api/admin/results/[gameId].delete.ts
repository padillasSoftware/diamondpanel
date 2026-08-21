import { GameStatus } from '../../../generated/prisma/enums'
import { prisma } from '../../../utils/db'
import { adminResultGameSelect, getActiveSeasonForResults } from '../../../utils/results'
import { requireAdmin } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const gameId = getRouterParam(event, 'gameId')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game id is required'
    })
  }

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
        id: true
      }
    })

    if (!game) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Game not found'
      })
    }

    await tx.gameResult.deleteMany({
      where: {
        gameId: game.id
      }
    })

    await tx.game.update({
      where: {
        id: game.id
      },
      data: {
        status: GameStatus.SCHEDULED
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
