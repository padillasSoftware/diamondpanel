import { prisma } from '../../utils/db'
import { getLeagueCategorySettings } from '../../utils/categories'
import { requireUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireUser(event)

  const categories = await getLeagueCategorySettings(prisma)

  return {
    categories,
    activeCategories: categories
      .filter(category => category.active)
      .map(category => category.category)
  }
})
