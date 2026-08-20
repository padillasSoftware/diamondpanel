import { prisma } from '../../utils/db'
import { requireTeamManager } from '../../utils/session'
import { managerTeamSelect } from '../../utils/team-members'
import { cleanHexColor, cleanOptionalText, cleanRequiredText } from '../../utils/validation'

type TeamBody = {
  name?: unknown
  shortName?: unknown
  logoUrl?: unknown
  primaryColor?: unknown
  secondaryColor?: unknown
  managerName?: unknown
}

function handleConflict(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
    throw createError({
      statusCode: 409,
      statusMessage: 'A team with that value already exists'
    })
  }

  throw error
}

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const body = await readBody<TeamBody>(event)

  try {
    return await prisma.team.update({
      where: { id: user.activeTeamId },
      data: {
        name: cleanRequiredText(body.name, 'Team name', 100),
        shortName: cleanOptionalText(body.shortName, 16),
        logoUrl: cleanOptionalText(body.logoUrl, 240),
        primaryColor: cleanHexColor(body.primaryColor),
        secondaryColor: cleanHexColor(body.secondaryColor),
        managerName: cleanOptionalText(body.managerName, 120)
      },
      select: managerTeamSelect
    })
  } catch (error) {
    handleConflict(error)
  }
})
