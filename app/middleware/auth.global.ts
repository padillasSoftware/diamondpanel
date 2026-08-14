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
})
