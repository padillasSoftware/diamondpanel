import { prisma } from '../../../utils/db'
import { requireTeamManager } from '../../../utils/session'
import { removeUploadedTeamLogo, storeTeamLogoUpload } from '../../../utils/team-logo-upload'
import { managerTeamSelect } from '../../../utils/team-members'

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const teamId = user.activeTeamId
  const current = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, logoUrl: true }
  })

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Managed team not found'
    })
  }

  const logoUrl = await storeTeamLogoUpload(event, teamId)
  const team = await prisma.team.update({
    where: { id: teamId },
    data: { logoUrl },
    select: managerTeamSelect
  })

  await removeUploadedTeamLogo(current.logoUrl)

  return {
    logoUrl,
    team
  }
})
