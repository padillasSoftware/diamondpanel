import { prisma } from '../../../../../utils/db'
import { requireTeamManager } from '../../../../../utils/session'
import { removeUploadedPlayerPhoto, storePlayerPhotoUpload } from '../../../../../utils/player-photo-upload'
import { teamMemberSelect } from '../../../../../utils/team-members'

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const memberId = getRouterParam(event, 'memberId')

  if (!memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Member id is required'
    })
  }

  const current = await prisma.player.findFirst({
    where: {
      id: memberId,
      teamId: user.activeTeamId
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
    select: teamMemberSelect
  })

  await removeUploadedPlayerPhoto(current.photoUrl)

  return {
    photoUrl,
    member
  }
})
