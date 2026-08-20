import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const seasonId = getRouterParam(event, 'seasonId')

  if (!seasonId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Season id is required'
    })
  }

  const gamesCount = await prisma.game.count({ where: { seasonId } })

  if (gamesCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Cannot delete a season that already has games scheduled'
    })
  }

  await prisma.season.delete({ where: { id: seasonId } })

  return { success: true }
})
