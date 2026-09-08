export default defineNuxtRouteMiddleware(async (to) => {
  const { user, initialized, fetchSession } = useAuth()

  if (!initialized.value) {
    await fetchSession().catch(() => null)
  }

  if (to.path === '/login') {
    if (!user.value) return

    const redirect = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
      ? to.query.redirect
      : '/admin'

    return navigateTo(user.value.role === 'ADMIN' ? getAdminLoginTarget(redirect) : '/')
  }

  if (!user.value) {
    if (to.path === '/' || to.path === '/reset-password') return

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
  if (path === '/mi-perfil' || path === '/reset-password' || path === '/admin' || path.startsWith('/admin/')) return null
  if (path === '/posiciones') return '/admin/posiciones'
  if (path === '/rol') return '/admin/rol'
  if (path === '/resultados') return '/admin/resultados'
  if (path === '/elegibles') return '/admin/elegibles'
  if (path === '/equipos' || path.startsWith('/equipos/')) return '/admin/equipos'
  if (path === '/mi-equipo') return '/admin/equipos'

  return '/admin'
}

function getAdminLoginTarget(path: string) {
  if (path === '/mi-perfil') return path
  if (path === '/admin' || path.startsWith('/admin/')) return path

  return getAdminTarget(path) ?? '/admin'
}
