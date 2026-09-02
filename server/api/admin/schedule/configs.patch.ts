import { prisma } from '../../../utils/db'
import { getActiveCategories } from '../../../utils/categories'
import { requireAdmin } from '../../../utils/session'
import {
  cleanScheduleConfigRows,
  getActiveSeasonForSchedule,
  getMaxPairGamesForGroup
} from '../../../utils/schedule'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const rows = cleanScheduleConfigRows(body.configs)

  return prisma.$transaction(async (tx) => {
    const season = await getActiveSeasonForSchedule(tx)
    const activeCategorySet = new Set(await getActiveCategories(tx))

    for (const row of rows) {
      if (!activeCategorySet.has(row.category)) {
        throw createError({
          statusCode: 409,
          statusMessage: `La categoría ${row.category} está desactivada. Actívala en Ajustes para usarla.`
        })
      }

      const currentMaxPairGames = await getMaxPairGamesForGroup({
        prisma: tx,
        seasonId: season.id,
        category: row.category,
        branch: row.branch
      })

      if (row.rounds < currentMaxPairGames) {
        throw createError({
          statusCode: 409,
          statusMessage: `Cannot set ${row.category} ${row.branch} below ${currentMaxPairGames}; there are already matchups scheduled that many times`
        })
      }

      await tx.scheduleRoundConfig.upsert({
        where: {
          seasonId_category_branch: {
            seasonId: season.id,
            category: row.category,
            branch: row.branch
          }
        },
        update: {
          rounds: row.rounds
        },
        create: {
          seasonId: season.id,
          category: row.category,
          branch: row.branch,
          rounds: row.rounds
        }
      })
    }

    return {
      success: true
    }
  })
})
