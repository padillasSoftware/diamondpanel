export type SendEmailPayload = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export type ResetPasswordEmailPayload = {
  to: string
  name: string
  resetUrl: string
}

export type WelcomeManagerEmailPayload = {
  to: string
  name: string
  loginUrl: string
  temporaryPassword: string
  teamName: string
}
