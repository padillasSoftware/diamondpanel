import {
  TEAM_CATEGORY_OPTIONS,
  TEAM_CATEGORY_VALUES,
  type TeamCategory
} from '~/utils/league'

type LeagueCategorySetting = {
  category: TeamCategory
  active: boolean
}

type LeagueCategoriesResponse = {
  categories: LeagueCategorySetting[]
  activeCategories: TeamCategory[]
}

export function useLeagueCategories() {
  const { data, pending, refresh } = useFetch<LeagueCategoriesResponse>('/api/league/categories', {
    key: 'league-categories'
  })

  const activeCategories = computed<TeamCategory[]>(() => {
    if (data.value) return data.value.activeCategories

    return TEAM_CATEGORY_VALUES
  })
  const categoryOptions = computed(() =>
    TEAM_CATEGORY_OPTIONS.filter(
      (option): option is { label: string, value: TeamCategory } =>
        option.value !== 'ALL' && activeCategories.value.includes(option.value)
    )
  )
  const categoryOptionsWithAll = computed(() => [
    { label: 'Todas', value: 'ALL' as const },
    ...categoryOptions.value
  ])
  const firstActiveCategory = computed<TeamCategory>(() => categoryOptions.value[0]?.value ?? 'A')

  function isCategoryActive(category: TeamCategory) {
    return activeCategories.value.includes(category)
  }

  return {
    activeCategories,
    categoryOptions,
    categoryOptionsWithAll,
    firstActiveCategory,
    isCategoryActive,
    pending,
    refresh
  }
}
