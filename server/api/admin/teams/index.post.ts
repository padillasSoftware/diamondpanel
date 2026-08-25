import { prisma } from '../../../utils/db'
import { hashPassword } from '../../../utils/password'
import { requireAdmin } from '../../../utils/session'
import { buildAppUrl } from '../../../utils/app-url'
import { sendManagerWelcomeNotification } from '../../../utils/manager-email'
import type { ManagerWelcomeNotification } from '../../../utils/manager-email'
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

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: team,
        select: { id: true }
      })
      const assignedManagerUserIds = [...managerUserIds]
      let managerWelcomeEmail: ManagerWelcomeNotification | null = null

      if (newManager && newManagerPasswordHash) {
        const managerUser = await createOrFindManagerUser(tx, newManager, newManagerPasswordHash)

        assignedManagerUserIds.push(managerUser.userId)

        if (managerUser.created) {
          managerWelcomeEmail = {
            to: newManager.email,
            name: newManager.name ?? newManager.email,
            loginUrl: buildAppUrl(event, '/login'),
            temporaryPassword: managerTempPassword,
            teamName: team.name
          }
        }
      }

      await attachTeamToActiveSeason(tx, created.id)
      await syncTeamManagers(tx, created.id, [...new Set(assignedManagerUserIds)])

      return {
        team: await tx.team.findUniqueOrThrow({
          where: { id: created.id },
          select: adminTeamSelect
        }),
        managerWelcomeEmail
      }
    })

    await sendManagerWelcomeNotification(result.managerWelcomeEmail)

    return result.team
  } catch (error) {
    handleTeamConflict(error)
  }
})
