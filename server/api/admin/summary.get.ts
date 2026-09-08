import { GameStatus, PlayerStatus, SeasonStatus, TeamMemberRole, TeamStatus } from '../../generated/prisma/enums'
import { getActiveCategories } from '../../utils/categories'
import { prisma } from '../../utils/db'
import { requireAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const activeSeason = await prisma.season.findFirst({
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

  const activeCategories = await getActiveCategories(prisma)
  const activeCategoryFilter = { in: activeCategories }
  const [
    activeTeams,
    activePlayers,
    scheduledGames,
    finalGames,
    fields
  ] = await Promise.all([
    prisma.team.count({
      where: {
        category: activeCategoryFilter,
        status: TeamStatus.ACTIVE
      }
    }),
    prisma.player.count({
      where: {
        status: PlayerStatus.ACTIVE,
        memberRole: TeamMemberRole.PLAYER,
        team: {
          is: {
            category: activeCategoryFilter
          }
        }
      }
    }),
    prisma.game.count({
      where: {
        ...(activeSeason ? { seasonId: activeSeason.id } : {}),
        status: { in: [GameStatus.SCHEDULED, GameStatus.POSTPONED] },
        homeTeam: {
          is: {
            category: activeCategoryFilter
          }
        },
        awayTeam: {
          is: {
            category: activeCategoryFilter
          }
        }
      }
    }),
    prisma.game.count({
      where: {
        ...(activeSeason ? { seasonId: activeSeason.id } : {}),
        status: GameStatus.FINAL,
        homeTeam: {
          is: {
            category: activeCategoryFilter
          }
        },
        awayTeam: {
          is: {
            category: activeCategoryFilter
          }
        }
      }
    }),
    prisma.field.count({ where: { isActive: true } })
  ])

  return {
    user,
    activeSeason,
    metrics: {
      activeTeams,
      activePlayers,
      scheduledGames,
      finalGames,
      fields
    }
  }
})
