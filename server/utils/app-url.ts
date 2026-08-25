import type { H3Event } from 'h3'

export function getAppBaseUrl(event: H3Event) {
  const config = useRuntimeConfig(event)
  const configuredUrl = String(config.appUrl || '').trim()

  return configuredUrl || getRequestURL(event).origin
}

export function buildAppUrl(event: H3Event, path: string) {
  return new URL(path, getAppBaseUrl(event)).toString()
}
