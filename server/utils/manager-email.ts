import { emailService } from '../services/email/email.service'

export type ManagerWelcomeNotification = {
  to: string
  name: string
  loginUrl: string
  temporaryPassword: string
  teamName: string
}

export async function sendManagerWelcomeNotification(payload: ManagerWelcomeNotification | null) {
  if (!payload) return

  try {
    await emailService.sendWelcomeManagerEmail(payload)
  } catch (error) {
    console.error('[MANAGER WELCOME EMAIL FAILED]', error)
  }
}
