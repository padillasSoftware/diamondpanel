import { GameStatus } from '../../../generated/prisma/enums'
import { prisma } from '../../../utils/db'
import { adminResultGameSelect, getActiveSeasonForResults } from '../../../utils/results'
import { requireAdmin } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const season = await getActiveSeasonForResults(prisma)

  if (!season) {
    return {
      season: null,
      games: []
    }
  }

  const games = await prisma.game.findMany({
    where: {
      seasonId: season.id,
      status: {
        not: GameStatus.CANCELLED
      }
    },
    orderBy: [
      { scheduledAt: 'desc' },
      { round: 'desc' }
    ],
    select: adminResultGameSelect
  })

  return {
    season,
    games
  }
})
