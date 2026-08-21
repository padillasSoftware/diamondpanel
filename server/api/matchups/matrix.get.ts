import { getMatchupMatrix } from '../../services/league'
import { getStringFromQuery } from '../../utils/query'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return getMatchupMatrix({
    seasonId: getStringFromQuery(query.seasonId)
  })
})
