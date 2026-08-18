import { prisma } from '../../../../utils/db'
import { requireTeamManager } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const memberId = getRouterParam(event, 'memberId')

  if (!memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Member id is required'
    })
  }

  const member = await prisma.player.findFirst({
    where: {
      id: memberId,
      teamId: user.activeTeamId
    },
    select: { id: true }
  })

  if (!member) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Team member not found'
    })
  }

  await prisma.player.delete({ where: { id: member.id } })

  return { ok: true }
})
