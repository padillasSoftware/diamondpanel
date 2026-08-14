import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../server/generated/prisma/client.ts'
import {
  BattingSide,
  GameStatus,
  SeasonStatus,
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

const teamSeeds = [
  {
    name: 'Tigres',
    shortName: 'TR',
    slug: 'tigres',
    primaryColor: '#047857',
    secondaryColor: '#f97316',
    managerName: 'Carlos Martinez',
    players: [
      { firstName: 'Miguel', lastName: 'Ramirez', number: 7, position: 'SS', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Jose', lastName: 'Gomez', number: 12, position: 'LF', bats: BattingSide.LEFT, throws: ThrowingArm.LEFT },
      { firstName: 'Carlos', lastName: 'Lopez', number: 23, position: '1B', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Andres', lastName: 'Torres', number: 30, position: 'C', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT }
    ]
  },
  {
    name: 'Aguilas',
    shortName: 'AG',
    slug: 'aguilas',
    primaryColor: '#f97316',
    secondaryColor: '#0f172a',
    managerName: 'Luis Rivera',
    players: [
      { firstName: 'Daniel', lastName: 'Castro', number: 4, position: 'CF', bats: BattingSide.LEFT, throws: ThrowingArm.RIGHT },
      { firstName: 'Marco', lastName: 'Santos', number: 9, position: 'P', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Hector', lastName: 'Vega', number: 18, position: '3B', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Raul', lastName: 'Medina', number: 27, position: 'RF', bats: BattingSide.SWITCH, throws: ThrowingArm.RIGHT }
    ]
  },
  {
    name: 'Leones',
    shortName: 'LE',
    slug: 'leones',
    primaryColor: '#dc2626',
    secondaryColor: '#facc15',
    managerName: 'Pedro Garcia',
    players: [
      { firstName: 'Oscar', lastName: 'Morales', number: 2, position: '2B', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Ivan', lastName: 'Flores', number: 11, position: 'P', bats: BattingSide.LEFT, throws: ThrowingArm.LEFT },
      { firstName: 'Ruben', lastName: 'Nava', number: 21, position: 'C', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Adrian', lastName: 'Rojas', number: 34, position: '1B', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT }
    ]
  },
  {
    name: 'Halcones',
    shortName: 'HA',
    slug: 'halcones',
    primaryColor: '#2563eb',
    secondaryColor: '#f8fafc',
    managerName: 'Juan Perez',
    players: [
      { firstName: 'Sergio', lastName: 'Molina', number: 5, position: 'SS', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Alberto', lastName: 'Reyes', number: 14, position: 'LF', bats: BattingSide.LEFT, throws: ThrowingArm.LEFT },
      { firstName: 'Victor', lastName: 'Ortega', number: 24, position: 'P', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Emilio', lastName: 'Cruz', number: 33, position: 'RF', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT }
    ]
  },
  {
    name: 'Toros',
    shortName: 'TO',
    slug: 'toros',
    primaryColor: '#991b1b',
    secondaryColor: '#111827',
    managerName: 'Miguel Alvarez',
    players: [
      { firstName: 'Jorge', lastName: 'Herrera', number: 3, position: '3B', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Manuel', lastName: 'Silva', number: 10, position: 'CF', bats: BattingSide.LEFT, throws: ThrowingArm.RIGHT },
      { firstName: 'Felipe', lastName: 'Ibarra', number: 19, position: 'P', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Arturo', lastName: 'Campos', number: 28, position: '1B', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT }
    ]
  },
  {
    name: 'Panteras',
    shortName: 'PA',
    slug: 'panteras',
    primaryColor: '#7c3aed',
    secondaryColor: '#f59e0b',
    managerName: 'Roberto Sanchez',
    players: [
      { firstName: 'Ricardo', lastName: 'Fuentes', number: 6, position: '2B', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Ernesto', lastName: 'Diaz', number: 15, position: 'C', bats: BattingSide.RIGHT, throws: ThrowingArm.RIGHT },
      { firstName: 'Mario', lastName: 'Salazar', number: 22, position: 'P', bats: BattingSide.LEFT, throws: ThrowingArm.LEFT },
      { firstName: 'Tomas', lastName: 'Luna', number: 31, position: 'RF', bats: BattingSide.SWITCH, throws: ThrowingArm.RIGHT }
    ]
  }
]

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

  const gameSeeds = [
    {
      round: 1,
      scheduledAt: toDate('2026-03-07T09:00:00-08:00'),
      field: 'Campo 1',
      home: 'tigres',
      away: 'aguilas',
      status: GameStatus.FINAL,
      result: { homeScore: 10, awayScore: 2, innings: 7 }
    },
    {
      round: 1,
      scheduledAt: toDate('2026-03-07T10:30:00-08:00'),
      field: 'Campo 2',
      home: 'leones',
      away: 'panteras',
      status: GameStatus.FINAL,
      result: { homeScore: 6, awayScore: 1, innings: 7 }
    },
    {
      round: 1,
      scheduledAt: toDate('2026-03-07T12:00:00-08:00'),
      field: 'Campo 1',
      home: 'halcones',
      away: 'toros',
      status: GameStatus.FINAL,
      result: { homeScore: 4, awayScore: 8, innings: 7 }
    },
    {
      round: 2,
      scheduledAt: toDate('2026-03-14T09:00:00-08:00'),
      field: 'Campo 2',
      home: 'tigres',
      away: 'halcones',
      status: GameStatus.FINAL,
      result: { homeScore: 8, awayScore: 3, innings: 7 }
    },
    {
      round: 2,
      scheduledAt: toDate('2026-03-14T10:30:00-08:00'),
      field: 'Campo 1',
      home: 'aguilas',
      away: 'leones',
      status: GameStatus.FINAL,
      result: { homeScore: 6, awayScore: 1, innings: 7 }
    },
    {
      round: 2,
      scheduledAt: toDate('2026-03-14T12:00:00-08:00'),
      field: 'Campo 2',
      home: 'panteras',
      away: 'toros',
      status: GameStatus.FINAL,
      result: { homeScore: 3, awayScore: 7, innings: 7 }
    },
    {
      round: 3,
      scheduledAt: toDate('2026-03-21T09:00:00-07:00'),
      field: 'Campo 1',
      home: 'toros',
      away: 'tigres',
      status: GameStatus.SCHEDULED
    },
    {
      round: 3,
      scheduledAt: toDate('2026-03-21T10:30:00-07:00'),
      field: 'Campo 2',
      home: 'panteras',
      away: 'aguilas',
      status: GameStatus.SCHEDULED
    },
    {
      round: 3,
      scheduledAt: toDate('2026-03-21T12:00:00-07:00'),
      field: 'Campo 3',
      home: 'leones',
      away: 'halcones',
      status: GameStatus.POSTPONED,
      notes: 'Pendiente de reprogramar por disponibilidad de campo'
    },
    {
      round: 4,
      scheduledAt: toDate('2026-03-28T09:00:00-07:00'),
      field: 'Campo 2',
      home: 'tigres',
      away: 'panteras',
      status: GameStatus.SCHEDULED
    },
    {
      round: 4,
      scheduledAt: toDate('2026-03-28T10:30:00-07:00'),
      field: 'Campo 1',
      home: 'aguilas',
      away: 'halcones',
      status: GameStatus.SCHEDULED
    },
    {
      round: 4,
      scheduledAt: toDate('2026-03-28T12:00:00-07:00'),
      field: 'Campo 3',
      home: 'toros',
      away: 'leones',
      status: GameStatus.SCHEDULED
    }
  ]

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
