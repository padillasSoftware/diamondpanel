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
  getActiveSeasonForSchedule,
  getScheduleTeamPair,
  getWeekRange
} from '../../../../utils/schedule'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const weekRange = getWeekRange(body.weekStart)
  const scheduledAt = cleanScheduleDateTime(body.scheduledAt, 'Game date')
  const round = cleanScheduleRound(body.round)
  const homeTeamId = cleanTeamId(body.homeTeamId, 'Home team')
  const awayTeamId = cleanTeamId(body.awayTeamId, 'Away team')
  const fieldId = cleanFieldId(body.fieldId)
  const notes = cleanScheduleNotes(body.notes)
  const status = cleanScheduleStatus(body.status)

  assertScheduledInsideWeek(scheduledAt, weekRange.startsAt, weekRange.endsAt)

  return prisma.$transaction(async (tx) => {
    const season = await getActiveSeasonForSchedule(tx)
    const pair = await getScheduleTeamPair(tx, season.id, homeTeamId, awayTeamId)

    await assertFieldAvailable(tx, fieldId)
    if (status !== GameStatus.CANCELLED) {
      await assertScheduleConflicts({
        prisma: tx,
        scheduledAt,
        fieldId,
        homeTeamId,
        awayTeamId
      })
    }
    await assertPairRoundLimit({
      prisma: tx,
      seasonId: season.id,
      homeTeamId,
      awayTeamId,
      category: pair.category,
      branch: pair.branch,
      status
    })

    const game = await tx.game.create({
      data: {
        seasonId: season.id,
        round,
        scheduledAt,
        status,
        notes,
        fieldId,
        homeTeamId,
        awayTeamId
      },
      select: {
        id: true
      }
    })

    return tx.game.findUniqueOrThrow({
      where: { id: game.id },
      select: adminScheduleGameSelect
    })
  })
})
