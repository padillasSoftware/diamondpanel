import type { TeamBranch, TeamCategory } from '~/utils/league'

export type AuthUser = {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'USER'
  managedTeamId: string | null
  managedTeam: {
    id: string
    name: string
    slug: string
    category: TeamCategory
    branch: TeamBranch
  } | null
}

type SessionResponse = {
  user: AuthUser | null
}

type LoginInput = {
  email: string
  password: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const initialized = useState('auth:initialized', () => false)
  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isTeamManager = computed(() => Boolean(user.value?.managedTeamId))

  const fetchSession = async () => {
    const fetcher = import.meta.server ? useRequestFetch() : $fetch
    const session = await fetcher<SessionResponse>('/api/auth/session')

    user.value = session.user
    initialized.value = true

    return session.user
  }

  const login = async (input: LoginInput) => {
    const session = await $fetch<SessionResponse>('/api/auth/login', {
      method: 'POST',
      body: input
    })

    user.value = session.user
    initialized.value = true

    return session.user
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })

    user.value = null
    initialized.value = true
  }

  return {
    user,
    initialized,
    isAuthenticated,
    isAdmin,
    isTeamManager,
    fetchSession,
    login,
    logout
  }
}
