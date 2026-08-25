import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../server/generated/prisma/client.ts'
import { UserRole } from '../server/generated/prisma/enums.ts'
import { hashPassword } from '../server/utils/password.ts'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed admin users.')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

const adminSeeds = [
  {
    name: 'Ismael Sanchez',
    email: 'ismaelsanchezg24@gmail.com',
    password: 'Softball2026!'
  },
  {
    name: 'Ivy Dozal',
    email: 'ivyjarely@gmail.com',
    password: 'Softball2026!'
  },
  {
    name: 'Alejandro Carmona',
    email: 'polaca_1416@hotmail.com',
    password: 'Softball2026!'
  },
  {
    name: 'Missael Padilla',
    email: 'lmpadillar@gmail.com',
    password: 'Softball2026!'
  }
] as const

async function main() {
  const admins = []

  for (const adminSeed of adminSeeds) {
    const passwordHash = await hashPassword(adminSeed.password)
    const admin = await prisma.user.upsert({
      where: { email: adminSeed.email.toLowerCase() },
      update: {
        name: adminSeed.name,
        passwordHash,
        role: UserRole.ADMIN,
        managedTeamId: null,
        mustChangePassword: true
      },
      create: {
        email: adminSeed.email.toLowerCase(),
        name: adminSeed.name,
        passwordHash,
        role: UserRole.ADMIN,
        mustChangePassword: true
      },
      select: {
        email: true,
        name: true,
        role: true
      }
    })

    admins.push(admin)
  }

  console.log('Admin seed completed:')

  for (const admin of admins) {
    console.log(`- ${admin.name} <${admin.email}> (${admin.role})`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
