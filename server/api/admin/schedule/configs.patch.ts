import { prisma } from '../../../utils/db'
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

    for (const row of rows) {
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
