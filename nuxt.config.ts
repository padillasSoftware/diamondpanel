// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  ui: {
    fonts: false
  },

  runtimeConfig: {
    authSecret: process.env.AUTH_SECRET,
    managerTempPassword: process.env.MANAGER_TEMP_PASSWORD || 'Softball2026!',
    appUrl: process.env.APP_URL,
    emailDisabled: process.env.EMAIL_DISABLED,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpSecure: process.env.SMTP_SECURE,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFromName: process.env.SMTP_FROM_NAME,
    smtpFromEmail: process.env.SMTP_FROM_EMAIL,
    public: {
      leagueName: process.env.NUXT_PUBLIC_LEAGUE_NAME || 'Liga de Softball',
      leagueLogoUrl: process.env.NUXT_PUBLIC_LEAGUE_LOGO_URL || ''
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
