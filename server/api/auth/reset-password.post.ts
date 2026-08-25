import { prisma } from '../../utils/db'
import { hashPassword } from '../../utils/password'
import { hashPasswordResetToken } from '../../utils/password-reset'

type ResetPasswordBody = {
  token?: string
  newPassword?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ResetPasswordBody>(event)
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!token || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Reset token and new password are required'
    })
  }

  if (newPassword.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'New password must be at least 8 characters'
    })
  }

  const tokenHash = hashPasswordResetToken(token)
  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() }
    },
    select: { id: true }
  })

  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Reset token is invalid or expired'
    })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      mustChangePassword: false
    }
  })

  return { ok: true }
})
