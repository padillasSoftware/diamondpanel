import { GameStatus } from '../../../generated/prisma/enums'
import { getActiveCategories } from '../../../utils/categories'
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

  const activeCategories = await getActiveCategories(prisma)
  const games = await prisma.game.findMany({
    where: {
      seasonId: season.id,
      homeTeam: {
        is: {
          category: { in: activeCategories }
        }
      },
      awayTeam: {
        is: {
          category: { in: activeCategories }
        }
      },
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
