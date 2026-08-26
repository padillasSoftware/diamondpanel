import { prisma } from '../../../../../utils/db'
import { requireAdmin } from '../../../../../utils/session'
import { adminTeamMemberSelect } from '../../../../../utils/team-members'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team id is required'
    })
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true }
  })

  if (!team) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Team not found'
    })
  }

  return {
    members: await prisma.player.findMany({
      where: { teamId },
      orderBy: [
        { memberRole: 'asc' },
        { number: 'asc' },
        { lastName: 'asc' }
      ],
      select: adminTeamMemberSelect
    })
  }
})
