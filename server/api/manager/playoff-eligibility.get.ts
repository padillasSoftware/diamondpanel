import { GameStatus, PlayerStatus, PlayoffEligibilityMode, TeamMemberRole } from '../../generated/prisma/enums'
import { prisma } from '../../utils/db'
import { getActiveSeasonForResults, resultPlayerSelect } from '../../utils/results'
import { requireTeamManager } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireTeamManager(event)
  const season = await getActiveSeasonForResults(prisma)

  if (!season) {
    return {
      season: null,
      eligibilityMode: PlayoffEligibilityMode.LINEUP_GAMES,
      isOpenRoster: false,
      minimumGames: 5,
      team: null
    }
  }

  const isOpenRoster = season.playoffEligibilityMode === PlayoffEligibilityMode.OPEN_ROSTER
  const minimumGames = season.playoffMinimumLineupGames

  const [team, lineupCounts] = await Promise.all([
    prisma.team.findUnique({
      where: {
        id: user.activeTeamId
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        category: true,
        branch: true,
        players: {
          where: {
            status: PlayerStatus.ACTIVE,
            memberRole: TeamMemberRole.PLAYER
          },
          orderBy: [
            { number: 'asc' },
            { firstName: 'asc' },
            { lastName: 'asc' }
          ],
          select: resultPlayerSelect
        }
      }
    }),
    prisma.gameLineupEntry.groupBy({
      by: ['playerId'],
      where: {
        teamId: user.activeTeamId,
        game: {
          seasonId: season.id,
          status: {
            not: GameStatus.CANCELLED
          }
        }
      },
      _count: {
        playerId: true
      }
    })
  ])

  if (!team) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Managed team not found'
    })
  }

  const countsByPlayerId = new Map(lineupCounts.map(row => [row.playerId, row._count.playerId]))

  return {
    season,
    eligibilityMode: season.playoffEligibilityMode,
    isOpenRoster,
    minimumGames,
    team: {
      ...team,
      players: team.players.map((player) => {
        const lineupGames = countsByPlayerId.get(player.id) ?? 0

        return {
          ...player,
          lineupGames,
          isPlayoffEligible: isOpenRoster || lineupGames >= minimumGames
        }
      })
    }
  }
})
