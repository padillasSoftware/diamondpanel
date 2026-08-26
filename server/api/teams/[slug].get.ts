import { getTeamBySlug } from '../../services/league'
import { requireUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireUser(event)

  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team slug is required'
    })
  }

  const team = await getTeamBySlug(slug)

  if (!team) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Team not found'
    })
  }

  return team
})
