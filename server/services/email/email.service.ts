import nodemailer from 'nodemailer'
import { resetPasswordTemplate, welcomeManagerTemplate } from './email.templates'
import type { ResetPasswordEmailPayload, SendEmailPayload, WelcomeManagerEmailPayload } from './email.types'

function getEmailConfig() {
  const config = useRuntimeConfig()
  const host = String(config.smtpHost || '').trim()
  const port = Number(config.smtpPort || 587)
  const user = String(config.smtpUser || '').trim()
  const pass = String(config.smtpPass || '')
  const fromEmail = String(config.smtpFromEmail || user).trim()
  const fromName = String(config.smtpFromName || config.public.leagueName || 'DiamondPanel').trim()
  const secure = String(config.smtpSecure || 'false') === 'true'
  const disabled = String(config.emailDisabled || '').toLowerCase() === 'true' || process.env.PLAYWRIGHT === 'true'

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromEmail,
    fromName,
    disabled,
    isConfigured: Boolean(host && user && pass && fromEmail)
  }
}

function assertEmailReady() {
  const config = getEmailConfig()

  if (config.disabled) {
    return { ...config, canSend: false, skippedReason: 'Email delivery is disabled' }
  }

  if (!config.isConfigured) {
    if (process.env.NODE_ENV === 'production') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Email service is not configured'
      })
    }

    return { ...config, canSend: false, skippedReason: 'SMTP is not configured' }
  }

  return { ...config, canSend: true, skippedReason: null }
}

export const emailService = {
  async send(payload: SendEmailPayload) {
    const config = assertEmailReady()

    if (!config.canSend) {
      console.log(`[EMAIL SKIPPED] ${config.skippedReason}`)

      return { sent: false, skippedReason: config.skippedReason }
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    })

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: Array.isArray(payload.to) ? payload.to.join(',') : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    })

    return { sent: true, skippedReason: null }
  },

  async sendResetPasswordEmail(payload: ResetPasswordEmailPayload) {
    return await this.send({
      to: payload.to,
      subject: 'Restablece tu contraseña',
      html: resetPasswordTemplate({
        name: payload.name,
        resetUrl: payload.resetUrl
      }),
      text: `Usa este enlace para restablecer tu contraseña: ${payload.resetUrl}`
    })
  },

  async sendWelcomeManagerEmail(payload: WelcomeManagerEmailPayload) {
    return await this.send({
      to: payload.to,
      subject: 'Tu acceso a DiamondPanel',
      html: welcomeManagerTemplate({
        name: payload.name,
        loginUrl: payload.loginUrl,
        temporaryPassword: payload.temporaryPassword,
        teamName: payload.teamName
      }),
      text: `Tu cuenta fue creada para administrar ${payload.teamName}. Ingresa en ${payload.loginUrl} con la contraseña temporal: ${payload.temporaryPassword}`
    })
  }
}
