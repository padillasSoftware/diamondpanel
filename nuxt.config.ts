// https://nuxt.com/docs/api/configuration/nuxt-config
const pwaBuildId = [
  process.env.COMMIT_REF,
  process.env.DEPLOY_ID,
  process.env.BUILD_ID,
  process.env.NUXT_BUILD_ID
].find(Boolean) ?? `build-${Date.now()}`

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
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
    cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'diamondpanel',
    public: {
      leagueName: process.env.NUXT_PUBLIC_LEAGUE_NAME || 'Liga de Softball',
      leagueLogoUrl: process.env.NUXT_PUBLIC_LEAGUE_LOGO_URL || '',
      pwaBuildId
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
