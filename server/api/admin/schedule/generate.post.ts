import { GameStatus } from '../../../generated/prisma/enums'
import type { TeamBranch as TeamBranchValue, TeamCategory as TeamCategoryValue } from '../../../generated/prisma/enums'
import { prisma } from '../../../utils/db'
import { getActiveCategories } from '../../../utils/categories'
import { requireAdmin } from '../../../utils/session'
import {
  addLeagueDays,
  cleanScheduleConfigRows,
  cleanScheduleRound,
  createLeagueDateTime,
  getActiveSeasonForSchedule,
  getMaxPairGamesForGroup,
  getScheduleConfigs,
  getScheduleTeams,
  getSuggestedRound,
  getWeekRange
} from '../../../utils/schedule'

type GenerationTeam = {
  id: string
  name: string
  category: TeamCategoryValue
  branch: TeamBranchValue
}

type PlannedMatchup = {
  groupKey: string
  homeTeam: GenerationTeam
  awayTeam: GenerationTeam
  pairKey: string
  priority: number
}

type CancelledMatchupSeed = {
  homeTeamId: string
  awayTeamId: string
}

const weekendSlots = [
  { dayOffset: 4, hour: 19 },
  { dayOffset: 4, hour: 21 },
  { dayOffset: 5, hour: 10 },
  { dayOffset: 5, hour: 12 },
  { dayOffset: 5, hour: 14 },
  { dayOffset: 5, hour: 16 },
  { dayOffset: 5, hour: 18 },
  { dayOffset: 5, hour: 20 },
  { dayOffset: 5, hour: 22 },
  { dayOffset: 6, hour: 10 },
  { dayOffset: 6, hour: 12 },
  { dayOffset: 6, hour: 14 },
  { dayOffset: 6, hour: 16 },
  { dayOffset: 6, hour: 18 },
  { dayOffset: 6, hour: 20 },
  { dayOffset: 6, hour: 22 }
] as const

function groupKey(category: TeamCategoryValue, branch: TeamBranchValue) {
  return `${category}:${branch}`
}

function pairKey(leftTeamId: string, rightTeamId: string) {
  return [leftTeamId, rightTeamId].sort().join(':')
}

function slotKey(scheduledAt: Date, fieldId: string | null) {
  return `${scheduledAt.getTime()}:${fieldId ?? 'FIELDLESS'}`
}

function buildGenerationSlots(weekStart: string, fields: { id: string }[]) {
  const fieldIds = fields.length ? fields.map(field => field.id) : [null]

  return weekendSlots.flatMap((slot) => {
    const dateValue = addLeagueDays(weekStart, slot.dayOffset)
    const scheduledAt = createLeagueDateTime(dateValue, slot.hour)

    return fieldIds.map(fieldId => ({
      scheduledAt,
      fieldId
    }))
  })
}

function getRolesPerTurn(teamCount: number) {
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount
}

function rotateParticipants<T>(participants: (T | null)[]) {
  if (participants.length <= 2) return participants

  return [
    participants[0] ?? null,
    participants[participants.length - 1] ?? null,
    ...participants.slice(1, -1)
  ]
}

function buildRoundRobinPairs(teams: GenerationTeam[], round: number, turns: number) {
  const rolesPerTurn = getRolesPerTurn(teams.length)
  const totalRoles = rolesPerTurn * turns

  if (round > totalRoles) {
    return {
      rolesPerTurn,
      totalRoles,
      pairs: [] as { homeTeam: GenerationTeam, awayTeam: GenerationTeam }[]
    }
  }

  const turnIndex = Math.floor((round - 1) / rolesPerTurn)
  const roundIndex = (round - 1) % rolesPerTurn
  let participants: (GenerationTeam | null)[] = teams.length % 2 === 0
    ? [...teams]
    : [...teams, null]

  for (let index = 0; index < roundIndex; index += 1) {
    participants = rotateParticipants(participants)
  }

  const pairs: { homeTeam: GenerationTeam, awayTeam: GenerationTeam }[] = []

  for (let index = 0; index < participants.length / 2; index += 1) {
    const leftTeam = participants[index]
    const rightTeam = participants[participants.length - 1 - index]

    if (!leftTeam || !rightTeam) continue

    let homeTeam = leftTeam
    let awayTeam = rightTeam

    if ((roundIndex + index) % 2 === 1) {
      homeTeam = rightTeam
      awayTeam = leftTeam
    }

    if (turnIndex % 2 === 1) {
      const nextHomeTeam = awayTeam
      awayTeam = homeTeam
      homeTeam = nextHomeTeam
    }

    pairs.push({ homeTeam, awayTeam })
  }

  return {
    rolesPerTurn,
    totalRoles,
    pairs
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<Record<string, unknown>>(event)
  const weekRange = getWeekRange(body.weekStart)
  const configRows = body.configs === undefined ? null : cleanScheduleConfigRows(body.configs)

  return prisma.$transaction(async (tx) => {
    const season = await getActiveSeasonForSchedule(tx)
    const activeCategories = await getActiveCategories(tx)
    const activeCategorySet = new Set(activeCategories)
    const activeCategoryFilter = { in: activeCategories }

    if (configRows) {
      for (const row of configRows) {
        if (!activeCategorySet.has(row.category)) {
          throw createError({
            statusCode: 409,
            statusMessage: `La categoría ${row.category} está desactivada. Actívala en Ajustes para usarla.`
          })
        }

        const currentMaxPairGames = await getMaxPairGamesForGroup({
          prisma: tx,
          seasonId: season.id,
          category: row.category,
          branch: row.branch
        })

        if (row.rounds < currentMaxPairGames) {
          throw createError({
            statusCode: 409,
            statusMessage: `No puedes bajar ${row.category} ${row.branch} a ${row.rounds}; ya hay cruces programados ${currentMaxPairGames} vez/veces.`
          })
        }

        await tx.scheduleRoundConfig.upsert({
          where: {
            seasonId_category_branch: {
              seasonId: season.id,
              category: row.category,
              branch: row.branch
            }
          },
          update: {
            rounds: row.rounds
          },
          create: {
            seasonId: season.id,
            category: row.category,
            branch: row.branch,
            rounds: row.rounds
          }
        })
      }
    }

    const [teams, fields, configs, weekGames, seasonGames] = await Promise.all([
      getScheduleTeams(tx, season.id),
      tx.field.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true }
      }),
      getScheduleConfigs(tx, season.id),
      tx.game.findMany({
        where: {
          seasonId: season.id,
          scheduledAt: {
            gte: weekRange.startsAt,
            lt: weekRange.endsAt
          },
          homeTeam: {
            is: {
              category: activeCategoryFilter
            }
          },
          awayTeam: {
            is: {
              category: activeCategoryFilter
            }
          }
        },
        select: {
          round: true,
          scheduledAt: true,
          fieldId: true,
          homeTeamId: true,
          awayTeamId: true,
          status: true
        }
      }),
      tx.game.findMany({
        where: {
          seasonId: season.id,
          homeTeam: {
            is: {
              category: activeCategoryFilter
            }
          },
          awayTeam: {
            is: {
              category: activeCategoryFilter
            }
          }
        },
        select: {
          round: true,
          scheduledAt: true,
          fieldId: true,
          homeTeamId: true,
          awayTeamId: true,
          status: true
        }
      })
    ])

    const latestRound = seasonGames.reduce((highestRound, game) => Math.max(highestRound, game.round ?? 0), 0)
    const round = cleanScheduleRound(body.round, getSuggestedRound(weekGames, latestRound))
    const teamsByGroup = new Map<string, GenerationTeam[]>()
    const configByGroup = new Map(configs.map(config => [groupKey(config.category, config.branch), config.rounds]))
    const usedTeamIds = new Set<string>()
    const occupiedSlots = new Set<string>()
    const pairCounts = new Map<string, number>()
    const existingRoundPairs = new Set<string>()
    const plannedPairKeys = new Set<string>()
    const cancelledPairSeeds = new Map<string, CancelledMatchupSeed>()

    for (const team of teams) {
      const key = groupKey(team.category, team.branch)
      const groupTeams = teamsByGroup.get(key) ?? []

      groupTeams.push(team)
      teamsByGroup.set(key, groupTeams)
    }

    for (const game of seasonGames) {
      const currentPairKey = pairKey(game.homeTeamId, game.awayTeamId)

      if (game.status === GameStatus.CANCELLED) {
        if (!cancelledPairSeeds.has(currentPairKey)) {
          cancelledPairSeeds.set(currentPairKey, {
            homeTeamId: game.homeTeamId,
            awayTeamId: game.awayTeamId
          })
        }

        continue
      }

      pairCounts.set(currentPairKey, (pairCounts.get(currentPairKey) ?? 0) + 1)

      if (game.round === round) {
        existingRoundPairs.add(currentPairKey)
      }
    }

    for (const game of weekGames) {
      if (game.status === GameStatus.CANCELLED) continue

      usedTeamIds.add(game.homeTeamId)
      usedTeamIds.add(game.awayTeamId)
      occupiedSlots.add(slotKey(game.scheduledAt, game.fieldId))
    }

    const groups = [...teamsByGroup.entries()]
      .map(([key, groupTeams]) => ({
        key,
        teams: groupTeams,
        turns: configByGroup.get(key) ?? 1
      }))
      .filter(group => group.teams.length > 1)
    const plannedMatchups: PlannedMatchup[] = []
    let groupsOutsideConfiguredTurns = 0
    let groupsAlreadyGenerated = 0

    for (const group of groups) {
      const roundRobin = buildRoundRobinPairs(group.teams, round, group.turns)
      let groupPlannedMatchups = 0

      if (!roundRobin.pairs.length) {
        groupsOutsideConfiguredTurns += 1
      } else {
        for (const pair of roundRobin.pairs) {
          const currentPairKey = pairKey(pair.homeTeam.id, pair.awayTeam.id)

          if (existingRoundPairs.has(currentPairKey)) continue
          if (plannedPairKeys.has(currentPairKey)) continue
          if ((pairCounts.get(currentPairKey) ?? 0) >= group.turns) continue

          plannedMatchups.push({
            groupKey: group.key,
            homeTeam: pair.homeTeam,
            awayTeam: pair.awayTeam,
            pairKey: currentPairKey,
            priority: 0
          })
          plannedPairKeys.add(currentPairKey)
          groupPlannedMatchups += 1
        }
      }

      for (const [currentPairKey, seed] of cancelledPairSeeds) {
        const homeTeam = group.teams.find(team => team.id === seed.homeTeamId)
        const awayTeam = group.teams.find(team => team.id === seed.awayTeamId)

        if (!homeTeam || !awayTeam) continue
        if (existingRoundPairs.has(currentPairKey)) continue
        if (plannedPairKeys.has(currentPairKey)) continue
        if ((pairCounts.get(currentPairKey) ?? 0) >= group.turns) continue

        plannedMatchups.push({
          groupKey: group.key,
          homeTeam,
          awayTeam,
          pairKey: currentPairKey,
          priority: 1
        })
        plannedPairKeys.add(currentPairKey)
        groupPlannedMatchups += 1
      }

      if (!groupPlannedMatchups) {
        groupsAlreadyGenerated += 1
      }
    }

    if (!groups.length) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Necesitas al menos dos equipos activos en una categoría/rama para generar rol.'
      })
    }

    if (!plannedMatchups.length) {
      const allGroupsOutside = groupsOutsideConfiguredTurns === groups.length
      const allGroupsGenerated = groupsAlreadyGenerated === groups.length

      throw createError({
        statusCode: 409,
        statusMessage: allGroupsOutside
          ? `El Rol #${round} queda fuera de las vueltas configuradas. Sube las vueltas para generar más roles.`
          : allGroupsGenerated
            ? `El Rol #${round} ya está generado para los grupos disponibles.`
            : `No hay cruces pendientes para el Rol #${round} con la configuración actual.`
      })
    }

    const slots = buildGenerationSlots(weekRange.weekStart, fields)
    const createdIds: string[] = []

    for (const matchup of plannedMatchups.sort((left, right) =>
      left.priority - right.priority
      || left.groupKey.localeCompare(right.groupKey)
      || left.homeTeam.name.localeCompare(right.homeTeam.name)
      || left.awayTeam.name.localeCompare(right.awayTeam.name)
    )) {
      if (usedTeamIds.has(matchup.homeTeam.id) || usedTeamIds.has(matchup.awayTeam.id)) continue

      const slot = slots.find(candidateSlot => !occupiedSlots.has(slotKey(candidateSlot.scheduledAt, candidateSlot.fieldId)))

      if (!slot) break

      const game = await tx.game.create({
        data: {
          seasonId: season.id,
          round,
          scheduledAt: slot.scheduledAt,
          fieldId: slot.fieldId,
          homeTeamId: matchup.homeTeam.id,
          awayTeamId: matchup.awayTeam.id,
          status: GameStatus.SCHEDULED,
          notes: 'Generado automáticamente'
        },
        select: {
          id: true
        }
      })

      createdIds.push(game.id)
      usedTeamIds.add(matchup.homeTeam.id)
      usedTeamIds.add(matchup.awayTeam.id)
      occupiedSlots.add(slotKey(slot.scheduledAt, slot.fieldId))
      pairCounts.set(matchup.pairKey, (pairCounts.get(matchup.pairKey) ?? 0) + 1)
      existingRoundPairs.add(matchup.pairKey)
    }

    if (!createdIds.length) {
      throw createError({
        statusCode: 409,
        statusMessage: `No pude colocar partidos del Rol #${round}. Revisa si esa semana ya tiene partidos, campos u horarios ocupados.`
      })
    }

    return {
      success: true,
      createdCount: createdIds.length,
      round
    }
  })
})
