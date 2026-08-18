import { verifyPassword } from '../../utils/password'
import { prisma } from '../../utils/db'
import { getAuthUserById, setSessionCookie } from '../../utils/session'

type LoginBody = {
  email?: string
  password?: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
  const password = typeof body.password === 'string' ? body.password : ''

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

  setSessionCookie(event, user.id)

  return {
    user: await getAuthUserById(event, user.id)
  }
})
