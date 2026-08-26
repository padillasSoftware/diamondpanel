export default defineEventHandler((event) => {
  const { public: { leagueName } } = useRuntimeConfig(event)
  const name = `${leagueName} | DiamondPanel`

  setHeader(event, 'content-type', 'application/manifest+json; charset=utf-8')

  return {
    id: '/',
    name,
    short_name: leagueName.length > 16 ? 'DiamondPanel' : leagueName,
    description: `Panel privado para la administracion de ${leagueName}.`,
    lang: 'es-MX',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    orientation: 'portrait',
    background_color: '#06130d',
    theme_color: '#ff9800',
    prefer_related_applications: false,
    categories: ['sports', 'productivity'],
    icons: [
      {
        src: '/pwa/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/pwa/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/pwa/maskable-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  }
})
