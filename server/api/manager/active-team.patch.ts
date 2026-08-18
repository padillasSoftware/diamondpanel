import { setActiveManagedTeam } from '../../utils/session'

type ActiveTeamBody = {
  teamId?: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ActiveTeamBody>(event)

  if (typeof body.teamId !== 'string' || !body.teamId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team id is required'
    })
  }

  return {
    user: await setActiveManagedTeam(event, body.teamId.trim())
  }
})
