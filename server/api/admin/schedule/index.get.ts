import { prisma } from '../../../utils/db'
import { requireAdmin } from '../../../utils/session'
import {
  adminScheduleGameSelect,
  getActiveSeasonForSchedule,
  getScheduleConfigs,
  getScheduleTeams,
  getSuggestedRound,
  getWeekRange
} from '../../../utils/schedule'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const weekRange = getWeekRange(query.weekStart)
  const season = await getActiveSeasonForSchedule(prisma)

  const [games, latestRoundGame, teams, fields, configs] = await Promise.all([
    prisma.game.findMany({
      where: {
        seasonId: season.id,
        scheduledAt: {
          gte: weekRange.startsAt,
          lt: weekRange.endsAt
        }
      },
      orderBy: [
        { scheduledAt: 'asc' },
        { fieldId: 'asc' }
      ],
      select: adminScheduleGameSelect
    }),
    prisma.game.findFirst({
      where: {
        seasonId: season.id,
        round: { not: null }
      },
      orderBy: { round: 'desc' },
      select: { round: true }
    }),
    getScheduleTeams(prisma, season.id),
    prisma.field.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        address: true
      }
    }),
    getScheduleConfigs(prisma, season.id)
  ])

  return {
    season,
    weekStart: weekRange.weekStart,
    weekEnd: weekRange.weekEnd,
    suggestedRound: getSuggestedRound(games, latestRoundGame?.round),
    games,
    teams,
    fields,
    configs
  }
})
