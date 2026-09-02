import { UserRole } from '../../../generated/prisma/enums'
import { getActiveCategories } from '../../../utils/categories'
import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/session'
import { adminTeamSelect } from '../../../utils/teams'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const activeCategories = await getActiveCategories(prisma)

  const [teams, managerOptions] = await Promise.all([
    prisma.team.findMany({
      where: {
        category: { in: activeCategories }
      },
      orderBy: [
        { category: 'asc' },
        { branch: 'asc' },
        { name: 'asc' }
      ],
      select: adminTeamSelect
    }),
    prisma.user.findMany({
      where: { role: UserRole.USER },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' }
      ],
      select: {
        id: true,
        email: true,
        name: true
      }
    })
  ])

  return {
    teams,
    managerOptions
  }
})
