import type { ToolDefinition } from './define-tool.js'
import { draftInvite } from './draft-invite.js'
import { findCommonFreeSlots } from './find-common-free-slots.js'
import { getFriends } from './get-friends.js'
import { findDish } from './find-dish.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { listRestaurants } from './list-restaurants.js'
import { sendInvite } from './send-invite.js'

/** Every tool the MCP server exposes. Add new tools here. */
export const tools = [
  getMySchedule,
  listRestaurants,
  getMenu,
  getLibraryOccupancy,
  getFriends,
  findCommonFreeSlots,
  findDish,
  draftInvite,
  sendInvite,
] as ToolDefinition[]
