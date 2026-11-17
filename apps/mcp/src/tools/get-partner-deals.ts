import { z } from 'zod'

import { defineTool } from './define-tool.js'

/** Cards are filtered in code, so fetch plenty. Used by scripts/record-fixtures.ts too. */
export const PARTNER_CARDS_FETCH_COUNT = 50
const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20
const MAX_TEXT = 200

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const shorten = (text: string) =>
  text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT).trimEnd()}…` : text

const normalise = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export const getPartnerDeals = defineTool({
  name: 'get_partner_deals',
  description:
    'List the current student deals and discounts from Quivr partners (shops, restaurants, bars, ...): partner name, deal title and details, a short description of the partner, validity dates (ISO) and a link when there is one. Optionally filter on a keyword, e.g. "pizza", matched case- and accent-insensitively against partner name, description and deal text; use one short keyword, not a sentence. Expired deals are left out. Addresses are not available, so say so when asked where a partner is. If nothing matches, tell the student there is no such deal instead of guessing.',
  inputSchema: {
    query: z
      .string()
      .optional()
      .describe('Keyword to look for, e.g. "pizza" or "gym"'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .optional()
      .describe(`Number of deals, default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}`),
  },
  run: async ({ query, limit }, quivr) => {
    const { partnerCards } = await quivr.getPartnerCards(
      PARTNER_CARDS_FETCH_COUNT
    )
    const now = Date.now()
    const wanted = normalise(query?.trim() ?? '')

    const deals = (partnerCards.nodes ?? [])
      .filter(card => card !== null)
      .filter(card => !card.isTemplate)
      .filter(card => !(Date.parse(card.dateInvalid) < now))
      .map(card => {
        const translation =
          card.translations.find(t => t.locale === 'EN') ?? card.translations[0]
        return {
          partner: stripHtml(card.company?.name ?? ''),
          title: stripHtml(translation?.title ?? ''),
          details: shorten(stripHtml(translation?.body ?? '')),
          about: shorten(stripHtml(card.company?.description ?? '')),
          validFrom: card.dateValid,
          validUntil: card.dateInvalid,
          url:
            card.action && 'url' in card.action ? card.action.url : undefined,
        }
      })
      .filter(deal => deal.partner || deal.title)
      .filter(deal =>
        normalise(
          `${deal.partner} ${deal.title} ${deal.details} ${deal.about}`
        ).includes(wanted)
      )

    return {
      query: query?.trim() || undefined,
      deals: deals.slice(0, Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT)),
      total: deals.length,
      note: 'Addresses are not available.',
    }
  },
})
