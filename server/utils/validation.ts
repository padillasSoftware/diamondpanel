type EnumRecord = Record<string, string>

export function cleanOptionalText(value: unknown, maxLength = 120) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed ? trimmed.slice(0, maxLength) : null
}

export function cleanRequiredText(value: unknown, field: string, maxLength = 120) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is required`
    })
  }

  return value.trim().slice(0, maxLength)
}

export function cleanHexColor(value: unknown) {
  const color = cleanOptionalText(value, 16)

  if (!color) return null

  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Color must use #RRGGBB format'
    })
  }

  return color.toUpperCase()
}

export function cleanNumber(value: unknown, options: { min?: number, max?: number, field?: string } = {}) {
  const { min = 0, max = 999, field = 'Number' } = options

  if (value === null || value === undefined || value === '') return null
  const number = Number(value)

  if (!Number.isInteger(number) || number < min || number > max) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} must be between ${min} and ${max}`
    })
  }

  return number
}

export function cleanEnum<T extends EnumRecord>(enumObject: T, value: unknown, field: string) {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toUpperCase()
  const values = Object.values(enumObject)

  if (!values.includes(normalized)) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is invalid`
    })
  }

  return normalized as T[keyof T]
}

export function cleanOptionalDate(value: unknown, field: string) {
  if (value === null || value === undefined || value === '') return null

  const dateValue = typeof value === 'string' ? value : ''
  const parsedDate = new Date(dateValue)

  if (!dateValue || Number.isNaN(parsedDate.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is invalid`
    })
  }

  return parsedDate
}

export function cleanRequiredDate(value: unknown, field: string) {
  const date = cleanOptionalDate(value, field)

  if (!date) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is required`
    })
  }

  return date
}
