import { prisma } from '../../../../../utils/db'
import { requireAdmin } from '../../../../../utils/session'
import {
  assertCurpMatchesTeamBranch,
  assertPlayerCategoryEligibility,
  buildMemberUpdateData,
  adminTeamMemberSelect
} from '../../../../../utils/team-members'

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

  const current = await prisma.player.findFirst({
    where: {
      id: memberId,
      teamId
    },
    include: {
      team: {
        select: {
          id: true,
          category: true,
          branch: true
        }
      }
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
      assertCurpMatchesTeamBranch(member.curp, current.team.branch)
      await assertPlayerCategoryEligibility(prisma, member.curp, current.team, current.id)
    }

    return await prisma.player.update({
      where: { id: current.id },
      data: member,
      select: adminTeamMemberSelect
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
