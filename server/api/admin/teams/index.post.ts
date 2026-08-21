import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/session'
import {
  adminTeamSelect,
  attachTeamToActiveSeason,
  buildTeamCreateData,
  cleanManagerUserIds,
  handleTeamConflict,
  syncTeamManagers
} from '../../../utils/teams'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)

  try {
    const team = buildTeamCreateData(body)
    const managerUserIds = cleanManagerUserIds(body.managerUserIds) ?? []

    return await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: team,
        select: { id: true }
      })

      await attachTeamToActiveSeason(tx, created.id)
      await syncTeamManagers(tx, created.id, managerUserIds)

      return tx.team.findUniqueOrThrow({
        where: { id: created.id },
        select: adminTeamSelect
      })
    })
  } catch (error) {
    handleTeamConflict(error)
  }
})
