import { hashPassword, verifyPassword } from '../../utils/password'
import { prisma } from '../../utils/db'
import { getAuthUserById, requireUser } from '../../utils/session'

type ChangePasswordBody = {
  currentPassword?: string
  newPassword?: string
}

export default defineEventHandler(async (event) => {
  const authUser = await requireUser(event)
  const body = await readBody<ChangePasswordBody>(event)
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Current password and new password are required'
    })
  }

  if (newPassword.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'New password must be at least 8 characters'
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { passwordHash: true }
  })

  const isValidPassword = user?.passwordHash
    ? await verifyPassword(currentPassword, user.passwordHash)
    : false

  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Current password is incorrect'
    })
  }

  await prisma.user.update({
    where: { id: authUser.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false
    }
  })

  return {
    user: await getAuthUserById(event, authUser.id)
  }
})
