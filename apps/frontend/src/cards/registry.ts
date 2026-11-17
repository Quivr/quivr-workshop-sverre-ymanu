import type { ComponentType } from 'react'

import { DishSearchCard } from './DishSearchCard'
import { EventsCard } from './EventsCard'
import { FreeSlotsCard } from './FreeSlotsCard'
import { BarsCard } from './BarsCard'
import { LibraryCard } from './LibraryCard'
import { InviteDraftCard } from './InviteDraftCard'
import { MenuCard } from './MenuCard'
import { NewsCard } from './NewsCard'
import { ScheduleCard } from './ScheduleCard'
import { TodayCard } from './TodayCard'
import type { CardProps } from './types'

/** Tool name → card. Tools without a card use ToolCallCard. Add new cards here. */
export const cards: Record<string, ComponentType<CardProps>> = {
  get_my_schedule: ScheduleCard,
  get_menu: MenuCard,
  find_dish: DishSearchCard,
  find_common_free_slots: FreeSlotsCard,
  get_news: NewsCard,
  get_events: EventsCard,
  get_student_bars: BarsCard,
  get_library_occupancy: LibraryCard,
  get_today_overview: TodayCard,
  draft_invite: InviteDraftCard,
}
