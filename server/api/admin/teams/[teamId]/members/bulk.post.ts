import { PlayerStatus, TeamMemberRole } from '../../../../../generated/prisma/enums'
import { assertLeagueCategoryActive } from '../../../../../utils/categories'
import { prisma } from '../../../../../utils/db'
import { requireAdmin } from '../../../../../utils/session'
import {
  adminTeamMemberSelect,
  buildMemberCreateData,
  getMaxPlayersPerTeam
} from '../../../../../utils/team-members'
import { cleanOptionalText } from '../../../../../utils/validation'

const maxBulkPlayers = 50

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const teamId = getRouterParam(event, 'teamId')

  if (!teamId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Team id is required'
    })
  }

  const body = await readBody<Record<string, unknown>>(event)
  const members = cleanBulkMembers(body, teamId)

  try {
    const created = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          category: true
        }
      })

      if (!team) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Team not found'
        })
      }

      await assertLeagueCategoryActive(tx, team.category)

      const [maxPlayers, activePlayers] = await Promise.all([
        getMaxPlayersPerTeam(tx),
        tx.player.count({
          where: {
            teamId: team.id,
            memberRole: TeamMemberRole.PLAYER,
            status: PlayerStatus.ACTIVE
          }
        })
      ])
      const availableSlots = Math.max(maxPlayers - activePlayers, 0)

      if (members.length > availableSlots) {
        throw createError({
          statusCode: 409,
          statusMessage: `Solo quedan ${availableSlots} lugares disponibles para jugadores activos.`
        })
      }

      const createdMembers = []

      for (const member of members) {
        createdMembers.push(await tx.player.create({
          data: member,
          select: adminTeamMemberSelect
        }))
      }

      return createdMembers
    })

    return {
      count: created.length,
      members: created
    }
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Uno de los números ya está usado por otro integrante de este equipo'
      })
    }

    throw error
  }
})

function cleanBulkMembers(body: Record<string, unknown>, teamId: string) {
  const value = body.members

  if (!Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Members must be a list'
    })
  }

  if (!value.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Agrega al menos un jugador.'
    })
  }

  if (value.length > maxBulkPlayers) {
    throw createError({
      statusCode: 400,
      statusMessage: `Puedes agregar máximo ${maxBulkPlayers} jugadores por carga.`
    })
  }

  return value.map((item, index) => {
    const row = typeof item === 'object' && item ? item as Record<string, unknown> : {}
    const firstName = cleanOptionalText(row.firstName, 80)
    const lastName = cleanOptionalText(row.lastName, 80)

    if (!firstName || !lastName) {
      throw createError({
        statusCode: 400,
        statusMessage: `Fila ${index + 1}: nombre y apellido son obligatorios.`
      })
    }

    return buildMemberCreateData({
      firstName,
      lastName,
      memberRole: TeamMemberRole.PLAYER,
      status: PlayerStatus.ACTIVE,
      number: null,
      position: null,
      curp: null,
      birthDate: null
    }, teamId)
  })
}
