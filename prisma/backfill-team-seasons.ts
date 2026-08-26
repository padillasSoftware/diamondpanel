import 'dotenv/config'
import { SeasonStatus, TeamStatus } from '../server/generated/prisma/enums'
import { prisma } from '../server/utils/db'

async function main() {
  const activeSeason = await prisma.season.findFirst({
    where: { status: SeasonStatus.ACTIVE },
    orderBy: [
      { startsAt: 'desc' },
      { year: 'desc' }
    ],
    select: {
      id: true,
      name: true,
      year: true
    }
  })

  if (!activeSeason) {
    console.log('No active season found. Create or activate a season first.')

    return
  }

  const teams = await prisma.team.findMany({
    where: { status: TeamStatus.ACTIVE },
    select: { id: true }
  })

  const result = await prisma.teamSeason.createMany({
    data: teams.map(team => ({
      seasonId: activeSeason.id,
      teamId: team.id
    })),
    skipDuplicates: true
  })

  console.log(`Active season: ${activeSeason.name} ${activeSeason.year}`)
  console.log(`Active teams found: ${teams.length}`)
  console.log(`New team-season links created: ${result.count}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
