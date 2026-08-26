import { getMatchupMatrix } from '../../services/league'
import { UserRole } from '../../generated/prisma/enums'
import { getStringFromQuery } from '../../utils/query'
import { requireUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)

  if (user.role !== UserRole.ADMIN) {
    if (!user.activeTeam) {
      throw createError({
        statusCode: 403,
        statusMessage: 'A managed team is required'
      })
    }

    return getMatchupMatrix({
      seasonId: getStringFromQuery(query.seasonId),
      category: user.activeTeam.category,
      branch: user.activeTeam.branch
    })
  }

  return getMatchupMatrix({
    seasonId: getStringFromQuery(query.seasonId),
    category: getStringFromQuery(query.category),
    branch: getStringFromQuery(query.branch)
  })
})
