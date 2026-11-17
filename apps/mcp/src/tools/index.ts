import type { ToolDefinition } from './define-tool.js'
import { findDish } from './find-dish.js'
import { findCommonFreeSlots } from './find-common-free-slots.js'
import { getFriends } from './get-friends.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { listRestaurants } from './list-restaurants.js'

/** Every tool the MCP server exposes. Add new tools here. */
export const tools = [
  getMySchedule,
  listRestaurants,
  getMenu,
  getLibraryOccupancy,
  findDish,
  getFriends,
  findCommonFreeSlots,
] as ToolDefinition[]
