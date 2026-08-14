import { getUpcomingGames } from '../../services/league'
import { getLimitFromQuery, getStringFromQuery } from '../../utils/query'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return getUpcomingGames({
    seasonId: getStringFromQuery(query.seasonId),
    category: getStringFromQuery(query.category),
    branch: getStringFromQuery(query.branch),
    limit: getLimitFromQuery(query.limit)
  })
})
