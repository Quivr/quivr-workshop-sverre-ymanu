import { defineEval, type EvalCase } from './lib/define-eval.js'
import { fixtures, today } from './lib/fixture-data.js'

const DONT_KNOW =
  /(don't|do not|didn't|did not|couldn't|could not|can't|cannot) (know|find|see)|no (events|information|results|ticket)|not (in|on) (your|the)|doesn't (show|include|contain|list)|does not|isn't|is not|nothing|not (available|listed)/i

/** Distinctive start of a title, tolerant of the model rewording the rest. */
const titleFact = (title: string) =>
  new RegExp(
    title
      .replace(/^fake \w+:\s*/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .join('\\s+'),
    'i'
  )

const sections = (await fixtures.getEvents(10)).eventSpecificationsFeed.nodes
const all = [
  ...new Map(
    (sections ?? [])
      .flatMap(section => section?.eventSpecifications.nodes ?? [])
      .filter(event => event !== null)
      .map(event => [event.id, event])
  ).values(),
].sort((a, b) => a.startTime.localeCompare(b.startTime))
const upcoming = all.filter(event => event.endTime.slice(0, 10) >= today())
const past = all.filter(event => event.endTime.slice(0, 10) < today())

const first = upcoming[0]
const party = upcoming.find(e => /party/i.test(e.title))
const concert = upcoming.find(e => /concert/i.test(e.title))
const paidTicket = concert?.registration?.ticketKinds.find(
  kind => kind.priceCents > 0
)
const ball = upcoming.find(e => /ball/i.test(e.title))

const cases: EvalCase[] = [
  {
    name: 'what is happening',
    question: "What's happening on campus the next few days?",
    expected: first
      ? `Mentions the first upcoming event: "${first.title}".`
      : 'There are no upcoming events.',
    facts: first ? [titleFact(first.title)] : [DONT_KNOW],
    forbidden: past.map(event => titleFact(event.title)),
    tools: ['get_events'],
  },
  {
    name: 'parties',
    question: 'Any parties coming up?',
    expected: party
      ? `Mentions the party "${party.title}".`
      : 'There are no parties.',
    facts: party ? [titleFact(party.title)] : [DONT_KNOW],
    tools: ['get_events'],
  },
  {
    name: 'ticket price',
    question: 'How much is a ticket for the concert?',
    expected: paidTicket
      ? `Gives the price of the "${paidTicket.name}" ticket: €${(paidTicket.priceCents / 100).toFixed(2)}.`
      : 'There is no concert with ticket information.',
    facts: paidTicket
      ? [new RegExp(`\\b${paidTicket.priceCents / 100}([.,]00)?\\b`)]
      : [DONT_KNOW],
    tools: ['get_events'],
  },
  {
    name: 'plain text descriptions',
    question: 'Tell me more about the ball.',
    expected: ball
      ? `Describes "${ball.title}" in plain text, without HTML tags.`
      : 'There is no such event.',
    facts: ball ? [titleFact(ball.title)] : [DONT_KNOW],
    tools: ['get_events'],
  },
  {
    name: 'unknown event (must not invent)',
    question: 'What time does the quidditch tournament start?',
    expected:
      "The assistant says there is no such event in the events feed and doesn't invent a time.",
    facts: [DONT_KNOW],
    tools: ['get_events'],
  },
]

defineEval('events', cases)
