import { prisma } from '../../../../../utils/db'
import { assertLeagueCategoryActive } from '../../../../../utils/categories'
import { requireAdmin } from '../../../../../utils/session'
import {
  assertCurpMatchesTeamBranch,
  assertPlayerCategoryEligibility,
  assertTeamPlayerLimit,
  buildMemberCreateData,
  adminTeamMemberSelect
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

  await assertLeagueCategoryActive(prisma, team.category)

  const body = await readBody<Record<string, unknown>>(event)

  try {
    const member = buildMemberCreateData(body, team.id)

    if (member.memberRole === 'PLAYER' && member.curp) {
      assertCurpMatchesTeamBranch(member.curp, team.branch)
      await assertPlayerCategoryEligibility(prisma, member.curp, team)
      await assertTeamPlayerLimit(prisma, {
        teamId: team.id,
        memberRole: member.memberRole,
        status: member.status
      })
    }

    return await prisma.player.create({
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
