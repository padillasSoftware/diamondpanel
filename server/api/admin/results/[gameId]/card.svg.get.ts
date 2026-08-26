import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { GameStatus } from '../../../../generated/prisma/enums'
import { prisma } from '../../../../utils/db'
import { getActiveSeasonForResults } from '../../../../utils/results'
import { requireAdmin } from '../../../../utils/session'
import type { H3Event } from 'h3'

type CardTeam = {
  id: string
  name: string
  logoUrl: string | null
  category: string
  branch: string
}

type CardHighlight = {
  side: 'WINNER' | 'LOSER'
  order: number
  playerName: string
  atBats: number
  hits: number
  homeRuns: number
}

const cardWidth = 1080
const cardHeight = 1350
const resultCardFontPublicPath = 'result-card/fonts/public-sans-heavy.woff2'
let resultCardFontCssPromise: Promise<string> | null = null

const cardTeamSelect = {
  id: true,
  name: true,
  logoUrl: true,
  category: true,
  branch: true
} as const

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const gameId = getResultCardGameId(event)
  const { svg, filename } = await loadResultCardSvg(event, gameId)

  event.node.res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
  event.node.res.setHeader('Cache-Control', 'no-store')
  event.node.res.setHeader('Content-Disposition', `inline; filename="${filename}.svg"`)

  return svg
})

export function getResultCardGameId(event: H3Event) {
  const gameId = getRouterParam(event, 'gameId')

  if (gameId) return gameId

  throw createError({
    statusCode: 400,
    statusMessage: 'Game id is required'
  })
}

export async function loadResultCardSvg(event: H3Event, gameId: string) {
  const season = await getActiveSeasonForResults(prisma)

  if (!season) {
    throw createError({
      statusCode: 409,
      statusMessage: 'An active season is required'
    })
  }

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      seasonId: season.id,
      status: GameStatus.FINAL,
      result: {
        isNot: null
      }
    },
    select: {
      id: true,
      round: true,
      scheduledAt: true,
      field: {
        select: {
          name: true
        }
      },
      homeTeam: {
        select: cardTeamSelect
      },
      awayTeam: {
        select: cardTeamSelect
      },
      result: {
        select: {
          homeScore: true,
          awayScore: true,
          innings: true,
          isForfeit: true,
          winningPitcherName: true,
          losingPitcherName: true,
          battingHighlights: {
            orderBy: [
              { side: 'asc' },
              { order: 'asc' }
            ],
            select: {
              side: true,
              order: true,
              playerName: true,
              atBats: true,
              hits: true,
              homeRuns: true
            }
          }
        }
      }
    }
  })

  if (!game?.result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Final result not found'
    })
  }

  const runtimeConfig = useRuntimeConfig(event)
  const leagueName = String(runtimeConfig.public.leagueName || 'Liga de Softball')
  const league = await prisma.leagueSettings.findUnique({
    where: { id: 'default' },
    select: {
      primaryLogoUrl: true,
      secondaryLogoUrl: true
    }
  })
  const primaryLogoUrl = league?.primaryLogoUrl || String(runtimeConfig.public.leagueLogoUrl || '')
  const secondaryLogoUrl = league?.secondaryLogoUrl || ''
  const fontFaceCss = await loadResultCardFontCss()
  const svg = buildResultCardSvg({
    fontFaceCss,
    leagueName,
    primaryLogoUrl,
    secondaryLogoUrl,
    seasonName: season.name,
    seasonYear: season.year,
    game: {
      ...game,
      result: game.result
    }
  })
  const filename = slugify(`${leagueName}-${game.homeTeam.name}-vs-${game.awayTeam.name}`)

  return {
    filename,
    svg
  }
}

function buildResultCardSvg(input: {
  fontFaceCss: string
  leagueName: string
  primaryLogoUrl: string
  secondaryLogoUrl: string
  seasonName: string
  seasonYear: number
  game: {
    round: number | null
    scheduledAt: Date
    field: { name: string } | null
    homeTeam: CardTeam
    awayTeam: CardTeam
    result: {
      homeScore: number
      awayScore: number
      innings: number | null
      isForfeit: boolean
      winningPitcherName: string | null
      losingPitcherName: string | null
      battingHighlights: CardHighlight[]
    }
  }
}) {
  const { game } = input
  const homeWins = game.result.homeScore >= game.result.awayScore
  const leftTeam = homeWins ? game.homeTeam : game.awayTeam
  const rightTeam = homeWins ? game.awayTeam : game.homeTeam
  const leftScore = homeWins ? game.result.homeScore : game.result.awayScore
  const rightScore = homeWins ? game.result.awayScore : game.result.homeScore
  const winnerHighlights = game.result.battingHighlights.filter(highlight => highlight.side === 'WINNER').slice(0, 3)
  const loserHighlights = game.result.battingHighlights.filter(highlight => highlight.side === 'LOSER').slice(0, 3)
  const headlineLineOne = 'RESULTADO DE'
  const headlineLineTwo = 'JUEGO'
  const roundText = game.round ? `JORNADA ${game.round}` : upper(`${input.seasonName} ${input.seasonYear}`)
  const theme = branchTheme(leftTeam.branch)
  const branchLogoUrl = getBranchLogoUrl(input, leftTeam.branch)
  const battersSectionSvg = game.result.isForfeit
    ? ''
    : battersSection(winnerHighlights, loserHighlights, theme)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(input.leagueName)} - Resultado final</title>
  <desc id="desc">${escapeXml(leftTeam.name)} ${leftScore} contra ${escapeXml(rightTeam.name)} ${rightScore}</desc>
  <defs>
    <filter id="headlineShadow" x="-15%" y="-20%" width="130%" height="140%">
      <feDropShadow dx="0" dy="7" stdDeviation="2" flood-color="#000000" flood-opacity="0.9"/>
    </filter>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
    <filter id="scoreNeon" x="-35%" y="-35%" width="170%" height="170%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#fff0f3" flood-opacity="0.95"/>
      <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="${theme.accent}" flood-opacity="0.72"/>
      <feDropShadow dx="0" dy="0" stdDeviation="20" flood-color="${theme.accent}" flood-opacity="0.38"/>
      <feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
    <filter id="logoShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="14" stdDeviation="7" flood-color="#000000" flood-opacity="0.72"/>
    </filter>
    <style>
      ${input.fontFaceCss}
      .impact { font-family: 'DiamondPanelPoster', 'Arial Black', sans-serif; font-weight: 900; letter-spacing: 0; }
      .body { font-family: 'DiamondPanelPoster', Arial, Helvetica, sans-serif; font-weight: 900; letter-spacing: 0; }
      .brush { font-family: 'DiamondPanelPoster', 'Arial Black', Arial, sans-serif; font-weight: 900; font-style: italic; letter-spacing: 0; }
      .small { font-family: 'DiamondPanelPoster', Arial, Helvetica, sans-serif; font-weight: 800; letter-spacing: 0; }
    </style>
  </defs>

  <rect width="${cardWidth}" height="${cardHeight}" fill="#050807"/>
  ${batterBackground(theme)}

  <g filter="url(#headlineShadow)">
    <text x="62" y="92" text-anchor="start" class="impact" font-size="64" fill="${theme.headline}" stroke="#060606" stroke-width="5" paint-order="stroke">${escapeXml(headlineLineOne)}</text>
    <text x="62" y="210" text-anchor="start" class="impact" font-size="${fitFont(headlineLineTwo, 535, 142, 86)}" fill="${theme.headline}" stroke="#050505" stroke-width="7" paint-order="stroke">${escapeXml(headlineLineTwo)}</text>
    <text x="150" y="280" text-anchor="start" class="impact" font-size="55" fill="#ffffff" stroke="#050505" stroke-width="6" paint-order="stroke">${escapeXml(roundText)}</text>
    ${leagueMark(input.leagueName, branchLogoUrl, 895, 152, true, 224)}
    <text x="73" y="410" text-anchor="start" class="body" font-size="48" fill="#ffffff" stroke="#050505" stroke-width="9" paint-order="stroke">MARCADOR FINAL</text>
  </g>

  <g filter="url(#scoreNeon)">
    <text x="73" y="638" text-anchor="start" class="impact" font-size="${fitFont(`${leftScore}-${rightScore}`, 462, 180, 110)}" fill="#ffffff" stroke="#050505" stroke-width="12" paint-order="stroke">${leftScore}-${rightScore}</text>
  </g>

  <g filter="url(#headlineShadow)">
    ${teamIdentityBlock(leftTeam, 285, 794, theme)}
    ${teamIdentityBlock(rightTeam, 805, 794, theme)}
    <path d="M518 722 L584 686 L555 766 L610 744 L504 880 L538 784 L484 812 Z" fill="${theme.accent}" stroke="#080808" stroke-width="7" stroke-linejoin="round"/>
    <text x="545" y="830" text-anchor="middle" class="impact" font-size="92" fill="${theme.accent}" stroke="#050505" stroke-width="10" paint-order="stroke">VS</text>
  </g>

  <g filter="url(#headlineShadow)">
    ${pitcherBlock('PG:', game.result.winningPitcherName, 280, 985, theme.accent)}
    ${pitcherBlock('PD:', game.result.losingPitcherName, 800, 985, theme.accent)}
  </g>

  ${battersSectionSvg}

  <g filter="url(#softShadow)">
    <rect x="250" y="1288" width="580" height="36" rx="18" fill="#070f0b" opacity="0.72"/>
    <text x="540" y="1312" text-anchor="middle" class="small" font-size="17" fill="#ffffff">Generado por DiamondPanel</text>
  </g>
</svg>`
}

function teamIdentityBlock(team: CardTeam, x: number, y: number, theme: CardTheme) {
  const logoUrl = team.logoUrl?.trim()

  if (logoUrl) {
    return `
    <g filter="url(#logoShadow)">
      <image href="${escapeXml(logoUrl)}" x="${x - 165}" y="${y - 112}" width="330" height="224" preserveAspectRatio="xMidYMid meet"/>
    </g>`
  }

  const name = upper(team.name)

  return `
    <g>
      <rect x="${x - 176}" y="${y - 86}" width="352" height="142" rx="14" fill="#050807" opacity="0.68" stroke="${theme.accent}" stroke-opacity="0.45"/>
      <text x="${x}" y="${y}" text-anchor="middle" class="impact" font-size="${fitFont(name, 324, 50, 28)}" fill="#ffffff" stroke="#050505" stroke-width="7" paint-order="stroke">${escapeXml(name)}</text>
    </g>`
}

function pitcherBlock(label: string, pitcherName: string | null, x: number, y: number, accent: string) {
  const name = displayValue(pitcherName)

  return `
    <g>
      <text x="${x}" y="${y}" text-anchor="middle" class="impact" font-size="38" fill="${accent}" stroke="#040404" stroke-width="7" paint-order="stroke">${label} <tspan fill="#ffffff">${escapeXml(name)}</tspan></text>
    </g>`
}

function battersSection(
  winnerHighlights: CardHighlight[],
  loserHighlights: CardHighlight[],
  theme: CardTheme
) {
  return `
  <g filter="url(#headlineShadow)">
    <text x="268" y="1076" text-anchor="middle" class="impact" font-size="44" fill="${theme.accent}" stroke="#050505" stroke-width="8" paint-order="stroke">MEJORES BATS:</text>
    <text x="802" y="1076" text-anchor="middle" class="impact" font-size="44" fill="${theme.accent}" stroke="#050505" stroke-width="8" paint-order="stroke">MEJORES BATS:</text>
    ${batterLines(winnerHighlights, 268, 1135, 460)}
    ${batterLines(loserHighlights, 802, 1135, 460)}
  </g>`
}

function batterLines(highlights: CardHighlight[], x: number, startY: number, maxWidth: number) {
  const lines = highlights.length
    ? highlights.map(highlight => batterLineText(highlight))
    : ['~']

  return lines.map((line, index) => {
    const y = startY + index * 58

    return `<text x="${x}" y="${y}" text-anchor="middle" class="impact" font-size="${fitFont(line, maxWidth, 38, 22)}" fill="#ffffff" stroke="#050505" stroke-width="6" paint-order="stroke">${escapeXml(line)}</text>`
  }).join('\n')
}

function batterLineText(highlight: CardHighlight) {
  const playerName = displayValue(highlight.playerName)

  if (playerName === '~') return playerName

  const homeRunText = highlight.homeRuns > 0
    ? ` ${highlight.homeRuns > 1 ? `${highlight.homeRuns} HR` : 'HR'}`
    : ''

  return `${playerName} ${highlight.hits}-${highlight.atBats}${homeRunText}`
}

function displayValue(value: string | null) {
  const cleanValue = value?.trim()

  if (!cleanValue || cleanValue.toLocaleLowerCase('es-MX') === 'sin captura') return '~'

  return upper(cleanValue)
}

type CardTheme = {
  accent: string
  backgroundUrl: string
  headline: string
}

function branchTheme(branch: string): CardTheme {
  if (branch === 'FEMENIL') {
    return {
      accent: '#ff66c8',
      backgroundUrl: '/result-card/background-femenil.png',
      headline: '#ffffff'
    }
  }

  return {
    accent: '#f1e82c',
    backgroundUrl: '/result-card/background-varonil.png',
    headline: '#f1e82c'
  }
}

function batterBackground(theme: CardTheme) {
  return `
  <image href="${theme.backgroundUrl}" x="0" y="0" width="${cardWidth}" height="${cardHeight}" preserveAspectRatio="xMidYMid slice"/>`
}

function getBranchLogoUrl(
  input: {
    primaryLogoUrl: string
    secondaryLogoUrl: string
  },
  branch: string
) {
  if (branch === 'FEMENIL') {
    return input.secondaryLogoUrl || input.primaryLogoUrl
  }

  return input.primaryLogoUrl || input.secondaryLogoUrl
}

function leagueMark(
  leagueName: string,
  logoUrl: string,
  x: number,
  y: number,
  allowFallback: boolean,
  size = 156
) {
  if (logoUrl) {
    return `
    <image href="${escapeXml(logoUrl)}" x="${x - (size / 2)}" y="${y - (size / 2)}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`
  }

  if (!allowFallback) return ''

  const mark = leagueMarkText(leagueName)
  const radius = size / 2
  const innerRadius = Math.max(radius - 20, 18)
  const fontSize = fitFont(mark, Math.max(size - 58, 60), Math.min(54, size * 0.26), 22)

  return `
  <g transform="translate(${x - radius} ${y - radius})">
    <circle cx="${radius}" cy="${radius}" r="${radius - 5}" fill="#f7f3df" stroke="#ffe15d" stroke-width="7"/>
    <circle cx="${radius}" cy="${radius}" r="${innerRadius}" fill="#fff8d2" stroke="#0b6b45" stroke-width="3"/>
    <path d="M${radius - 38} ${radius - 46} C${radius - 12} ${radius - 18} ${radius - 12} ${radius + 18} ${radius - 38} ${radius + 46}" fill="none" stroke="#d71920" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 10" opacity="0.82"/>
    <path d="M${radius + 38} ${radius - 46} C${radius + 12} ${radius - 18} ${radius + 12} ${radius + 18} ${radius + 38} ${radius + 46}" fill="none" stroke="#d71920" stroke-width="5" stroke-linecap="round" stroke-dasharray="6 10" opacity="0.82"/>
    <text x="${radius}" y="${radius + (fontSize / 3)}" text-anchor="middle" class="impact" font-size="${fontSize}" fill="#0b6b45">${escapeXml(mark)}</text>
  </g>`
}

function leagueMarkText(value: string) {
  const cleanValue = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/gi, '')
    .trim()
  const words = cleanValue.split(/\s+/).filter(Boolean)

  if (words.length === 1) {
    return words[0]?.slice(0, 4).toUpperCase() || 'DP'
  }

  return words.slice(0, 4).map(word => word[0] ?? '').join('').toUpperCase() || 'DP'
}

function loadResultCardFontCss() {
  resultCardFontCssPromise ??= loadResultCardFontCssOnce()

  return resultCardFontCssPromise
}

async function loadResultCardFontCssOnce() {
  const font = await readResultCardFont()

  if (!font) return ''

  return `
      @font-face {
        font-family: 'DiamondPanelPoster';
        src: url('data:font/woff2;base64,${font.toString('base64')}') format('woff2');
        font-weight: 400 900;
        font-style: normal;
      }
      @font-face {
        font-family: 'DiamondPanelPoster';
        src: url('data:font/woff2;base64,${font.toString('base64')}') format('woff2');
        font-weight: 400 900;
        font-style: italic;
      }`
}

async function readResultCardFont() {
  const candidates = [
    join(process.cwd(), 'public', resultCardFontPublicPath),
    join(process.cwd(), '.output', 'public', resultCardFontPublicPath),
    join(process.cwd(), '..', 'public', resultCardFontPublicPath)
  ]

  for (const candidate of candidates) {
    try {
      return await readFile(candidate)
    } catch {
      // Continue with the next runtime asset location.
    }
  }

  return null
}

function fitFont(value: string, maxWidth: number, baseSize: number, minSize: number) {
  const estimatedWidth = value.length * baseSize * 0.58

  if (estimatedWidth <= maxWidth) return baseSize

  return Math.max(minSize, Math.floor(maxWidth / Math.max(value.length * 0.58, 1)))
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 90) || 'resultado'
}

function upper(value: string) {
  return value.toLocaleUpperCase('es-MX')
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
