import { getActiveSeasonOrThrow } from '../../services/league'
import { requireUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireUser(event)

  return getActiveSeasonOrThrow()
})
