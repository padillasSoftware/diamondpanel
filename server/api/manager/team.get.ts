import { prisma } from '../../utils/db'
import { requireTeamManager } from '../../utils/session'
import { managerTeamSelect } from '../../utils/team-members'

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const team = await prisma.team.findUnique({
    where: { id: user.activeTeamId },
    select: managerTeamSelect
  })

  if (!team) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Managed team not found'
    })
  }

  return team
})
