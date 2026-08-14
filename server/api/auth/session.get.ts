import { getCurrentUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  return {
    user: await getCurrentUser(event)
  }
})
