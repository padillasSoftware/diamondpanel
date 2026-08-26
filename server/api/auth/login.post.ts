import { verifyPassword } from '../../utils/password'
import { prisma } from '../../utils/db'
import { assertRateLimit, getRateLimitIp } from '../../utils/rate-limit'
import { getAuthUserById, setSessionCookie } from '../../utils/session'

type LoginBody = {
  email?: string
  password?: string
  rememberMe?: boolean
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const rememberMe = body.rememberMe === true
  const ip = getRateLimitIp(event)

  assertRateLimit(event, {
    key: `login:ip:${ip}`,
    max: 30,
    windowMs: 15 * 60 * 1000,
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.'
  })

  if (email) {
    assertRateLimit(event, {
      key: `login:email:${email}`,
      max: 8,
      windowMs: 15 * 60 * 1000,
      message: 'Demasiados intentos para este correo. Intenta de nuevo en unos minutos.'
    })
  }

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true
    }
  })

  const isValidPassword = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : false

  if (!user || !isValidPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid credentials'
    })
  }

  setSessionCookie(event, user.id, { rememberMe })

  return {
    user: await getAuthUserById(event, user.id)
  }
})
