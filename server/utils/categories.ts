import { TeamCategory } from '../generated/prisma/enums'
import type { Prisma } from '../generated/prisma/client'
import { cleanEnum } from './validation'

export type TeamCategoryValue = (typeof TeamCategory)[keyof typeof TeamCategory]

export const leagueCategories = [
  TeamCategory.A,
  TeamCategory.B,
  TeamCategory.C,
  TeamCategory.D,
  TeamCategory.E,
  TeamCategory.R
] as const

export function cleanLeagueCategory(value: unknown, field = 'Category') {
  return cleanEnum(TeamCategory, value, field)
}

export function getCategoryFilter(category?: string) {
  const normalized = cleanLeagueCategory(category)

  return normalized ?? undefined
}

export function cleanLeagueCategorySettings(value: unknown) {
  if (!Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Categories must be a list'
    })
  }

  const seenCategories = new Set<TeamCategoryValue>()
  const settings = value.map((item) => {
    const row = typeof item === 'object' && item ? item as Record<string, unknown> : {}
    const category = cleanLeagueCategory(row.category)

    if (!category) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Each category setting needs a category'
      })
    }

    if (seenCategories.has(category)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Category settings cannot be duplicated'
      })
    }

    seenCategories.add(category)

    return {
      category,
      active: row.active !== false
    }
  })

  if (!settings.some(setting => setting.active)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one category must remain active'
    })
  }

  return settings
}

export async function getLeagueCategorySettings(prisma: Prisma.TransactionClient) {
  const storedSettings = await prisma.leagueCategorySetting.findMany({
    select: {
      category: true,
      active: true
    }
  })
  const settingsByCategory = new Map(storedSettings.map(setting => [setting.category, setting]))

  return leagueCategories.map(category => ({
    category,
    active: settingsByCategory.get(category)?.active ?? true
  }))
}

export async function getActiveCategories(prisma: Prisma.TransactionClient) {
  const settings = await getLeagueCategorySettings(prisma)

  return settings
    .filter(setting => setting.active)
    .map(setting => setting.category)
}

export async function assertLeagueCategoryActive(
  prisma: Prisma.TransactionClient,
  category: TeamCategoryValue
) {
  const activeCategories = await getActiveCategories(prisma)

  if (activeCategories.includes(category)) return

  throw createError({
    statusCode: 409,
    statusMessage: `La categoría ${category} está desactivada. Actívala en Ajustes para usarla.`
  })
}
