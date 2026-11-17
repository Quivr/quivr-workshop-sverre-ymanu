import type { ComponentType } from 'react'

import { FreeSlotsCard } from './FreeSlotsCard'
import { MenuCard } from './MenuCard'
import { ScheduleCard } from './ScheduleCard'
import type { CardProps } from './types'

/** Tool name → card. Tools without a card use ToolCallCard. Add new cards here. */
export const cards: Record<string, ComponentType<CardProps>> = {
  get_my_schedule: ScheduleCard,
  get_menu: MenuCard,
  find_common_free_slots: FreeSlotsCard,
}
