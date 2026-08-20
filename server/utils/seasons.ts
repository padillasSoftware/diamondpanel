import { SeasonStatus } from '../generated/prisma/enums'
import type { Prisma } from '../generated/prisma/client'
import { cleanEnum, cleanOptionalDate, cleanRequiredDate, cleanRequiredText } from './validation'

export const seasonSelect = {
  id: true,
  name: true,
  year: true,
  startsAt: true,
  endsAt: true,
  status: true,
  createdAt: true,
  updatedAt: true
} as const

function cleanYear(value: unknown) {
  const year = Number(value)

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Year must be between 2000 and 2100'
    })
  }

  return year
}

export function buildSeasonCreateData(body: Record<string, unknown>) {
  return {
    name: cleanRequiredText(body.name, 'Name', 80),
    year: cleanYear(body.year),
    startsAt: cleanRequiredDate(body.startsAt, 'Start date'),
    endsAt: cleanOptionalDate(body.endsAt, 'End date'),
    status: cleanEnum(SeasonStatus, body.status, 'Status') ?? SeasonStatus.DRAFT
  }
}

export function buildSeasonUpdateData(
  body: Record<string, unknown>,
  current: {
    name: string
    year: number
    startsAt: Date | null
    endsAt: Date | null
    status: (typeof SeasonStatus)[keyof typeof SeasonStatus]
  }
) {
  return {
    name: body.name === undefined ? current.name : cleanRequiredText(body.name, 'Name', 80),
    year: body.year === undefined ? current.year : cleanYear(body.year),
    startsAt: body.startsAt === undefined
      ? current.startsAt ?? cleanRequiredDate(body.startsAt, 'Start date')
      : cleanRequiredDate(body.startsAt, 'Start date'),
    endsAt: body.endsAt === undefined ? current.endsAt : cleanOptionalDate(body.endsAt, 'End date'),
    status: body.status === undefined ? current.status : cleanEnum(SeasonStatus, body.status, 'Status') ?? current.status
  }
}

// Each season must start after every other season's boundary so timelines never overlap or go backwards.
export async function assertSeasonStartsAfterOtherSeasons(
  prisma: Prisma.TransactionClient,
  startsAt: Date,
  excludedSeasonId?: string
) {
  const otherSeasons = await prisma.season.findMany({
    where: excludedSeasonId ? { id: { not: excludedSeasonId } } : undefined,
    select: { name: true, year: true, startsAt: true, endsAt: true }
  })

  for (const season of otherSeasons) {
    const boundary = season.endsAt ?? season.startsAt

    if (boundary && startsAt <= boundary) {
      throw createError({
        statusCode: 409,
        statusMessage: `Start date must be after ${boundary.toISOString().slice(0, 10)}, when "${season.name} ${season.year}" ends`
      })
    }
  }
}

// Keeps a single active season so /api/seasons/active and standings stay unambiguous.
export async function archiveOtherActiveSeasons(prisma: Prisma.TransactionClient, seasonId: string) {
  await prisma.season.updateMany({
    where: {
      id: { not: seasonId },
      status: SeasonStatus.ACTIVE
    },
    data: {
      status: SeasonStatus.ARCHIVED
    }
  })
}
