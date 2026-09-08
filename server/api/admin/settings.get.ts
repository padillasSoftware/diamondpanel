import { SeasonStatus } from '../../generated/prisma/enums'
import { getLeagueCategorySettings } from '../../utils/categories'
import { prisma } from '../../utils/db'
import { getScheduleConfigs } from '../../utils/schedule'
import { requireAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const [league, categories] = await Promise.all([
    prisma.leagueSettings.findUnique({
      where: { id: 'default' },
      select: {
        primaryLogoUrl: true,
        secondaryLogoUrl: true,
        maxPlayersPerTeam: true
      }
    }),
    getLeagueCategorySettings(prisma)
  ])

  const season = await prisma.season.findFirst({
    where: { status: SeasonStatus.ACTIVE },
    orderBy: [
      { startsAt: 'desc' },
      { year: 'desc' }
    ],
    select: {
      id: true,
      name: true,
      year: true,
      playoffEligibilityMode: true,
      playoffMinimumLineupGames: true
    }
  })

  if (!season) {
    return {
      league: league ?? {
        primaryLogoUrl: null,
        secondaryLogoUrl: null,
        maxPlayersPerTeam: 25
      },
      categories,
      season: null,
      configs: []
    }
  }

  return {
    league: league ?? {
      primaryLogoUrl: null,
      secondaryLogoUrl: null,
      maxPlayersPerTeam: 25
    },
    categories,
    season,
    configs: await getScheduleConfigs(prisma, season.id)
  }
})
