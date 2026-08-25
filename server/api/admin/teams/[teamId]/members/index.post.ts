import { prisma } from '../../../../../utils/db'
import { requireAdmin } from '../../../../../utils/session'
import {
  assertCurpMatchesTeamBranch,
  assertPlayerCategoryEligibility,
  buildMemberCreateData,
  teamMemberSelect
} from '../../../../../utils/team-members'

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
    select: {
      id: true,
      category: true,
      branch: true
    }
  })

  if (!team) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Team not found'
    })
  }

  const body = await readBody<Record<string, unknown>>(event)

  try {
    const member = buildMemberCreateData(body, team.id)

    if (member.memberRole === 'PLAYER' && member.curp) {
      assertCurpMatchesTeamBranch(member.curp, team.branch)
      await assertPlayerCategoryEligibility(prisma, member.curp, team)
    }

    return await prisma.player.create({
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
