import { Card } from './Card'
import type { CardProps } from './types'

type Article = {
  title?: string
  summary?: string
  topic?: string
  published?: string
  url?: string
  source?: string
}

type News = {
  topic?: string
  articles?: Article[]
}

const formatDate = (iso?: string) => {
  const date = iso ? new Date(iso) : undefined
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : undefined
}

export function NewsCard({ result }: CardProps) {
  const news = (result ?? {}) as News
  const articles = Array.isArray(news.articles) ? news.articles : []

  return (
    <Card
      title="News"
      subtitle={news.topic}
    >
      {articles.length === 0 && <p>No news articles found.</p>}
      <ul className="divide-schedule-border-grey divide-y">
        {articles.map((article, index) => {
          const meta = [formatDate(article.published), article.topic]
            .filter(Boolean)
            .join(' · ')
          return (
            <li
              key={article.url ?? `${article.title}-${index}`}
              className="py-1.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                {article.url ? (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold hover:underline"
                  >
                    {article.title ?? 'Untitled'}
                  </a>
                ) : (
                  <span className="font-bold">
                    {article.title ?? 'Untitled'}
                  </span>
                )}
                {meta && (
                  <span className="text-muted shrink-0 text-xs">{meta}</span>
                )}
              </div>
              {article.summary && (
                <p className="text-muted">{article.summary}</p>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
