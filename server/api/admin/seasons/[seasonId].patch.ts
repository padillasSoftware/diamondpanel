import { SeasonStatus } from '../../../generated/prisma/enums'
import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/session'
import { archiveOtherActiveSeasons, assertSeasonStartsAfterOtherSeasons, attachActiveTeamsToSeason, buildSeasonUpdateData, seasonSelect } from '../../../utils/seasons'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const seasonId = getRouterParam(event, 'seasonId')

  if (!seasonId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Season id is required'
    })
  }

  const current = await prisma.season.findUnique({ where: { id: seasonId } })

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Season not found'
    })
  }

  const body = await readBody<Record<string, unknown>>(event)

  try {
    const season = buildSeasonUpdateData(body, current)

    return await prisma.$transaction(async (tx) => {
      await assertSeasonStartsAfterOtherSeasons(tx, season.startsAt, seasonId)

      const updated = await tx.season.update({
        where: { id: seasonId },
        data: season,
        select: seasonSelect
      })

      if (updated.status === SeasonStatus.ACTIVE) {
        await archiveOtherActiveSeasons(tx, updated.id)
        await attachActiveTeamsToSeason(tx, updated.id)
      }

      return updated
    })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'A season with that name and year already exists'
      })
    }

    throw error
  }
})
