import { createHash, randomBytes } from 'node:crypto'

export const passwordResetMaxAgeMinutes = 30

export function createPasswordResetToken() {
  return randomBytes(32).toString('base64url')
}

export function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function getPasswordResetExpiresAt() {
  return new Date(Date.now() + passwordResetMaxAgeMinutes * 60 * 1000)
}
