export function getLimitFromQuery(value: unknown, fallback = 10, max = 50) {
  const rawValue = Array.isArray(value) ? value[0] : value
  const parsedValue = Number(rawValue)

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallback
  }

  return Math.min(parsedValue, max)
}

export function getStringFromQuery(value: unknown) {
  const rawValue = Array.isArray(value) ? value[0] : value

  return typeof rawValue === 'string' && rawValue.trim() ? rawValue.trim() : undefined
}
