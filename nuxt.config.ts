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
