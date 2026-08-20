import { SeasonStatus } from '../../../generated/prisma/enums'
import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/session'
import { archiveOtherActiveSeasons, assertSeasonStartsAfterOtherSeasons, buildSeasonCreateData, seasonSelect } from '../../../utils/seasons'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)

  try {
    const season = buildSeasonCreateData(body)

    return await prisma.$transaction(async (tx) => {
      await assertSeasonStartsAfterOtherSeasons(tx, season.startsAt)

      const created = await tx.season.create({
        data: season,
        select: seasonSelect
      })

      if (created.status === SeasonStatus.ACTIVE) {
        await archiveOtherActiveSeasons(tx, created.id)
      }

      return created
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
