import { getTeamsForSeason } from '../../services/league'
import { getStringFromQuery } from '../../utils/query'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return getTeamsForSeason({
    seasonId: getStringFromQuery(query.seasonId),
    category: getStringFromQuery(query.category),
    branch: getStringFromQuery(query.branch)
  })
})
