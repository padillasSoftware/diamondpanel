import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team id is required'
    })
  }

  const [playersCount, homeGamesCount, awayGamesCount] = await Promise.all([
    prisma.player.count({ where: { teamId } }),
    prisma.game.count({ where: { homeTeamId: teamId } }),
    prisma.game.count({ where: { awayTeamId: teamId } })
  ])

  if (playersCount || homeGamesCount || awayGamesCount) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Cannot delete a team that already has members or games. Mark it inactive instead.'
    })
  }

  await prisma.team.delete({ where: { id: teamId } })

  return { success: true }
})
