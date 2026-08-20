import { prisma } from '../../../../utils/db'
import { requireTeamManager } from '../../../../utils/session'
import {
  assertCurpMatchesTeamBranch,
  assertPlayerCategoryEligibility,
  buildMemberCreateData,
  teamMemberSelect
} from '../../../../utils/team-members'

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const body = await readBody<Record<string, unknown>>(event)

  try {
    const member = buildMemberCreateData(body, user.activeTeamId)

    if (member.memberRole === 'PLAYER' && member.curp) {
      assertCurpMatchesTeamBranch(member.curp, user.activeTeam.branch)
      await assertPlayerCategoryEligibility(prisma, member.curp, user.activeTeam)
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
