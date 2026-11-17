import type { Config } from '../config.js'
import type { ToolDefinition } from './define-tool.js'
import { findDish } from './find-dish.js'
import { findCommonFreeSlots } from './find-common-free-slots.js'
import { getFriends } from './get-friends.js'
import { getLibraryOccupancy } from './get-library-occupancy.js'
import { getMenu } from './get-menu.js'
import { getMySchedule } from './get-my-schedule.js'
import { getNews } from './get-news.js'
import { getStudentBars } from './get-student-bars.js'
import { getTodayOverview } from './get-today-overview.js'
import { listRestaurants } from './list-restaurants.js'
import { runGraphqlQuery } from './run-graphql-query.js'

/** Every tool the MCP server exposes. Add new tools here. */
export const tools = [
  getMySchedule,
  listRestaurants,
  getMenu,
  getLibraryOccupancy,
  findDish,
  getFriends,
  findCommonFreeSlots,
  getNews,
  getStudentBars,
  getTodayOverview,
] as ToolDefinition[]

/** Opt-in tools (see .env.example) are added only when enabled. */
export const enabledTools = (
  config: Pick<Config, 'enableGenericGraphql'>
): ToolDefinition[] => [
  ...tools,
  ...(config.enableGenericGraphql
    ? [runGraphqlQuery as unknown as ToolDefinition]
    : []),
]
