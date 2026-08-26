import { getTeamsForSeason } from '../../services/league'
import { getStringFromQuery } from '../../utils/query'
import { requireUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireUser(event)

  const query = getQuery(event)

  return getTeamsForSeason({
    seasonId: getStringFromQuery(query.seasonId),
    category: getStringFromQuery(query.category),
    branch: getStringFromQuery(query.branch)
  })
})
