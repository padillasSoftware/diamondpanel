import { GameStatus } from '../../../generated/prisma/enums'
import { prisma } from '../../../utils/db'
import {
  adminResultGameSelect,
  buildResultPayload,
  getActiveSeasonForResults
} from '../../../utils/results'
import { requireAdmin } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const gameId = getRouterParam(event, 'gameId')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game id is required'
    })
  }

  const body = await readBody<Record<string, unknown>>(event)

  return prisma.$transaction(async (tx) => {
    const season = await getActiveSeasonForResults(tx)

    if (!season) {
      throw createError({
        statusCode: 409,
        statusMessage: 'An active season is required'
      })
    }

    const game = await tx.game.findFirst({
      where: {
        id: gameId,
        seasonId: season.id
      },
      select: {
        id: true,
        status: true,
        homeTeamId: true,
        awayTeamId: true,
        result: {
          select: {
            id: true,
            recordedAt: true
          }
        }
      }
    })

    if (!game) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Game not found'
      })
    }

    assertOfflineResultHasNotChanged(body, game.result)

    const payload = buildResultPayload(body, game)
    const result = await tx.gameResult.upsert({
      where: {
        gameId: game.id
      },
      update: {
        ...payload.result,
        recordedById: user.id,
        recordedAt: new Date()
      },
      create: {
        gameId: game.id,
        ...payload.result,
        recordedById: user.id
      },
      select: {
        id: true
      }
    })

    await tx.gameBattingHighlight.deleteMany({
      where: {
        gameResultId: result.id
      }
    })

    if (payload.highlights.length) {
      await tx.gameBattingHighlight.createMany({
        data: payload.highlights.map(highlight => ({
          gameResultId: result.id,
          teamId: highlight.teamId,
          playerId: highlight.playerId,
          playerName: highlight.playerName,
          side: highlight.side,
          order: highlight.order,
          atBats: highlight.atBats,
          hits: highlight.hits,
          homeRuns: highlight.homeRuns
        }))
      })
    }

    await tx.game.update({
      where: {
        id: game.id
      },
      data: {
        status: GameStatus.FINAL
      }
    })

    return tx.game.findUniqueOrThrow({
      where: {
        id: game.id
      },
      select: adminResultGameSelect
    })
  })
})

function assertOfflineResultHasNotChanged(
  body: Record<string, unknown>,
  currentResult: { id: string, recordedAt: Date } | null
) {
  const expected = readOfflineExpectedResult(body.offlineExpectedResult)

  if (expected === undefined) return

  if (!expected.id && currentResult) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Este juego ya tiene un resultado en el servidor. Revisa el partido antes de sincronizar.'
    })
  }

  if (expected.id && !currentResult) {
    throw createError({
      statusCode: 409,
      statusMessage: 'El resultado del servidor cambió. Revisa el partido antes de sincronizar.'
    })
  }

  if (!expected.id || !currentResult) return

  if (expected.id !== currentResult.id || expected.recordedAt !== currentResult.recordedAt.toISOString()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'El resultado fue modificado en otro dispositivo. Revisa el partido antes de sincronizar.'
    })
  }
}

function readOfflineExpectedResult(value: unknown) {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object') return undefined

  const expected = value as { id?: unknown, recordedAt?: unknown }
  const id = typeof expected.id === 'string' && expected.id.trim() ? expected.id : null
  const recordedAt = typeof expected.recordedAt === 'string' && expected.recordedAt.trim()
    ? expected.recordedAt
    : null

  return { id, recordedAt }
}
