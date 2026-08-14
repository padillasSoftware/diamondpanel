import { getRecentResults } from '../../services/league'
import { getLimitFromQuery, getStringFromQuery } from '../../utils/query'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return getRecentResults({
    seasonId: getStringFromQuery(query.seasonId),
    limit: getLimitFromQuery(query.limit)
  })
})
