import { getStandings } from '../services/league'
import { getStringFromQuery } from '../utils/query'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return getStandings(getStringFromQuery(query.seasonId))
})
