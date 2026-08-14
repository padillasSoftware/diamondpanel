import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../server/generated/prisma/client.ts'
import {
  BattingSide,
  GameStatus,
  SeasonStatus,
  TeamBranch,
  TeamCategory,
  ThrowingArm,
  UserRole
} from '../server/generated/prisma/enums.ts'
import { hashPassword } from '../server/utils/password.ts'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

const toDate = (value: string) => new Date(value)

const scheduleFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Tijuana'
})

function getScheduleParts(date: Date) {
  const parts = Object.fromEntries(
    scheduleFormatter.formatToParts(date).map(part => [part.type, part.value])
  )

  return {
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  }
}

function assertValidGameSlot(date: Date) {
  const { weekday, hour, minute } = getScheduleParts(date)
  const isFridaySlot = weekday === 'Fri' && minute === 0 && (hour === 19 || hour === 21)
  const isWeekendSlot = (weekday === 'Sat' || weekday === 'Sun') && minute === 0 && hour >= 10 && hour <= 22

  if (!isFridaySlot && !isWeekendSlot) {
    throw new Error(`Invalid game slot: ${date.toISOString()}. Allowed slots are Friday 7/9 PM and Saturday/Sunday 10 AM-10 PM.`)
  }
}

const teamCategories = [
  TeamCategory.A,
  TeamCategory.B,
  TeamCategory.C,
  TeamCategory.D,
  TeamCategory.E,
  TeamCategory.R
] as const

const teamBlueprints = [
  { category: TeamCategory.A, branch: TeamBranch.VARONIL, teams: [['Tigres', 'TR'], ['Aguilas', 'AG'], ['Leones', 'LE']] },
  { category: TeamCategory.A, branch: TeamBranch.FEMENIL, teams: [['Diamantes', 'DI'], ['Amazonas', 'AM'], ['Estrellas', 'ES']] },
  { category: TeamCategory.B, branch: TeamBranch.VARONIL, teams: [['Halcones', 'HA'], ['Toros', 'TO'], ['Panteras', 'PA']] },
  { category: TeamCategory.B, branch: TeamBranch.FEMENIL, teams: [['Auroras', 'AU'], ['Sirenas', 'SI'], ['Valkirias', 'VA']] },
  { category: TeamCategory.C, branch: TeamBranch.VARONIL, teams: [['Bravos', 'BR'], ['Cardenales', 'CA'], ['Delfines', 'DE']] },
  { category: TeamCategory.C, branch: TeamBranch.FEMENIL, teams: [['Lunas', 'LU'], ['Reinas', 'RE'], ['Cometas', 'CO']] },
  { category: TeamCategory.D, branch: TeamBranch.VARONIL, teams: [['Guerreros', 'GU'], ['Marineros', 'MA'], ['Venados', 'VE']] },
  { category: TeamCategory.D, branch: TeamBranch.FEMENIL, teams: [['Centellas', 'CE'], ['Nereidas', 'NE'], ['Gacelas', 'GA']] },
  { category: TeamCategory.E, branch: TeamBranch.VARONIL, teams: [['Coyotes', 'CY'], ['Titanes', 'TI'], ['Piratas', 'PI']] },
  { category: TeamCategory.E, branch: TeamBranch.FEMENIL, teams: [['Fieras', 'FI'], ['Guerreras', 'GR'], ['Halconas', 'HN']] },
  { category: TeamCategory.R, branch: TeamBranch.VARONIL, teams: [['Rangers', 'RA'], ['Astros', 'AS'], ['Relampagos', 'RL']] },
  { category: TeamCategory.R, branch: TeamBranch.FEMENIL, teams: [['Pioneras', 'PN'], ['Lobas', 'LO'], ['Tormentas', 'TM']] }
] as const

const primaryColors = [
  '#047857',
  '#f97316',
  '#dc2626',
  '#2563eb',
  '#991b1b',
  '#7c3aed',
  '#be123c',
  '#0891b2',
  '#0f766e',
  '#854d0e',
  '#c2410c',
  '#0e7490'
]

const secondaryColors = ['#0f172a', '#f8fafc', '#fbbf24', '#111827']
const managerNames = [
  'Carlos Martinez',
  'Luis Rivera',
  'Pedro Garcia',
  'Juan Perez',
  'Miguel Alvarez',
  'Roberto Sanchez',
  'Fernando Ruiz',
  'Armando Castillo',
  'Enrique Navarro',
  'Santiago Robles',
  'Rafael Molina',
  'Francisco Leon'
]
const maleFirstNames = ['Miguel', 'Jose', 'Carlos', 'Andres', 'Daniel', 'Marco', 'Hector', 'Raul', 'Oscar', 'Ivan', 'Ruben', 'Adrian']
const femaleFirstNames = ['Ana', 'Sofia', 'Valeria', 'Camila', 'Mariana', 'Lucia', 'Elena', 'Paola', 'Diana', 'Clara', 'Renata', 'Isabel']
const lastNames = ['Ramirez', 'Gomez', 'Lopez', 'Torres', 'Castro', 'Santos', 'Vega', 'Medina', 'Morales', 'Flores', 'Nava', 'Rojas']
const positions = ['P', 'C', '1B', '2B', 'SS', 'CF']
const playerNumbers = [3, 8, 15, 24]

function slugify(value: string) {
  return value.toLowerCase().replaceAll(' ', '-')
}

function createPlayers(seedIndex: number, branch: (typeof TeamBranch)[keyof typeof TeamBranch]) {
  const firstNames = branch === TeamBranch.FEMENIL ? femaleFirstNames : maleFirstNames

  return playerNumbers.map((number, playerIndex) => ({
    firstName: firstNames[(seedIndex + playerIndex) % firstNames.length],
    lastName: lastNames[(seedIndex * 2 + playerIndex) % lastNames.length],
    number,
    position: positions[(seedIndex + playerIndex) % positions.length],
    bats: playerIndex === 1 ? BattingSide.LEFT : playerIndex === 3 ? BattingSide.SWITCH : BattingSide.RIGHT,
    throws: playerIndex === 1 ? ThrowingArm.LEFT : ThrowingArm.RIGHT
  }))
}

const teamSeeds = teamBlueprints.flatMap((group, groupIndex) =>
  group.teams.map(([name, shortName], teamIndex) => {
    const seedIndex = groupIndex * 3 + teamIndex

    return {
      name,
      shortName,
      slug: slugify(name),
      category: group.category,
      branch: group.branch,
      primaryColor: primaryColors[seedIndex % primaryColors.length],
      secondaryColor: secondaryColors[seedIndex % secondaryColors.length],
      managerName: managerNames[seedIndex % managerNames.length],
      players: createPlayers(seedIndex, group.branch)
    }
  })
)

const fieldSeeds = [
  { name: 'Campo 1', address: 'Unidad Deportiva Municipal', notes: 'Campo principal' },
  { name: 'Campo 2', address: 'Unidad Deportiva Municipal', notes: 'Campo secundario' },
  { name: 'Campo 3', address: 'Unidad Deportiva Municipal', notes: 'Campo de apoyo' }
]

async function upsertSeedGame(input: {
  seasonId: string
  homeTeamId: string
  awayTeamId: string
  fieldId: string
  round: number
  scheduledAt: Date
  status: (typeof GameStatus)[keyof typeof GameStatus]
  notes?: string
  result?: {
    homeScore: number
    awayScore: number
    innings?: number
    recordedById: string
  }
}) {
  assertValidGameSlot(input.scheduledAt)

  const existingGame = await prisma.game.findFirst({
    where: {
      seasonId: input.seasonId,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: input.scheduledAt
    }
  })

  const gameData = {
    seasonId: input.seasonId,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    fieldId: input.fieldId,
    round: input.round,
    scheduledAt: input.scheduledAt,
    status: input.status,
    notes: input.notes
  }

  const game = existingGame
    ? await prisma.game.update({ where: { id: existingGame.id }, data: gameData })
    : await prisma.game.create({ data: gameData })

  if (input.result) {
    await prisma.gameResult.upsert({
      where: { gameId: game.id },
      update: {
        homeScore: input.result.homeScore,
        awayScore: input.result.awayScore,
        innings: input.result.innings,
        recordedById: input.result.recordedById
      },
      create: {
        gameId: game.id,
        homeScore: input.result.homeScore,
        awayScore: input.result.awayScore,
        innings: input.result.innings,
        recordedById: input.result.recordedById
      }
    })
  } else {
    await prisma.gameResult.deleteMany({ where: { gameId: game.id } })
  }

  return game
}

async function main() {
  const adminPasswordHash = await hashPassword('Admin123!')
  const userPasswordHash = await hashPassword('Usuario123!')

  const admin = await prisma.user.upsert({
    where: { email: 'admin@diamondpanel.app' },
    update: {
      name: 'DiamondPanel Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN
    },
    create: {
      email: 'admin@diamondpanel.app',
      passwordHash: adminPasswordHash,
      name: 'DiamondPanel Admin',
      role: UserRole.ADMIN
    }
  })

  await prisma.user.upsert({
    where: { email: 'usuario@diamondpanel.app' },
    update: {
      name: 'Usuario Demo',
      passwordHash: userPasswordHash,
      role: UserRole.USER
    },
    create: {
      email: 'usuario@diamondpanel.app',
      passwordHash: userPasswordHash,
      name: 'Usuario Demo',
      role: UserRole.USER
    }
  })

  const season = await prisma.season.upsert({
    where: {
      name_year: {
        name: 'Temporada Primavera',
        year: 2026
      }
    },
    update: {
      startsAt: toDate('2026-03-01T08:00:00-08:00'),
      endsAt: toDate('2026-06-30T20:00:00-07:00'),
      status: SeasonStatus.ACTIVE
    },
    create: {
      name: 'Temporada Primavera',
      year: 2026,
      startsAt: toDate('2026-03-01T08:00:00-08:00'),
      endsAt: toDate('2026-06-30T20:00:00-07:00'),
      status: SeasonStatus.ACTIVE
    }
  })

  const teams = await Promise.all(
    teamSeeds.map(({ players: _players, ...team }) =>
      prisma.team.upsert({
        where: { slug: team.slug },
        update: team,
        create: team
      })
    )
  )

  const teamBySlug = new Map(teams.map(team => [team.slug, team]))

  await Promise.all(
    teams.map(team =>
      prisma.teamSeason.upsert({
        where: {
          seasonId_teamId: {
            seasonId: season.id,
            teamId: team.id
          }
        },
        update: {},
        create: {
          seasonId: season.id,
          teamId: team.id
        }
      })
    )
  )

  await prisma.player.deleteMany({
    where: {
      teamId: {
        in: teams.map(team => team.id)
      }
    }
  })

  for (const teamSeed of teamSeeds) {
    const team = teamBySlug.get(teamSeed.slug)

    if (!team) {
      throw new Error(`Missing seeded team: ${teamSeed.slug}`)
    }

    for (const player of teamSeed.players) {
      await prisma.player.upsert({
        where: {
          teamId_number: {
            teamId: team.id,
            number: player.number
          }
        },
        update: {
          firstName: player.firstName,
          lastName: player.lastName,
          position: player.position,
          bats: player.bats,
          throws: player.throws
        },
        create: {
          teamId: team.id,
          ...player
        }
      })
    }
  }

  const fields = await Promise.all(
    fieldSeeds.map(field =>
      prisma.field.upsert({
        where: { name: field.name },
        update: {
          address: field.address,
          notes: field.notes,
          isActive: true
        },
        create: field
      })
    )
  )

  const fieldByName = new Map(fields.map(field => [field.name, field]))

  const getTeam = (slug: string) => {
    const team = teamBySlug.get(slug)

    if (!team) {
      throw new Error(`Missing team: ${slug}`)
    }

    return team
  }

  const getField = (name: string) => {
    const field = fieldByName.get(name)

    if (!field) {
      throw new Error(`Missing field: ${name}`)
    }

    return field
  }

  await prisma.gameResult.deleteMany({ where: { game: { seasonId: season.id } } })
  await prisma.game.deleteMany({ where: { seasonId: season.id } })

  if (teamBlueprints.length !== teamCategories.length * 2) {
    throw new Error('Every category must have varonil and femenil teams.')
  }

  const scheduleDays = [
    { date: '2026-03-06', offset: '-08:00', hours: [19, 21] },
    { date: '2026-03-07', offset: '-08:00', hours: [10, 12, 14, 16] },
    { date: '2026-03-08', offset: '-07:00', hours: [10, 12] },
    { date: '2026-03-13', offset: '-07:00', hours: [19, 21] },
    { date: '2026-03-14', offset: '-07:00', hours: [10, 12, 14, 16] },
    { date: '2026-03-15', offset: '-07:00', hours: [10, 12] },
    { date: '2026-03-20', offset: '-07:00', hours: [19, 21] },
    { date: '2026-03-21', offset: '-07:00', hours: [10, 12, 14, 16] },
    { date: '2026-03-22', offset: '-07:00', hours: [10, 12] },
    { date: '2026-03-27', offset: '-07:00', hours: [19, 21] },
    { date: '2026-03-28', offset: '-07:00', hours: [10, 12, 14, 16] },
    { date: '2026-03-29', offset: '-07:00', hours: [10, 12] },
    { date: '2026-04-03', offset: '-07:00', hours: [19, 21] },
    { date: '2026-04-04', offset: '-07:00', hours: [10, 12, 14, 16] },
    { date: '2026-04-05', offset: '-07:00', hours: [10, 12] }
  ]

  const gameSlots = scheduleDays.flatMap((day, dayIndex) =>
    day.hours.map((hour, hourIndex) => ({
      scheduledAt: toDate(`${day.date}T${hour.toString().padStart(2, '0')}:00:00${day.offset}`),
      field: fieldSeeds[(dayIndex + hourIndex) % fieldSeeds.length].name
    }))
  )
  const divisionGroups = teamBlueprints.map(group => group.teams.map(([name]) => slugify(name)))
  const resultSlots = gameSlots.slice(0, divisionGroups.length)
  const upcomingSlots = gameSlots.slice(divisionGroups.length)
  const gameSeeds = divisionGroups.flatMap((divisionTeams, groupIndex) => {
    const finalSlot = resultSlots[groupIndex]
    const firstUpcomingSlot = upcomingSlots[groupIndex * 2]
    const secondUpcomingSlot = upcomingSlots[groupIndex * 2 + 1]
    const homeScore = 5 + ((groupIndex * 2) % 8)
    const awayScore = homeScore === 3 + (groupIndex % 7)
      ? 4 + (groupIndex % 7)
      : 3 + (groupIndex % 7)
    const firstUpcomingStatus = groupIndex % 4 === 0 ? GameStatus.POSTPONED : GameStatus.SCHEDULED

    if (!finalSlot || !firstUpcomingSlot || !secondUpcomingSlot) {
      throw new Error('Not enough valid schedule slots for seeded games.')
    }

    return [
      {
        round: 1,
        scheduledAt: finalSlot.scheduledAt,
        field: finalSlot.field,
        home: divisionTeams[0],
        away: divisionTeams[1],
        status: GameStatus.FINAL,
        result: { homeScore, awayScore, innings: 7 }
      },
      {
        round: 2,
        scheduledAt: firstUpcomingSlot.scheduledAt,
        field: firstUpcomingSlot.field,
        home: divisionTeams[1],
        away: divisionTeams[2],
        status: firstUpcomingStatus,
        notes: firstUpcomingStatus === GameStatus.POSTPONED
          ? 'Pendiente de reprogramar por disponibilidad de campo'
          : undefined
      },
      {
        round: 3,
        scheduledAt: secondUpcomingSlot.scheduledAt,
        field: secondUpcomingSlot.field,
        home: divisionTeams[2],
        away: divisionTeams[0],
        status: GameStatus.SCHEDULED
      }
    ]
  })

  for (const game of gameSeeds) {
    await upsertSeedGame({
      seasonId: season.id,
      homeTeamId: getTeam(game.home).id,
      awayTeamId: getTeam(game.away).id,
      fieldId: getField(game.field).id,
      round: game.round,
      scheduledAt: game.scheduledAt,
      status: game.status,
      notes: game.notes,
      result: game.result
        ? {
            ...game.result,
            recordedById: admin.id
          }
        : undefined
    })
  }

  const [userCount, teamCount, playerCount, fieldCount, gameCount, resultCount] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.player.count(),
    prisma.field.count(),
    prisma.game.count(),
    prisma.gameResult.count()
  ])

  console.log('Seed completed:')
  console.log(`- Users: ${userCount}`)
  console.log(`- Teams: ${teamCount}`)
  console.log(`- Players: ${playerCount}`)
  console.log(`- Fields: ${fieldCount}`)
  console.log(`- Games: ${gameCount}`)
  console.log(`- Results: ${resultCount}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
