import { defineEval, type EvalCase } from './lib/define-eval.js'
import { fixtures } from './lib/fixture-data.js'

const DONT_KNOW =
  /(don't|do not|couldn't|could not|can't|cannot) (know|find|see)|no (news|information|articles|results)|not (in|on) (your|the)|doesn't (show|include|contain)|does not|isn't|is not|nothing/i

const topics = (await fixtures.getNewsTopics()).newsArticlesTopics
const topic = topics[0]
const latest = (await fixtures.getNews(10)).newsArticlesV2.nodes?.[0]
const topicArticle = topic
  ? (await fixtures.getNews(10, topic)).newsArticlesV2.nodes?.[0]
  : undefined

const cases: EvalCase[] = [
  {
    name: 'latest news',
    question: "What's the latest news?",
    expected: latest
      ? `Mentions the most recent article: "${latest.title}".`
      : 'There is no news.',
    facts: latest ? [latest.title.slice(0, 20)] : [DONT_KNOW],
    tools: ['get_news'],
  },
  {
    name: 'news by topic',
    question: `What's new about ${topic?.toLowerCase() ?? 'housing'}?`,
    expected: topicArticle
      ? `Mentions the ${topic} article "${topicArticle.title}".`
      : `There is no news about ${topic}.`,
    facts: topicArticle ? [topicArticle.title.slice(0, 20)] : [DONT_KNOW],
    tools: ['get_news'],
  },
  {
    name: 'list news topics',
    question: 'Which topics does the news cover?',
    expected: `The available topics: ${topics.join(', ')}`,
    facts: topics.slice(0, 2),
    tools: ['get_news'],
  },
  {
    name: 'single newest article',
    question: 'Give me just the newest news article with a link.',
    expected: latest
      ? `Gives only "${latest.title}" with its link ${latest.url}.`
      : 'There is no news.',
    facts: latest ? [latest.url] : [DONT_KNOW],
    tools: ['get_news'],
  },
  {
    name: 'news on an unknown topic (must not invent)',
    question: 'Any news about the quidditch tournament?',
    expected:
      "The assistant says there is no news on that topic and doesn't invent an article.",
    facts: [DONT_KNOW],
    tools: ['get_news'],
  },
]

defineEval('news', cases)
