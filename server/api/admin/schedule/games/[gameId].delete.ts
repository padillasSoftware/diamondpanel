import { prisma } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/session'
import { getActiveSeasonForSchedule } from '../../../../utils/schedule'

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
    const season = await getActiveSeasonForSchedule(tx)
    const current = await tx.game.findFirst({
      where: {
        id: gameId,
        seasonId: season.id
      },
      select: {
        id: true,
        result: {
          select: {
            id: true
          }
        }
      }
    })

    if (!current) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Game not found'
      })
    }

    if (current.result) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cannot delete a game that already has a result'
      })
    }

    await tx.game.delete({
      where: { id: current.id }
    })

    return {
      success: true
    }
  })
})
