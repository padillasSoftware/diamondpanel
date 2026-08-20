export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { user, initialized, fetchSession } = useAuth()

  if (!initialized.value) {
    await fetchSession().catch(() => null)
  }

  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }

  if (to.path !== '/mi-perfil' && user.value.mustChangePassword) {
    return navigateTo('/mi-perfil')
  }

  if (to.path !== '/sin-equipo' && user.value.role !== 'ADMIN' && !user.value.managedTeams.length) {
    return navigateTo('/sin-equipo')
  }
})
