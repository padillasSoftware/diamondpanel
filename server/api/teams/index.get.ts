import { getTeamsForSeason } from '../../services/league'
import { getStringFromQuery } from '../../utils/query'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return getTeamsForSeason(getStringFromQuery(query.seasonId))
})
