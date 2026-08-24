import { SeasonStatus } from '../../generated/prisma/enums'
import { prisma } from '../../utils/db'
import { getScheduleConfigs } from '../../utils/schedule'
import { requireAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const league = await prisma.leagueSettings.findUnique({
    where: { id: 'default' },
    select: {
      primaryLogoUrl: true,
      secondaryLogoUrl: true
    }
  })

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
        secondaryLogoUrl: null
      },
      season: null,
      configs: []
    }
  }

  return {
    league: league ?? {
      primaryLogoUrl: null,
      secondaryLogoUrl: null
    },
    season,
    configs: await getScheduleConfigs(prisma, season.id)
  }
})
