import { getRecentResults } from '../../services/league'
import { getLimitFromQuery, getStringFromQuery } from '../../utils/query'
import { getCurrentUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const scope = getStringFromQuery(query.scope)
  const user = scope === 'mine' ? await getCurrentUser(event) : null

  return getRecentResults({
    seasonId: getStringFromQuery(query.seasonId),
    category: getStringFromQuery(query.category),
    branch: getStringFromQuery(query.branch),
    teamId: scope === 'mine' && user?.role !== 'ADMIN' ? user?.activeTeamId ?? undefined : getStringFromQuery(query.teamId),
    limit: getLimitFromQuery(query.limit)
  })
})
