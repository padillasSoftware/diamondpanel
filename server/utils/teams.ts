import { SeasonStatus, TeamBranch, TeamCategory, TeamStatus, UserRole } from '../generated/prisma/enums'
import type { Prisma } from '../generated/prisma/client'
import { cleanEnum, cleanHexColor, cleanOptionalText, cleanRequiredText } from './validation'

export type NewManagerInput = {
  email: string
  name: string | null
}

export const adminTeamSelect = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  logoUrl: true,
  primaryColor: true,
  secondaryColor: true,
  managerName: true,
  category: true,
  branch: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  managerAssignments: {
    orderBy: { createdAt: 'asc' },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  },
  _count: {
    select: {
      players: true,
      homeGames: true,
      awayGames: true,
      managerAssignments: true
    }
  }
} as const

function cleanSlug(value: unknown, fallback: string) {
  const rawValue = typeof value === 'string' && value.trim() ? value : fallback
  const slug = rawValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug is required'
    })
  }

  return slug
}

export function cleanManagerUserIds(value: unknown) {
  if (value === undefined) return undefined

  if (!Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Manager users must be a list'
    })
  }

  const userIds = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)

  return [...new Set(userIds)]
}

export function cleanNewManagerInput(value: unknown) {
  if (value === undefined || value === null) return null

  if (typeof value !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'New manager must be an object'
    })
  }

  const manager = value as Record<string, unknown>
  const hasAnyValue = Boolean(
    cleanOptionalText(manager.name, 120)
    || cleanOptionalText(manager.email, 160)
  )

  if (!hasAnyValue) return null

  const email = cleanRequiredText(manager.email, 'Manager email', 160).toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Manager email is invalid'
    })
  }

  return {
    email,
    name: cleanOptionalText(manager.name, 120)
  } satisfies NewManagerInput
}

export function buildTeamCreateData(body: Record<string, unknown>) {
  const name = cleanRequiredText(body.name, 'Team name', 100)

  return {
    name,
    shortName: cleanOptionalText(body.shortName, 16),
    slug: cleanSlug(body.slug, name),
    logoUrl: cleanOptionalText(body.logoUrl, 240),
    primaryColor: cleanHexColor(body.primaryColor),
    secondaryColor: cleanHexColor(body.secondaryColor),
    managerName: cleanOptionalText(body.managerName, 120),
    category: cleanEnum(TeamCategory, body.category, 'Category') ?? TeamCategory.A,
    branch: cleanEnum(TeamBranch, body.branch, 'Branch') ?? TeamBranch.VARONIL,
    status: cleanEnum(TeamStatus, body.status, 'Status') ?? TeamStatus.ACTIVE
  }
}

export function buildTeamUpdateData(
  body: Record<string, unknown>,
  current: {
    name: string
    shortName: string | null
    slug: string
    logoUrl: string | null
    primaryColor: string | null
    secondaryColor: string | null
    managerName: string | null
    category: (typeof TeamCategory)[keyof typeof TeamCategory]
    branch: (typeof TeamBranch)[keyof typeof TeamBranch]
    status: (typeof TeamStatus)[keyof typeof TeamStatus]
  }
) {
  const name = body.name === undefined
    ? current.name
    : cleanRequiredText(body.name, 'Team name', 100)

  return {
    name,
    shortName: body.shortName === undefined ? current.shortName : cleanOptionalText(body.shortName, 16),
    slug: body.slug === undefined ? current.slug : cleanSlug(body.slug, name),
    logoUrl: body.logoUrl === undefined ? current.logoUrl : cleanOptionalText(body.logoUrl, 240),
    primaryColor: body.primaryColor === undefined ? current.primaryColor : cleanHexColor(body.primaryColor),
    secondaryColor: body.secondaryColor === undefined ? current.secondaryColor : cleanHexColor(body.secondaryColor),
    managerName: body.managerName === undefined ? current.managerName : cleanOptionalText(body.managerName, 120),
    category: cleanEnum(TeamCategory, body.category, 'Category') ?? current.category,
    branch: cleanEnum(TeamBranch, body.branch, 'Branch') ?? current.branch,
    status: cleanEnum(TeamStatus, body.status, 'Status') ?? current.status
  }
}

export async function syncTeamManagers(
  prisma: Prisma.TransactionClient,
  teamId: string,
  managerUserIds: string[]
) {
  if (managerUserIds.length) {
    const users = await prisma.user.findMany({
      where: {
        id: { in: managerUserIds },
        role: UserRole.USER
      },
      select: { id: true }
    })
    const validUserIds = new Set(users.map(user => user.id))

    if (validUserIds.size !== managerUserIds.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'One or more selected managers are invalid'
      })
    }
  }

  await prisma.teamManager.deleteMany({
    where: {
      teamId,
      ...(managerUserIds.length ? { userId: { notIn: managerUserIds } } : {})
    }
  })

  if (!managerUserIds.length) return

  await prisma.teamManager.createMany({
    data: managerUserIds.map(userId => ({ userId, teamId })),
    skipDuplicates: true
  })
}

export async function createOrFindManagerUser(
  prisma: Prisma.TransactionClient,
  manager: NewManagerInput,
  passwordHash: string
) {
  const existingUser = await prisma.user.findUnique({
    where: { email: manager.email },
    select: {
      id: true,
      name: true,
      role: true
    }
  })

  if (existingUser) {
    if (existingUser.role !== UserRole.USER) {
      throw createError({
        statusCode: 400,
        statusMessage: 'That email belongs to an admin user'
      })
    }

    if (manager.name && !existingUser.name) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { name: manager.name }
      })
    }

    return {
      userId: existingUser.id,
      created: false
    }
  }

  const createdUser = await prisma.user.create({
    data: {
      email: manager.email,
      name: manager.name,
      passwordHash,
      role: UserRole.USER,
      mustChangePassword: true
    },
    select: {
      id: true
    }
  })

  return {
    userId: createdUser.id,
    created: true
  }
}

export async function attachTeamToActiveSeason(prisma: Prisma.TransactionClient, teamId: string) {
  const activeSeason = await prisma.season.findFirst({
    where: { status: SeasonStatus.ACTIVE },
    select: { id: true }
  })

  if (!activeSeason) return

  await prisma.teamSeason.upsert({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId
      }
    },
    update: {},
    create: {
      seasonId: activeSeason.id,
      teamId
    }
  })
}

export function handleTeamConflict(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
    throw createError({
      statusCode: 409,
      statusMessage: 'A team with that name or slug already exists'
    })
  }

  throw error
}
