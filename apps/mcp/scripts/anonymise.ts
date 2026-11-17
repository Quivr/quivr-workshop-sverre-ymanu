import { faker } from '@faker-js/faker'

const PERSON_KEYS = new Set(['firstName', 'lastName', 'email', 'uid'])
const DROPPED_KEYS = new Set(['notes', 'comments'])
const PRIVATE_EVENT_TITLES = [
  'Study session',
  'Sports',
  'Group project',
  'Lunch with friends',
]

const fakePerson = (key: string): string => {
  if (key === 'firstName') return faker.person.firstName()
  if (key === 'lastName') return faker.person.lastName()
  return faker.internet.email().toLowerCase()
}

/**
 * Replaces personal data with fake data, keeping the structure.
 * Public data (restaurants, libraries, course names, rooms) is kept.
 */
export const anonymise = (value: unknown, parentKey = ''): unknown => {
  if (Array.isArray(value)) return value.map(item => anonymise(item, parentKey))
  if (value === null || typeof value !== 'object') return value

  const record = value as Record<string, unknown>
  const isTeacher = parentKey === 'teachers'
  const isPersonalEvent =
    (typeof record.__typename === 'string' && record.__typename !== 'Lesson') ||
    // events inside invites: made up by friends, so personal
    parentKey === 'event'

  return Object.fromEntries(
    Object.entries(record).map(([key, field]) => {
      if (PERSON_KEYS.has(key) && typeof field === 'string') {
        return [key, fakePerson(key)]
      }
      if (DROPPED_KEYS.has(key)) return [key, null]
      if (
        parentKey === 'event' &&
        key === 'locations' &&
        Array.isArray(field)
      ) {
        return [
          key,
          field.map(() => ({
            name: faker.location.street(),
            address: faker.location.streetAddress(),
          })),
        ]
      }
      if (isTeacher && key === 'name') return [key, faker.person.fullName()]
      if (isPersonalEvent && key === 'title') {
        return [key, faker.helpers.arrayElement(PRIVATE_EVENT_TITLES)]
      }
      return [key, anonymise(field, key)]
    })
  )
}
