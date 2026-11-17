import type { ComponentType } from 'react'

import { LibraryCard } from './LibraryCard'
import { MenuCard } from './MenuCard'
import { ScheduleCard } from './ScheduleCard'
import type { CardProps } from './types'

/** Tool name → card. Tools without a card use ToolCallCard. Add new cards here. */
export const cards: Record<string, ComponentType<CardProps>> = {
  get_my_schedule: ScheduleCard,
  get_menu: MenuCard,
  get_library_occupancy: LibraryCard,
}
