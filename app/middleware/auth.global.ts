export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { user, initialized, fetchSession } = useAuth()

  if (!initialized.value) {
    await fetchSession().catch(() => null)
  }

  if (!user.value) {
    if (to.path === '/') return

    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }

  if (to.path !== '/mi-perfil' && user.value.mustChangePassword) {
    return navigateTo('/mi-perfil')
  }

  if (user.value.role === 'ADMIN') {
    const adminTarget = getAdminTarget(to.path)

    if (adminTarget) {
      return navigateTo(adminTarget)
    }
  }

  if (to.path !== '/sin-equipo' && user.value.role !== 'ADMIN' && !user.value.managedTeams.length) {
    return navigateTo('/sin-equipo')
  }
})

function getAdminTarget(path: string) {
  if (path === '/mi-perfil' || path === '/admin' || path.startsWith('/admin/')) return null
  if (path === '/posiciones') return '/admin/posiciones'
  if (path === '/rol') return '/admin/rol'
  if (path === '/resultados') return '/admin/resultados'
  if (path === '/elegibles') return '/admin/elegibles'
  if (path === '/equipos' || path.startsWith('/equipos/')) return '/admin/equipos'
  if (path === '/mi-equipo') return '/admin/equipos'

  return '/admin'
}
