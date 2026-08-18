import {
  BattingSide,
  PlayerStatus,
  TeamMemberRole,
  ThrowingArm
} from '../generated/prisma/enums'
import type { Prisma } from '../generated/prisma/client'

type EnumRecord = Record<string, string>

export const teamMemberSelect = {
  id: true,
  teamId: true,
  firstName: true,
  lastName: true,
  number: true,
  memberRole: true,
  position: true,
  bats: true,
  throws: true,
  status: true,
  createdAt: true,
  updatedAt: true
} as const

export const managerTeamSelect = {
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
  players: {
    orderBy: [
      { memberRole: 'asc' },
      { number: 'asc' },
      { lastName: 'asc' }
    ],
    select: teamMemberSelect
  }
} satisfies Prisma.TeamSelect

export function cleanOptionalText(value: unknown, maxLength = 120) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed ? trimmed.slice(0, maxLength) : null
}

export function cleanRequiredText(value: unknown, field: string, maxLength = 120) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is required`
    })
  }

  return value.trim().slice(0, maxLength)
}

export function cleanHexColor(value: unknown) {
  const color = cleanOptionalText(value, 16)

  if (!color) return null

  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Color must use #RRGGBB format'
    })
  }

  return color.toUpperCase()
}

export function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)

  if (!Number.isInteger(number) || number < 0 || number > 999) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Number must be between 0 and 999'
    })
  }

  return number
}

export function cleanEnum<T extends EnumRecord>(enumObject: T, value: unknown, field: string) {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toUpperCase()
  const values = Object.values(enumObject)

  if (!values.includes(normalized)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is invalid`
    })
  }

  return normalized as T[keyof T]
}

export function buildMemberCreateData(body: Record<string, unknown>, teamId: string) {
  const memberRole = cleanEnum(TeamMemberRole, body.memberRole, 'Member role') ?? TeamMemberRole.PLAYER
  const position = memberRole === TeamMemberRole.PLAYER
    ? cleanRequiredText(body.position, 'Position', 40)
    : null

  return {
    teamId,
    firstName: cleanRequiredText(body.firstName, 'First name', 80),
    lastName: cleanRequiredText(body.lastName, 'Last name', 80),
    number: memberRole === TeamMemberRole.PLAYER ? cleanNumber(body.number) : null,
    memberRole,
    position,
    bats: cleanEnum(BattingSide, body.bats, 'Batting side') ?? BattingSide.UNKNOWN,
    throws: cleanEnum(ThrowingArm, body.throws, 'Throwing arm') ?? ThrowingArm.UNKNOWN,
    status: cleanEnum(PlayerStatus, body.status, 'Status') ?? PlayerStatus.ACTIVE
  }
}

export function buildMemberUpdateData(
  body: Record<string, unknown>,
  current: {
    firstName: string
    lastName: string
    number: number | null
    memberRole: (typeof TeamMemberRole)[keyof typeof TeamMemberRole]
    position: string | null
    bats: (typeof BattingSide)[keyof typeof BattingSide]
    throws: (typeof ThrowingArm)[keyof typeof ThrowingArm]
    status: (typeof PlayerStatus)[keyof typeof PlayerStatus]
  }
) {
  const memberRole = cleanEnum(TeamMemberRole, body.memberRole, 'Member role') ?? current.memberRole
  const position = memberRole === TeamMemberRole.PLAYER
    ? cleanOptionalText(body.position, 40) ?? current.position
    : null

  if (memberRole === TeamMemberRole.PLAYER && !position) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Position is required for players'
    })
  }

  return {
    firstName: body.firstName === undefined
      ? current.firstName
      : cleanRequiredText(body.firstName, 'First name', 80),
    lastName: body.lastName === undefined
      ? current.lastName
      : cleanRequiredText(body.lastName, 'Last name', 80),
    number: memberRole === TeamMemberRole.PLAYER
      ? body.number === undefined ? current.number : cleanNumber(body.number)
      : null,
    memberRole,
    position,
    bats: cleanEnum(BattingSide, body.bats, 'Batting side') ?? current.bats,
    throws: cleanEnum(ThrowingArm, body.throws, 'Throwing arm') ?? current.throws,
    status: cleanEnum(PlayerStatus, body.status, 'Status') ?? current.status
  }
}
