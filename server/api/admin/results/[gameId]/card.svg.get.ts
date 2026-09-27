import { GameStatus } from '../../../../generated/prisma/enums'
import { prisma } from '../../../../utils/db'
import { getActiveSeasonForResults } from '../../../../utils/results'
import { resultCardFontBase64 } from '../../../../utils/result-card-font-data'
import { resultCardTextPath } from '../../../../utils/result-card-text'
import { requireAdmin } from '../../../../utils/session'
import { create } from 'fontkitten'
import type { H3Event } from 'h3'
import type { Font, Glyph } from 'fontkitten'

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
const scoreFill = '#43BDF2'
const teamNameFill = '#D7FF3F'
const statTextFill = '#FFFFFF'
const sportsOrangeFill = '#FF6817'

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
      status: {
        not: GameStatus.CANCELLED
      },
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
          winningReliefPitcherName: true,
          losingReliefPitcherName: true,
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
  const svg = buildResultCardSvg({
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
      winningReliefPitcherName: string | null
      losingReliefPitcherName: string | null
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
  const roundText = game.round ? String(game.round) : upper(`${input.seasonName} ${input.seasonYear}`)
  const scoreText = `${leftScore}-${rightScore}`
  const theme = branchTheme(leftTeam.branch)
  const battersSectionSvg = game.result.isForfeit
    ? ''
    : battersSection(winnerHighlights, loserHighlights)
  const pitchersSectionSvg = game.result.isForfeit
    ? ''
    : `
  <g filter="url(#headlineShadow)">
    ${pitcherColumn(game.result.winningPitcherName, game.result.winningReliefPitcherName, 92, 998, 340)}
    ${pitcherColumn(game.result.losingPitcherName, game.result.losingReliefPitcherName, 745, 998, 300)}
  </g>`
  const forfeitNoticeSvg = game.result.isForfeit
    ? `
  <g filter="url(#headlineShadow)">
    ${posterText('RESULTADO POR FORFEIT', 275, 356, 34, theme.score, '#050505', 6, 'middle')}
  </g>`
    : ''

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
  </defs>

  <rect width="${cardWidth}" height="${cardHeight}" fill="#050807"/>
  ${batterBackground(theme)}

  <g filter="url(#headlineShadow)">
    ${game.round
      ? sportsTextBlock(roundText, 390, 313, 96, 46, 34, sportsOrangeFill)
      : ''}
    ${forfeitNoticeSvg}
  </g>

  ${scoreTextBlock(scoreText, 68, 642, 360)}

  <g filter="url(#headlineShadow)">
    ${teamIdentityBlock(leftTeam, { logoX: 260, textX: 48, y: 858, maxWidth: 390, anchor: 'start' }, theme)}
    ${teamIdentityBlock(rightTeam, { logoX: 824, textX: 660, y: 858, maxWidth: 390, anchor: 'start' }, theme)}
  </g>

  ${pitchersSectionSvg}

  ${battersSectionSvg}

  <g filter="url(#softShadow)">
    ${posterText('Generado por DiamondPanel', 540, 1312, 17, '#ffffff', undefined, undefined, 'middle')}
  </g>
</svg>`
}

let sportsFont: Font | null = null

function scoreTextBlock(text: string, x: number, y: number, maxWidth: number) {
  const fontSize = fitSportsFont(text, maxWidth, 178, 106)
  const path = sportsTextPath(text, x, y, fontSize)

  return `
  <g>
    <path d="${path}" fill="${scoreFill}" stroke="#050505" stroke-width="26" stroke-linejoin="miter" paint-order="stroke"/>
    <path d="${path}" fill="${scoreFill}" stroke="#ffffff" stroke-width="8" stroke-linejoin="miter" paint-order="stroke"/>
    <path d="${path}" fill="${scoreFill}"/>
  </g>`
}

function sportsTextBlock(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  baseSize: number,
  minSize: number,
  fill: string,
  stroke?: string,
  strokeWidth = 0,
  anchor: 'start' | 'middle' | 'end' = 'start'
) {
  const fontSize = fitSportsFont(text, maxWidth, baseSize, minSize)
  const path = sportsTextPath(text, x, y, fontSize, anchor)
  const strokeAttrs = stroke && strokeWidth > 0
    ? ` stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="miter" paint-order="stroke"`
    : ''

  return `<path d="${path}" fill="${fill}"${strokeAttrs}/>`
}

function fitSportsFont(text: string, maxWidth: number, baseSize: number, minSize: number) {
  let fontSize = baseSize

  while (fontSize > minSize && sportsTextWidth(text, fontSize) > maxWidth) {
    fontSize -= 1
  }

  return fontSize
}

function sportsTextPath(text: string, x: number, y: number, fontSize: number, anchor: 'start' | 'middle' | 'end' = 'start') {
  const font = getSportsFont()
  const printableText = sportsTextForFont(font, text)
  const scale = fontSize / font.unitsPerEm
  const width = sportsTextWidth(text, fontSize)
  const paths: string[] = []
  let cursorX = anchoredTextStartX(x, width, anchor)

  for (const glyph of sportsGlyphsForText(font, printableText)) {
    const path = glyph.path
      .scale(scale)
      .transform(1, 0, 0, -1, cursorX, y)
      .toSVG()

    if (path) paths.push(path)

    cursorX += glyph.advanceWidth * scale
  }

  return paths.join('')
}

function sportsTextWidth(text: string, fontSize: number) {
  const font = getSportsFont()
  const printableText = sportsTextForFont(font, text)
  const scale = fontSize / font.unitsPerEm

  return sportsGlyphsForText(font, printableText).reduce((width, glyph) => width + glyph.advanceWidth * scale, 0)
}

function getSportsFont() {
  sportsFont ??= create(loadSportsFontBuffer()) as Font

  return sportsFont
}

function loadSportsFontBuffer() {
  return Buffer.from(resultCardFontBase64, 'base64')
}

function sportsGlyphsForText(font: Font, text: string) {
  return font.glyphsForString(text) as Glyph[]
}

function sportsTextForFont(font: Font, text: string) {
  const fallback = font.hasGlyphForCodePoint('?'.codePointAt(0) ?? 0) ? '?' : ' '
  const cleanText = text.trim() ? text.normalize('NFC') : '~'

  return Array.from(cleanText)
    .map((character) => {
      const codePoint = character.codePointAt(0)

      return codePoint && font.hasGlyphForCodePoint(codePoint) ? character : fallback
    })
    .join('')
}

function anchoredTextStartX(x: number, width: number, anchor: 'start' | 'middle' | 'end') {
  if (anchor === 'middle') return x - width / 2
  if (anchor === 'end') return x - width

  return x
}

type TeamIdentityLayout = {
  logoX: number
  textX: number
  y: number
  maxWidth: number
  anchor: 'start' | 'middle' | 'end'
}

function teamIdentityBlock(team: CardTeam, layout: TeamIdentityLayout, theme: CardTheme) {
  const logoUrl = team.logoUrl?.trim()

  if (logoUrl) {
    return `
    <g filter="url(#logoShadow)">
      <image href="${escapeXml(logoUrl)}" x="${layout.logoX - 165}" y="${layout.y - 112}" width="330" height="224" preserveAspectRatio="xMidYMid meet"/>
    </g>`
  }

  const name = upper(team.name)

  return `
    <g>
      ${sportsTextBlock(name, layout.textX, layout.y, layout.maxWidth, 58, 34, theme.teamName, '#050505', 10, layout.anchor)}
    </g>`
}

function pitcherColumn(pitcherName: string | null, reliefPitcherName: string | null, x: number, y: number, maxWidth: number) {
  const pitcherNameText = posterDisplayValue(pitcherName)
  const reliefPitcherNameText = posterDisplayValue(reliefPitcherName)

  return `
    <g>
      ${sportsTextBlock(pitcherNameText, x, y, maxWidth, 40, 22, statTextFill, '#050505', 7)}
      ${sportsTextBlock(reliefPitcherNameText, x, y + 42, maxWidth, 40, 22, statTextFill, '#050505', 7)}
    </g>`
}

function battersSection(
  winnerHighlights: CardHighlight[],
  loserHighlights: CardHighlight[]
) {
  return `
  <g filter="url(#headlineShadow)">
    ${batterLines(winnerHighlights, 268, 1190, 470)}
    ${batterLines(loserHighlights, 802, 1190, 470)}
  </g>`
}

function batterLines(highlights: CardHighlight[], x: number, startY: number, maxWidth: number) {
  const lines = highlights.length
    ? highlights.map(highlight => batterLineText(highlight))
    : ['-']

  return lines.map((line, index) => {
    const y = startY + index * 58

    return sportsTextBlock(line, x, y, maxWidth, 40, 22, statTextFill, '#050505', 7, 'middle')
  }).join('\n')
}

function batterLineText(highlight: CardHighlight) {
  const playerName = posterDisplayValue(highlight.playerName)

  if (playerName === '-') return playerName

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

function posterDisplayValue(value: string | null) {
  const cleanValue = displayValue(value)

  return cleanValue === '~' ? '-' : cleanValue
}

type CardTheme = {
  accent: string
  backgroundUrl: string
  orange: string
  score: string
  teamName: string
}

function branchTheme(branch: string): CardTheme {
  if (branch === 'FEMENIL') {
    return {
      accent: '#ff66c8',
      backgroundUrl: '/result-card/background-template.png',
      orange: '#ff7a1a',
      score: '#42c7ff',
      teamName: teamNameFill
    }
  }

  return {
    accent: '#f1e82c',
    backgroundUrl: '/result-card/background-template.png',
    orange: '#ff7a1a',
    score: '#42c7ff',
    teamName: teamNameFill
  }
}

function batterBackground(theme: CardTheme) {
  return `
  <image href="${theme.backgroundUrl}" x="0" y="0" width="${cardWidth}" height="${cardHeight}" preserveAspectRatio="xMidYMid slice"/>`
}

function posterText(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  stroke?: string,
  strokeWidth?: number,
  anchor: 'start' | 'middle' | 'end' = 'start'
) {
  return resultCardTextPath({
    text,
    x,
    y,
    fontSize,
    fill,
    anchor,
    stroke,
    strokeWidth,
    paintOrder: stroke ? 'stroke' : undefined
  })
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
