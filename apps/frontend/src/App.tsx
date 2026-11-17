import { useEffect, useState } from 'react'

import { Composer } from './components/Composer'
import { Header } from './components/Header'
import { MessageList } from './components/MessageList'
import { QuivrMannetje } from './components/QuivrMannetje'
import { TracesPanel } from './components/TracesPanel'
import { useAgentChat } from './useAgentChat'
import { useTheme } from './useTheme'

const EXAMPLES = [
  "What's on the menu at Alma 2 today and where is my next class?",
  'Which library is least busy right now?',
  "What's vegetarian at the student restaurants tomorrow?",
]

export function App() {
  const chat = useAgentChat()
  const { theme, toggle: toggleTheme } = useTheme()
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [isShowingTraces, setIsShowingTraces] = useState(false)

  useEffect(() => {
    fetch('/api/models')
      .then(
        response =>
          response.json() as Promise<{ models: string[]; defaultModel: string }>
      )
      .then(body => {
        setModels(body.models)
        setModel(body.defaultModel)
      })
      .catch(() => setModels([]))
  }, [])

  const handleSend = (text: string) => void chat.send(text, model)

  return (
    <div className="flex h-dvh flex-col">
      <Header
        models={models}
        model={model}
        theme={theme}
        isShowingTraces={isShowingTraces}
        onModelChange={setModel}
        onNewChat={chat.reset}
        onToggleTraces={() => setIsShowingTraces(value => !value)}
        onToggleTheme={toggleTheme}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4">
        {isShowingTraces && <TracesPanel />}
        {!isShowingTraces && chat.messages.length === 0 && (
          <div className="space-y-2 pt-10 text-center">
            <p className="font-title text-heading text-3xl">
              What do you want to know?
            </p>
            {EXAMPLES.map(example => (
              <button
                key={example}
                type="button"
                onClick={() => handleSend(example)}
                className="hover:bg-cardbg bg-surface block w-full rounded-md px-3 py-2 text-sm shadow-sm"
              >
                {example}
              </button>
            ))}
          </div>
        )}
        {!isShowingTraces && (
          <MessageList
            messages={chat.messages}
            durations={chat.durations}
            isRunning={chat.isRunning}
          />
        )}
        {chat.error && !isShowingTraces && (
          <p className="bg-danger/10 text-danger mt-3 rounded-md px-3 py-2 text-sm">
            {chat.error}
          </p>
        )}
      </main>
      {!isShowingTraces && (
        <footer className="mx-auto w-full max-w-3xl p-4 pt-0">
          <Composer
            isDisabled={chat.isRunning || !model}
            onSend={handleSend}
          />
        </footer>
      )}
      <QuivrMannetje />
    </div>
  )
}
