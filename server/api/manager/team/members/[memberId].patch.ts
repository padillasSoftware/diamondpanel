import { prisma } from '../../../../utils/db'
import { requireTeamManager } from '../../../../utils/session'
import {
  assertCurpMatchesTeamBranch,
  assertPlayerCategoryEligibility,
  buildMemberUpdateData,
  teamMemberSelect
} from '../../../../utils/team-members'

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const memberId = getRouterParam(event, 'memberId')

  if (!memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Member id is required'
    })
  }

  const current = await prisma.player.findFirst({
    where: {
      id: memberId,
      teamId: user.activeTeamId
    }
  })

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Team member not found'
    })
  }

  const body = await readBody<Record<string, unknown>>(event)

  try {
    const member = buildMemberUpdateData(body, current)

    if (member.memberRole === 'PLAYER' && member.curp) {
      assertCurpMatchesTeamBranch(member.curp, user.activeTeam.branch)
      await assertPlayerCategoryEligibility(prisma, member.curp, user.activeTeam, current.id)
    }

    return await prisma.player.update({
      where: { id: current.id },
      data: member,
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
