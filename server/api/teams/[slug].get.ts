import { getTeamBySlug } from '../../services/league'

export default defineEventHandler(async (event) => {
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
