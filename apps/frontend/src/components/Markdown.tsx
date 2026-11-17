import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components: Components = {
  p: props => (
    <p
      className="my-2 first:mt-0 last:mb-0"
      {...props}
    />
  ),
  h1: props => (
    <h1
      className="font-title text-sidenav-blue mt-3 mb-2 text-2xl"
      {...props}
    />
  ),
  h2: props => (
    <h2
      className="font-title text-sidenav-blue mt-3 mb-2 text-xl"
      {...props}
    />
  ),
  h3: props => (
    <h3
      className="text-sidenav-blue mt-3 mb-1 font-bold"
      {...props}
    />
  ),
  h4: props => (
    <h4
      className="text-sidenav-blue mt-3 mb-1 font-bold"
      {...props}
    />
  ),
  ul: props => (
    <ul
      className="my-2 list-disc space-y-1 pl-5"
      {...props}
    />
  ),
  ol: props => (
    <ol
      className="my-2 list-decimal space-y-1 pl-5"
      {...props}
    />
  ),
  a: props => (
    <a
      className="text-blue-pretty underline"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  blockquote: props => (
    <blockquote
      className="border-schedule-border-grey my-2 border-l-4 pl-3 italic"
      {...props}
    />
  ),
  hr: () => <hr className="border-schedule-border-grey my-3" />,
  pre: props => (
    <pre
      className="bg-schedule-bg-grey my-2 overflow-x-auto rounded p-2 text-sm"
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={className ?? 'bg-schedule-bg-grey rounded px-1 py-0.5 text-sm'}
      {...props}
    />
  ),
  table: props => (
    <div className="my-2 overflow-x-auto">
      <table
        className="border-collapse text-sm"
        {...props}
      />
    </div>
  ),
  th: props => (
    <th
      className="border-schedule-border-grey bg-schedule-bg-grey border px-2 py-1 text-left"
      {...props}
    />
  ),
  td: props => (
    <td
      className="border-schedule-border-grey border px-2 py-1"
      {...props}
    />
  ),
}

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {children}
    </ReactMarkdown>
  )
}
