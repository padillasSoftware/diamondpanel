import { prisma } from '../../../../../../utils/db'
import { requireAdmin } from '../../../../../../utils/session'
import { removeUploadedPlayerPhoto, storePlayerPhotoUpload } from '../../../../../../utils/player-photo-upload'
import { adminTeamMemberSelect } from '../../../../../../utils/team-members'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const teamId = getRouterParam(event, 'teamId')
  const memberId = getRouterParam(event, 'memberId')

  if (!teamId || !memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team id and member id are required'
    })
  }

  const current = await prisma.player.findFirst({
    where: {
      id: memberId,
      teamId
    },
    select: {
      id: true,
      photoUrl: true
    }
  })

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Team member not found'
    })
  }

  const photoUrl = await storePlayerPhotoUpload(event, current.id)
  const member = await prisma.player.update({
    where: { id: current.id },
    data: { photoUrl },
    select: adminTeamMemberSelect
  })

  await removeUploadedPlayerPhoto(current.photoUrl)

  return {
    photoUrl,
    member
  }
})
