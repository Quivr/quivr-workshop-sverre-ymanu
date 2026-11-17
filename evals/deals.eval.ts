import { defineEval, type EvalCase } from './lib/define-eval.js'
import { fixtures } from './lib/fixture-data.js'

const DONT_KNOW =
  /(don't|do not|didn't|did not|couldn't|could not|can't|cannot) (know|find|see|have)|no (deal|deals|discount|discounts|information|results|partner|match)|not (in|on) (your|the)|doesn't (show|include|contain|have)|does not|isn't|is not|nothing|unfortunately/i

const nodes = (await fixtures.getPartnerCards(50)).partnerCards.nodes ?? []
const active = nodes.filter(
  card => card && !card.isTemplate && Date.parse(card.dateInvalid) > Date.now()
)
const named = (keyword: string) =>
  active.find(card =>
    `${card?.company?.name} ${card?.translations.map(t => t.title).join(' ')}`
      .toLowerCase()
      .includes(keyword)
  )
const nameOf = (keyword: string) => named(keyword)?.company?.name ?? keyword
const partners = active.flatMap(card =>
  card?.company?.name ? [card.company.name] : []
)
const action = named('pizza')?.action
const url = action && 'url' in action ? action.url : undefined

const cases: EvalCase[] = [
  {
    name: 'any student discounts',
    question: 'Are there any student discounts around campus?',
    expected: `Lists several partner deals, e.g. ${partners.slice(0, 3).join(', ')}.`,
    facts: partners.slice(0, 2),
    tools: ['get_partner_deals'],
  },
  {
    name: 'deal for pizza',
    question: 'Is there a deal for pizza?',
    expected: `Mentions ${nameOf('pizza')} and its pizza deal.`,
    facts: [nameOf('pizza')],
    tools: ['get_partner_deals'],
  },
  {
    name: 'deal with a link',
    question: 'Where can I read more about the pizza deal? Give me the link.',
    expected: `Gives the link ${url} for ${nameOf('pizza')}.`,
    facts: url ? [url] : [DONT_KNOW],
    tools: ['get_partner_deals'],
  },
  {
    name: 'expired deals are not offered',
    question: 'Is there a discount at the bookshop?',
    expected:
      'The bookshop deal has expired, so the assistant says there is no current bookshop deal and does not present the expired offer as available.',
    facts: [DONT_KNOW],
    tools: ['get_partner_deals'],
  },
  {
    name: 'deal that does not exist (must not invent)',
    question: 'Is there a student discount for sushi?',
    expected:
      "The assistant says there is no sushi deal in the data and doesn't invent a partner or discount.",
    facts: [DONT_KNOW],
    forbidden: [/sushi.*\d+\s?%/i],
    tools: ['get_partner_deals'],
  },
]

defineEval('deals', cases)
