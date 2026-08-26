import {
  BattingSide,
  PlayerStatus,
  TeamBranch,
  TeamMemberRole,
  ThrowingArm
} from '../generated/prisma/enums'
import type { TeamCategory } from '../generated/prisma/enums'
import type { Prisma } from '../generated/prisma/client'
import { cleanEnum, cleanNumber, cleanRequiredText } from './validation'

const playerPositions = ['FIELDER', 'INFIELDER', 'PITCHER', 'CATCHER', 'UTILITY'] as const

// Ordered by competitive level so adjacency can be measured by index distance.
const categoryOrder: TeamCategory[] = ['A', 'B', 'C', 'D', 'E', 'R']

export const teamMemberSelect = {
  id: true,
  teamId: true,
  firstName: true,
  lastName: true,
  curp: true,
  birthDate: true,
  number: true,
  memberRole: true,
  position: true,
  bats: true,
  throws: true,
  status: true
} as const

export const adminTeamMemberSelect = {
  ...teamMemberSelect,
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

export function cleanCurp(value: unknown) {
  const curp = cleanRequiredText(value, 'CURP', 18).toUpperCase()

  if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CURP is invalid'
    })
  }

  return curp
}

export function cleanBirthDate(value: unknown) {
  const birthDate = cleanRequiredText(value, 'Birth date', 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Birth date is invalid'
    })
  }

  const parsedDate = new Date(`${birthDate}T00:00:00.000Z`)

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== birthDate || parsedDate > new Date()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Birth date is invalid'
    })
  }

  return parsedDate
}

export function cleanPlayerPosition(value: unknown) {
  const position = cleanRequiredText(value, 'Position', 40).toUpperCase()

  if (!playerPositions.includes(position as typeof playerPositions[number])) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Position is invalid'
    })
  }

  return position
}

export function buildMemberCreateData(body: Record<string, unknown>, teamId: string) {
  const memberRole = cleanEnum(TeamMemberRole, body.memberRole, 'Member role') ?? TeamMemberRole.PLAYER
  const position = memberRole === TeamMemberRole.PLAYER
    ? cleanPlayerPosition(body.position)
    : null

  return {
    teamId,
    firstName: cleanRequiredText(body.firstName, 'First name', 80),
    lastName: cleanRequiredText(body.lastName, 'Last name', 80),
    curp: cleanCurp(body.curp),
    birthDate: cleanBirthDate(body.birthDate),
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
    curp: string | null
    birthDate: Date | null
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
    ? body.position === undefined ? current.position : cleanPlayerPosition(body.position)
    : null

  if (memberRole === TeamMemberRole.PLAYER && !position) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Position is required for players'
    })
  }

  const curp = body.curp === undefined ? current.curp : cleanCurp(body.curp)
  const birthDate = body.birthDate === undefined ? current.birthDate : cleanBirthDate(body.birthDate)

  if (!curp || !birthDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CURP and birth date are required'
    })
  }

  return {
    firstName: body.firstName === undefined
      ? current.firstName
      : cleanRequiredText(body.firstName, 'First name', 80),
    lastName: body.lastName === undefined
      ? current.lastName
      : cleanRequiredText(body.lastName, 'Last name', 80),
    curp,
    birthDate,
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

export function assertCurpMatchesTeamBranch(curp: string, branch: (typeof TeamBranch)[keyof typeof TeamBranch]) {
  const sexDigit = curp.charAt(10)
  const expectedBranch = sexDigit === 'H' ? TeamBranch.VARONIL : TeamBranch.FEMENIL

  if (expectedBranch !== branch) {
    throw createError({
      statusCode: 400,
      statusMessage: branch === TeamBranch.FEMENIL
        ? 'CURP indicates this player is not eligible for a women\'s branch team'
        : 'CURP indicates this player is not eligible for a men\'s branch team'
    })
  }
}

export async function assertPlayerCategoryEligibility(
  prisma: Prisma.TransactionClient,
  curp: string,
  team: { id: string, category: TeamCategory },
  excludedMemberId?: string
) {
  const teamIndex = categoryOrder.indexOf(team.category)

  const otherRegistrations = await prisma.player.findMany({
    where: {
      id: excludedMemberId ? { not: excludedMemberId } : undefined,
      teamId: { not: team.id },
      memberRole: TeamMemberRole.PLAYER,
      curp
    },
    select: {
      team: { select: { category: true } }
    }
  })

  for (const registration of otherRegistrations) {
    const distance = Math.abs(categoryOrder.indexOf(registration.team.category) - teamIndex)

    if (distance === 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'This player is already registered with another team in the same category'
      })
    }

    if (distance > 1) {
      throw createError({
        statusCode: 409,
        statusMessage: 'This player is already registered with a team too many categories apart'
      })
    }
  }
}
