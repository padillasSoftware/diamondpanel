import { getActiveSeasonOrThrow } from '../../services/league'

export default defineEventHandler(async () => {
  return getActiveSeasonOrThrow()
})
