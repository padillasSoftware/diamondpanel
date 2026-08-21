import { prisma } from '../../../utils/db'
import { hashPassword } from '../../../utils/password'
import { requireAdmin } from '../../../utils/session'
import {
  adminTeamSelect,
  attachTeamToActiveSeason,
  buildTeamCreateData,
  cleanManagerUserIds,
  cleanNewManagerInput,
  createOrFindManagerUser,
  handleTeamConflict,
  syncTeamManagers
} from '../../../utils/teams'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)

  try {
    const team = buildTeamCreateData(body)
    const managerUserIds = cleanManagerUserIds(body.managerUserIds) ?? []
    const newManager = cleanNewManagerInput(body.newManager)
    const { managerTempPassword } = useRuntimeConfig()

    if (newManager && managerTempPassword.length < 8) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Manager temporary password is not configured correctly'
      })
    }

    const newManagerPasswordHash = newManager ? await hashPassword(managerTempPassword) : null

    if (!team.managerName && newManager?.name) {
      team.managerName = newManager.name
    }

    return await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: team,
        select: { id: true }
      })
      const assignedManagerUserIds = [...managerUserIds]

      if (newManager && newManagerPasswordHash) {
        const newManagerUserId = await createOrFindManagerUser(tx, newManager, newManagerPasswordHash)

        assignedManagerUserIds.push(newManagerUserId)
      }

      await attachTeamToActiveSeason(tx, created.id)
      await syncTeamManagers(tx, created.id, [...new Set(assignedManagerUserIds)])

      return tx.team.findUniqueOrThrow({
        where: { id: created.id },
        select: adminTeamSelect
      })
    })
  } catch (error) {
    handleTeamConflict(error)
  }
})
