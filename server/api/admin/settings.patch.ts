import { PlayoffEligibilityMode } from '../../generated/prisma/enums'
import { prisma } from '../../utils/db'
import {
  cleanScheduleConfigRows,
  getActiveSeasonForSchedule,
  getMaxPairGamesForGroup
} from '../../utils/schedule'
import { requireAdmin } from '../../utils/session'
import { cleanNumber } from '../../utils/validation'

function cleanPlayoffEligibilityMode(value: unknown) {
  const mode = typeof value === 'string' ? value.trim().toUpperCase() : ''

  if (mode === PlayoffEligibilityMode.LINEUP_GAMES || mode === PlayoffEligibilityMode.OPEN_ROSTER) {
    return mode
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid playoff eligibility mode'
  })
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const playoffEligibilityMode = cleanPlayoffEligibilityMode(body.playoffEligibilityMode)
  const playoffMinimumLineupGames = cleanNumber(body.playoffMinimumLineupGames, {
    min: 1,
    max: 99,
    field: 'Minimum lineup games'
  })
  const rows = cleanScheduleConfigRows(body.configs)

  if (!playoffMinimumLineupGames) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Minimum lineup games is required'
    })
  }

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
    }

    await tx.season.update({
      where: { id: season.id },
      data: {
        playoffEligibilityMode,
        playoffMinimumLineupGames
      }
    })

    for (const row of rows) {
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
