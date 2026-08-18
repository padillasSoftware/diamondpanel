import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { UserRole } from '../generated/prisma/enums'
import type { TeamBranch, TeamCategory } from '../generated/prisma/enums'
import { prisma } from './db'

const sessionCookieName = 'diamondpanel_session'
const sessionMaxAge = 60 * 60 * 24 * 7

type UserRoleValue = (typeof UserRole)[keyof typeof UserRole]

type SessionPayload = {
  sub: string
  exp: number
}

export type AuthUser = {
  id: string
  email: string
  name: string | null
  role: UserRoleValue
  managedTeamId: string | null
  managedTeam: {
    id: string
    name: string
    slug: string
    category: TeamCategory
    branch: TeamBranch
  } | null
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  managedTeamId: true,
  managedTeam: {
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      branch: true
    }
  }
} as const

function getAuthSecret(event: H3Event) {
  const config = useRuntimeConfig(event)
  const secret = config.authSecret || process.env.AUTH_SECRET

  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 500,
      statusMessage: 'AUTH_SECRET is required'
    })
  }

  return 'diamondpanel-local-development-secret'
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))

    if (
      !payload
      || typeof payload.sub !== 'string'
      || typeof payload.exp !== 'number'
    ) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

function readSessionUserId(event: H3Event) {
  const token = getCookie(event, sessionCookieName)

  if (!token) return null

  const [payloadValue, signature] = token.split('.')

  if (!payloadValue || !signature) return null

  const expectedSignature = sign(payloadValue, getAuthSecret(event))

  if (!safeEqual(signature, expectedSignature)) {
    return null
  }

  const payload = decodePayload(payloadValue)

  if (!payload || payload.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload.sub
}

export function setSessionCookie(event: H3Event, userId: string) {
  const payload = encodePayload({
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAge
  })
  const token = `${payload}.${sign(payload, getAuthSecret(event))}`

  setCookie(event, sessionCookieName, token, {
    httpOnly: true,
    maxAge: sessionMaxAge,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, sessionCookieName, {
    path: '/'
  })
}

export async function getCurrentUser(event: H3Event): Promise<AuthUser | null> {
  const userId = readSessionUserId(event)

  if (!userId) return null

  return prisma.user.findUnique({
    where: { id: userId },
    select: userSelect
  })
}

export async function requireUser(event: H3Event) {
  const user = await getCurrentUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)

  if (user.role !== UserRole.ADMIN) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }

  return user
}

export async function requireTeamManager(event: H3Event) {
  const user = await requireUser(event)

  if (!user.managedTeamId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'A managed team is required'
    })
  }

  return user as AuthUser & { managedTeamId: string }
}
