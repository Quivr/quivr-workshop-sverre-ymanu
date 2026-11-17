import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { faker } from '@faker-js/faker'

import { FIXTURES_DIR, loadConfig } from '../src/config.js'
import { addDays, brusselsDate, datesBetween } from '../src/quivr/dates.js'
import { fixtureKey, writeFixtures } from '../src/quivr/fixtures.js'
import { QuivrClient } from '../src/quivr/quivr-client.js'
import { anonymise } from './anonymise.js'

const DAYS_BEFORE = 2
const DAYS_AFTER = 13

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
await quivr.getLibraries()
await quivr.getReceivedEventInvites(false)
await quivr.getReceivedEventInvites(true)
for (const date of dates) {
  await quivr.getMySchedule(date)
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
