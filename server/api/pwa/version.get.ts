export default defineEventHandler((event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const buildId = String(runtimeConfig.public.pwaBuildId || process.env.DEPLOY_ID || process.env.COMMIT_REF || 'local')

  setHeader(event, 'cache-control', 'no-cache, no-store, must-revalidate')
  setHeader(event, 'pragma', 'no-cache')
  setHeader(event, 'expires', '0')

  return {
    buildId,
    checkedAt: new Date().toISOString()
  }
})
