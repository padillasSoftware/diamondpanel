import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/session'
import { seasonSelect } from '../../../utils/seasons'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  return prisma.season.findMany({
    orderBy: [
      { year: 'desc' },
      { startsAt: 'desc' }
    ],
    select: seasonSelect
  })
})
