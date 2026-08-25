import { prisma } from '../../utils/db'
import {
  createPasswordResetToken,
  getPasswordResetExpiresAt,
  hashPasswordResetToken,
  passwordResetMaxAgeMinutes
} from '../../utils/password-reset'
import { emailService } from '../../services/email/email.service'
import { buildAppUrl } from '../../utils/app-url'

type ForgotPasswordBody = {
  email?: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ForgotPasswordBody>(event)
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''

  if (!email || !isValidEmail(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid email is required'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true
    }
  })
  let resetUrl: string | null = null
  let emailSent = false

  if (user) {
    const token = createPasswordResetToken()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashPasswordResetToken(token),
        passwordResetExpiresAt: getPasswordResetExpiresAt()
      }
    })

    const url = new URL(buildAppUrl(event, '/reset-password'))

    url.searchParams.set('token', token)

    const delivery = await emailService.sendResetPasswordEmail({
      to: user.email,
      name: user.name ?? 'usuario',
      resetUrl: url.toString()
    })

    emailSent = delivery.sent

    if (process.env.NODE_ENV !== 'production') {
      resetUrl = url.toString()
    }
  }

  return {
    ok: true,
    resetUrl,
    emailSent,
    expiresInMinutes: passwordResetMaxAgeMinutes
  }
})
