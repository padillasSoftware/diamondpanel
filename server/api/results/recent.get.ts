import { getRecentResults } from '../../services/league'
import { getLimitFromQuery, getStringFromQuery } from '../../utils/query'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return getRecentResults({
    seasonId: getStringFromQuery(query.seasonId),
    category: getStringFromQuery(query.category),
    branch: getStringFromQuery(query.branch),
    limit: getLimitFromQuery(query.limit)
  })
})
