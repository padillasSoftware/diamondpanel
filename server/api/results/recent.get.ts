import { getRecentResults } from '../../services/league'
import { UserRole } from '../../generated/prisma/enums'
import { getLimitFromQuery, getStringFromQuery } from '../../utils/query'
import { requireUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)
  const scope = getStringFromQuery(query.scope)

  if (user.role !== UserRole.ADMIN) {
    if (!user.activeTeam) {
      throw createError({
        statusCode: 403,
        statusMessage: 'A managed team is required'
      })
    }

    return getRecentResults({
      seasonId: getStringFromQuery(query.seasonId),
      category: scope === 'mine' ? undefined : user.activeTeam.category,
      branch: scope === 'mine' ? undefined : user.activeTeam.branch,
      teamId: scope === 'mine' ? user.activeTeam.id : undefined,
      limit: getLimitFromQuery(query.limit)
    })
  }

  return getRecentResults({
    seasonId: getStringFromQuery(query.seasonId),
    category: getStringFromQuery(query.category),
    branch: getStringFromQuery(query.branch),
    teamId: getStringFromQuery(query.teamId),
    limit: getLimitFromQuery(query.limit)
  })
})
