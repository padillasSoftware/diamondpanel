import { GameStatus } from '../../../../generated/prisma/enums'
import { prisma } from '../../../../utils/db'
import { requireAdmin } from '../../../../utils/session'
import {
  adminScheduleGameSelect,
  assertFieldAvailable,
  assertPairRoundLimit,
  assertScheduleConflicts,
  assertScheduledInsideWeek,
  cleanFieldId,
  cleanScheduleDateTime,
  cleanScheduleNotes,
  cleanScheduleRound,
  cleanScheduleStatus,
  cleanTeamId,
  formatLeagueDate,
  getActiveSeasonForSchedule,
  getScheduleTeamPair,
  getWeekRange
} from '../../../../utils/schedule'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const gameId = getRouterParam(event, 'gameId')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game id is required'
    })
  }

  const body = await readBody<Record<string, unknown>>(event)

  return prisma.$transaction(async (tx) => {
    const season = await getActiveSeasonForSchedule(tx)
    const current = await tx.game.findFirst({
      where: {
        id: gameId,
        seasonId: season.id
      },
      select: {
        id: true,
        round: true,
        scheduledAt: true,
        status: true,
        notes: true,
        fieldId: true,
        homeTeamId: true,
        awayTeamId: true,
        result: {
          select: {
            id: true
          }
        }
      }
    })

    if (!current) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Game not found'
      })
    }

    const scheduledAt = body.scheduledAt === undefined
      ? current.scheduledAt
      : cleanScheduleDateTime(body.scheduledAt, 'Game date')
    const round = body.round === undefined
      ? current.round ?? 1
      : cleanScheduleRound(body.round, current.round)
    const homeTeamId = cleanTeamId(body.homeTeamId, 'Home team', current.homeTeamId)
    const awayTeamId = cleanTeamId(body.awayTeamId, 'Away team', current.awayTeamId)
    const fieldId = cleanFieldId(body.fieldId, current.fieldId)
    const notes = cleanScheduleNotes(body.notes, current.notes)
    const status = cleanScheduleStatus(body.status, current.status)
    const weekRange = getWeekRange(body.weekStart ?? formatLeagueDate(scheduledAt))
    const pair = await getScheduleTeamPair(tx, season.id, homeTeamId, awayTeamId)

    if ((current.result || current.status === GameStatus.FINAL) && status === GameStatus.CANCELLED) {
      throw createError({
        statusCode: 409,
        statusMessage: 'No puedes cancelar un partido que ya tiene resultado capturado.'
      })
    }

    assertScheduledInsideWeek(scheduledAt, weekRange.startsAt, weekRange.endsAt)
    await assertFieldAvailable(tx, fieldId)

    if (status !== GameStatus.CANCELLED) {
      await assertScheduleConflicts({
        prisma: tx,
        scheduledAt,
        fieldId,
        homeTeamId,
        awayTeamId,
        excludedGameId: current.id
      })
    }

    await assertPairRoundLimit({
      prisma: tx,
      seasonId: season.id,
      homeTeamId,
      awayTeamId,
      category: pair.category,
      branch: pair.branch,
      status,
      excludedGameId: current.id
    })

    await tx.game.update({
      where: { id: current.id },
      data: {
        round,
        scheduledAt,
        status,
        notes,
        fieldId,
        homeTeamId,
        awayTeamId
      }
    })

    return tx.game.findUniqueOrThrow({
      where: { id: current.id },
      select: adminScheduleGameSelect
    })
  })
})
