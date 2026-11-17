import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { faker } from '@faker-js/faker'

import { FIXTURES_DIR, loadConfig } from '../src/config.js'
import { addDays, brusselsDate, datesBetween } from '../src/quivr/dates.js'
import { fixtureKey, writeFixtures } from '../src/quivr/fixtures.js'
import { QuivrClient } from '../src/quivr/quivr-client.js'
import { PARTNER_CARDS_FETCH_COUNT } from '../src/tools/get-partner-deals.js'
import { anonymise } from './anonymise.js'

const DAYS_BEFORE = 2
const DAYS_AFTER = 13
const NEWS_FETCH_COUNT = 10 // keep in sync with tools/get-news.ts
const EVENTS_FETCH_COUNT = 10 // keep in sync with tools/get-events.ts

faker.seed(42)
const recorded = new Map<string, Record<string, unknown>>()
const quivr = new QuivrClient({
  ...loadConfig(),
  mode: 'live',
  readOnly: true,
  onResponse: (operationName, variables, data) => {
    const entries = recorded.get(operationName) ?? {}
    recorded.set(operationName, {
      ...entries,
      [fixtureKey(variables)]: anonymise(data),
    })
  },
})

const recordedAt = new Date()
const today = brusselsDate(recordedAt)
const dates = datesBetween(
  addDays(today, -DAYS_BEFORE),
  addDays(today, DAYS_AFTER)
)

const { restaurants } = await quivr.listRestaurants()
const { friendList } = await quivr.getFriends()
await quivr.getLibraries()
const { newsArticlesTopics } = await quivr.getNewsTopics()
for (const topic of [undefined, ...newsArticlesTopics]) {
  await quivr.getNews(NEWS_FETCH_COUNT, topic)
}
await quivr.getEvents(EVENTS_FETCH_COUNT)
await quivr.getStudentBars(true)
await quivr.getStudentBars(false)
await quivr.getPartnerCards(PARTNER_CARDS_FETCH_COUNT)
for (const date of dates) {
  await quivr.getMySchedule(date)
  await Promise.all(friendList.map(f => quivr.getFriendSchedules([f.id], date)))
  await Promise.all(restaurants.map(r => quivr.getMenu(r.id, date)))
}

for (const [operationName, entries] of recorded) {
  writeFixtures(operationName, entries)
  console.info(`${operationName}: ${Object.keys(entries).length} responses`)
}
writeFileSync(
  join(FIXTURES_DIR, 'meta.json'),
  `${JSON.stringify({ recordedAt: recordedAt.toISOString(), days: dates }, null, 2)}\n`
)
console.info(
  `Recorded ${dates[0]} to ${dates.at(-1)}. Check the files in apps/mcp/fixtures for personal data before committing.`
)
