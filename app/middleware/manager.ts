export default defineNuxtRouteMiddleware(async (to) => {
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

  if (user.value.role === 'ADMIN') {
    return navigateTo('/admin')
  }

  if (!user.value.managedTeams.length) {
    return navigateTo('/sin-equipo')
  }
})
