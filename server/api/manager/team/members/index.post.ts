import { prisma } from '../../../../utils/db'
import { requireTeamManager } from '../../../../utils/session'
import {
  buildMemberCreateData,
  teamMemberSelect
} from '../../../../utils/team-members'

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const body = await readBody<Record<string, unknown>>(event)

  try {
    return await prisma.player.create({
      data: buildMemberCreateData(body, user.activeTeamId),
      select: teamMemberSelect
    })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'That number is already used by another member of this team'
      })
    }

    throw error
  }
})
