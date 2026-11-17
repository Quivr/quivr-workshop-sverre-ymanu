import { z } from 'zod'

import { defineTool } from './define-tool.js'

const FETCH_COUNT = 10
const MAX_LIMIT = 10
const DEFAULT_LIMIT = 5
const TEASER_LENGTH = 240

export const stripHtml = (html: string) =>
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

const teaser = (text: string) =>
  text.length > TEASER_LENGTH
    ? `${text.slice(0, TEASER_LENGTH).trimEnd()}…`
    : text

/** Map what the model asked for onto an exact topic name, or undefined. */
const matchTopic = (topic: string, topics: string[]) => {
  const wanted = topic.trim().toLowerCase()
  return (
    topics.find(t => t.toLowerCase() === wanted) ??
    topics.find(
      t => t.toLowerCase().includes(wanted) || wanted.includes(t.toLowerCase())
    )
  )
}

export const getNews = defineTool({
  name: 'get_news',
  description:
    'Get the latest Quivr/campus news articles, newest first: title, short teaser, topic, publication date (ISO) and url. Optionally filter on a topic, e.g. "housing"; the output always lists the available topics, and if the requested topic does not exist no articles are returned so you can pick one of the listed topics or tell the user there is no news on it. Use this for "what is new", announcements and news questions; it does not return events or schedules.',
  inputSchema: {
    topic: z
      .string()
      .optional()
      .describe(
        'Topic to filter on, as listed in the topics of an earlier call'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_LIMIT)
      .optional()
      .describe(
        `Number of articles, default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}`
      ),
  },
  run: async ({ topic, limit }, quivr) => {
    const { newsArticlesTopics: topics } = await quivr.getNewsTopics()

    const requested = topic?.trim() || undefined
    const matched = requested ? matchTopic(requested, topics) : undefined
    if (requested && !matched) {
      return { topic: requested, topics, articles: [] }
    }

    const { newsArticlesV2 } = await quivr.getNews(FETCH_COUNT, matched)
    const articles = (newsArticlesV2.nodes ?? [])
      .filter(article => article !== null)
      .slice(0, limit ?? DEFAULT_LIMIT)
      .map(article => ({
        title: stripHtml(article.title),
        summary: teaser(
          stripHtml(article.summary || article.subtitle || article.content)
        ),
        topic: article.topic ?? undefined,
        published: article.datePublished,
        url: article.url || undefined,
        source: article.contentProviderName || undefined,
      }))

    return { topic: matched, topics, articles }
  },
})
