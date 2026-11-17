import type { ToolDefinition } from './define-tool.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { getTodayOverview } from './get-today-overview.js'
import { listRestaurants } from './list-restaurants.js'

/** Every tool the MCP server exposes. Add new tools here. */
export const tools = [
  getMySchedule,
  listRestaurants,
  getMenu,
  getLibraryOccupancy,
  getTodayOverview,
] as ToolDefinition[]
