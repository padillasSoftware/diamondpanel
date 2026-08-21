import { prisma } from '../../../utils/db'
import { hashPassword } from '../../../utils/password'
import { requireAdmin } from '../../../utils/session'
import {
  adminTeamSelect,
  buildTeamUpdateData,
  cleanManagerUserIds,
  cleanNewManagerInput,
  createOrFindManagerUser,
  handleTeamConflict,
  syncTeamManagers
} from '../../../utils/teams'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team id is required'
    })
  }

  const current = await prisma.team.findUnique({ where: { id: teamId } })

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Team not found'
    })
  }

  const body = await readBody<Record<string, unknown>>(event)

  try {
    const team = buildTeamUpdateData(body, current)
    const managerUserIds = cleanManagerUserIds(body.managerUserIds)
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
      const updated = await tx.team.update({
        where: { id: teamId },
        data: team,
        select: { id: true }
      })

      if (managerUserIds || newManager) {
        const existingManagerAssignments = managerUserIds
          ? []
          : await tx.teamManager.findMany({
              where: { teamId: updated.id },
              select: { userId: true }
            })
        const assignedManagerUserIds = managerUserIds
          ? [...managerUserIds]
          : existingManagerAssignments.map(assignment => assignment.userId)

        if (newManager && newManagerPasswordHash) {
          const newManagerUserId = await createOrFindManagerUser(tx, newManager, newManagerPasswordHash)

          assignedManagerUserIds.push(newManagerUserId)
        }

        await syncTeamManagers(tx, updated.id, [...new Set(assignedManagerUserIds)])
      }

      return tx.team.findUniqueOrThrow({
        where: { id: updated.id },
        select: adminTeamSelect
      })
    })
  } catch (error) {
    handleTeamConflict(error)
  }
})
