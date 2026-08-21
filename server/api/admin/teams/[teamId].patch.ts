import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/session'
import {
  adminTeamSelect,
  buildTeamUpdateData,
  cleanManagerUserIds,
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

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.team.update({
        where: { id: teamId },
        data: team,
        select: { id: true }
      })

      if (managerUserIds) {
        await syncTeamManagers(tx, updated.id, managerUserIds)
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
