import { describe, expect, it } from 'vitest'

import { anonymise } from './anonymise.js'

describe('anonymise', () => {
  it('replaces people, private event titles and notes but keeps lessons and places', () => {
    const data = {
      scheduleItems: {
        scheduleItems: [
          {
            __typename: 'Lesson',
            title: 'Machine Learning',
            notes: 'bring laptop',
            locations: [{ name: 'A.2.040' }],
            teachers: [{ name: 'Real Teacher' }],
          },
          {
            __typename: 'Event',
            title: "Birthday party at Jan's",
            notes: null,
          },
        ],
      },
      friendList: [
        { firstName: 'Real', lastName: 'Student', email: 'real@ugent.be' },
      ],
    }

    const result = anonymise(data) as typeof data
    const [lesson, event] = result.scheduleItems.scheduleItems

    expect(lesson?.title).toBe('Machine Learning')
    expect(lesson?.locations).toEqual([{ name: 'A.2.040' }])
    expect(lesson?.notes).toBeNull()
    expect(lesson?.teachers?.[0]?.name).not.toBe('Real Teacher')
    expect(event?.title).not.toContain('Jan')
    expect(result.friendList[0]).not.toMatchObject({ firstName: 'Real' })
    expect(result.friendList[0]?.email).not.toBe('real@ugent.be')
  })

  it('replaces sender names, invited event titles and event locations', () => {
    const data = {
      receivedEventInvites: [
        {
          id: '1',
          sender: { firstName: 'RealSender' },
          event: {
            title: 'Real birthday',
            locations: [{ name: 'Real home', address: '1 Real Street' }],
          },
        },
      ],
    }

    const [invite] = (anonymise(data) as typeof data).receivedEventInvites

    expect(invite?.sender.firstName).not.toBe('RealSender')
    expect(invite?.event.title).not.toContain('Real')
    expect(JSON.stringify(invite?.event.locations)).not.toContain('Real')
  })
})
