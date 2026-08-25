import { prisma } from '../../../../../utils/db'
import { requireAdmin } from '../../../../../utils/session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const teamId = getRouterParam(event, 'teamId')
  const memberId = getRouterParam(event, 'memberId')

  if (!teamId || !memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team id and member id are required'
    })
  }

  const member = await prisma.player.findFirst({
    where: {
      id: memberId,
      teamId
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
