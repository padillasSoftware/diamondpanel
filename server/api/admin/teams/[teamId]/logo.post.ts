import { prisma } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/session'
import { removeUploadedTeamLogo, storeTeamLogoUpload } from '../../../../utils/team-logo-upload'
import { adminTeamSelect } from '../../../../utils/teams'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team id is required'
    })
  }

  const current = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, logoUrl: true }
  })

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Team not found'
    })
  }

  const logoUrl = await storeTeamLogoUpload(event, teamId)
  const team = await prisma.team.update({
    where: { id: teamId },
    data: { logoUrl },
    select: adminTeamSelect
  })

  await removeUploadedTeamLogo(current.logoUrl)

  return {
    logoUrl,
    team
  }
})
