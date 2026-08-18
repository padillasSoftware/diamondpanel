import { UserRole } from '../generated/prisma/enums'
import { getStandings } from '../services/league'
import { getStringFromQuery } from '../utils/query'
import { requireUser } from '../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)
  const requestedCategory = getStringFromQuery(query.category)
  const requestedBranch = getStringFromQuery(query.branch)
  const category = user.role === UserRole.ADMIN
    ? requestedCategory
    : user.activeTeam?.category
  const branch = user.role === UserRole.ADMIN
    ? requestedBranch
    : user.activeTeam?.branch

  if (user.role !== UserRole.ADMIN && (!category || !branch)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'A managed team category and branch are required'
    })
  }

  return getStandings({
    seasonId: getStringFromQuery(query.seasonId),
    category,
    branch
  })
})
