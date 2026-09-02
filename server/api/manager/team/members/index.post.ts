import { prisma } from '../../../../utils/db'
import { assertLeagueCategoryActive } from '../../../../utils/categories'
import { requireTeamManager } from '../../../../utils/session'
import {
  assertCurpMatchesTeamBranch,
  assertPlayerCategoryEligibility,
  assertTeamPlayerLimit,
  buildMemberCreateData,
  teamMemberSelect
} from '../../../../utils/team-members'

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const body = await readBody<Record<string, unknown>>(event)

  try {
    const member = buildMemberCreateData(body, user.activeTeamId)
    await assertLeagueCategoryActive(prisma, user.activeTeam.category)

    if (member.memberRole === 'PLAYER' && member.curp) {
      assertCurpMatchesTeamBranch(member.curp, user.activeTeam.branch)
      await assertPlayerCategoryEligibility(prisma, member.curp, user.activeTeam)
      await assertTeamPlayerLimit(prisma, {
        teamId: user.activeTeamId,
        memberRole: member.memberRole,
        status: member.status
      })
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
