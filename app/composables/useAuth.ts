import type { TeamBranch, TeamCategory } from '~/utils/league'

export type AuthManagedTeam = {
  id: string
  name: string
  slug: string
  category: TeamCategory
  branch: TeamBranch
}

export type AuthUser = {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'USER'
  managedTeamId: string | null
  managedTeam: AuthManagedTeam | null
  managedTeams: AuthManagedTeam[]
  activeTeamId: string | null
  activeTeam: AuthManagedTeam | null
  mustChangePassword: boolean
}

type SessionResponse = {
  user: AuthUser | null
}

type LoginInput = {
  email: string
  password: string
}

type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const initialized = useState('auth:initialized', () => false)
  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isTeamManager = computed(() => user.value?.role !== 'ADMIN' && Boolean(user.value?.managedTeams.length))

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

  const changePassword = async (input: ChangePasswordInput) => {
    const session = await $fetch<SessionResponse>('/api/auth/change-password', {
      method: 'POST',
      body: input
    })

    user.value = session.user

    return session.user
  }

  return {
    user,
    initialized,
    isAuthenticated,
    isAdmin,
    isTeamManager,
    fetchSession,
    login,
    logout,
    changePassword
  }
}
