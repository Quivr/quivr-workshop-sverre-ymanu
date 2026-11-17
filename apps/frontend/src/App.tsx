import { useEffect, useRef, useState } from 'react'

import { isNearBottom } from './chatHelpers'
import { loadChat, saveChat, toMarkdown } from './chatStorage'
import { Composer } from './components/Composer'
import { Header } from './components/Header'
import { MessageList } from './components/MessageList'
import { TracesPanel } from './components/TracesPanel'
import { Welcome } from './components/Welcome'
import { useAgentChat } from './useAgentChat'
import { useTheme } from './useTheme'

export function App() {
  const [saved] = useState(loadChat)
  const chat = useAgentChat(saved.messages)
  const { theme, toggle: toggleTheme } = useTheme()
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState(saved.model)
  const [isShowingTraces, setIsShowingTraces] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const isStickingToBottom = useRef(true)

  useEffect(() => {
    const main = mainRef.current
    if (main && isStickingToBottom.current) main.scrollTop = main.scrollHeight
  }, [chat.messages, chat.durations, chat.isRunning, chat.error])

  useEffect(() => {
    fetch('/api/models')
      .then(
        response =>
          response.json() as Promise<{ models: string[]; defaultModel: string }>
      )
      .then(body => {
        setModels(body.models)
        setModel(current =>
          body.models.includes(current) ? current : body.defaultModel
        )
      })
      .catch(() => setModels([]))
  }, [])

  useEffect(() => {
    if (!chat.isRunning) saveChat(chat.messages, model)
  }, [chat.messages, chat.isRunning, model])

  const handleCopyChat = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(chat.messages))
      return true
    } catch {
      return false
    }
  }

  const handleSend = (text: string) => {
    isStickingToBottom.current = true
    void chat.send(text, model)
  }

  const handleScroll = () => {
    if (mainRef.current)
      isStickingToBottom.current = isNearBottom(mainRef.current)
  }

  return (
    <div className="flex h-dvh flex-col">
      <Header
        models={models}
        model={model}
        theme={theme}
        isShowingTraces={isShowingTraces}
        canCopyChat={chat.messages.length > 0}
        onCopyChat={handleCopyChat}
        onModelChange={setModel}
        onNewChat={chat.reset}
        onToggleTraces={() => setIsShowingTraces(value => !value)}
        onToggleTheme={toggleTheme}
      />
      <main
        ref={mainRef}
        onScroll={handleScroll}
        className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4"
      >
        {isShowingTraces && <TracesPanel />}
        {!isShowingTraces && chat.messages.length === 0 && (
          <Welcome
            isDisabled={!model}
            onPick={handleSend}
          />
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
            isRunning={chat.isRunning}
            onSend={handleSend}
            onStop={chat.stop}
          />
        </footer>
      )}
    </div>
  )
}
