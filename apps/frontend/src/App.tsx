import { useEffect, useRef, useState } from 'react'

import { isNearBottom } from './chatHelpers'
import { loadChat, saveChat, toMarkdown } from './chatStorage'
import { DEFAULT_DC } from './dice/check'
import { gateSend } from './dice/gate'
import { CheckOverlay } from './components/CheckOverlay'
import { Composer } from './components/Composer'
import { DiceRoller } from './components/DiceRoller'
import { Header } from './components/Header'
import { MessageList } from './components/MessageList'
import { PopupAds } from './components/PopupAds'
import { QuivrMannetje } from './components/QuivrMannetje'
import { SideVideo } from './components/SideVideo'
import { TracesPanel } from './components/TracesPanel'
import { Welcome } from './components/Welcome'
import { useAgentChat } from './useAgentChat'
import { useDiceStats } from './useDiceStats'
import { useDungeonCheck } from './useDungeonCheck'
import { useDungeonMode } from './useDungeonMode'
import { useTheme } from './useTheme'

export function App() {
  const [saved] = useState(loadChat)
  const chat = useAgentChat(saved.messages)
  const { theme, toggle: toggleTheme } = useTheme()
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState(saved.model)
  const [isShowingTraces, setIsShowingTraces] = useState(false)
  const [draft, setDraft] = useState('')
  const [isDiceRolling, setIsDiceRolling] = useState(false)
  const { isDungeonMode, toggle: toggleDungeonMode } = useDungeonMode()
  const { stats, addRoll, addCheck } = useDiceStats()
  const mainRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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

  const sendNow = (text: string) => {
    handleSend(text)
    setDraft(current => (current.trim() === text ? '' : current))
  }

  const check = useDungeonCheck({
    canSend: !chat.isRunning && !!model,
    onPass: sendNow,
    onResult: addCheck,
  })
  const isRolling = check.phase !== 'idle' || isDiceRolling

  useEffect(() => {
    if (check.phase === 'idle') inputRef.current?.focus()
  }, [check.phase])

  /** Send, roll a check first (Dungeon mode) or do nothing. The text is sent exactly as typed. */
  const handleSubmit = (text: string) => {
    const action = gateSend({
      dungeonMode: isDungeonMode,
      isRunning: chat.isRunning,
      isRolling,
      isDisabled: !model,
      text,
    })
    if (action === 'send') sendNow(text.trim())
    if (action === 'roll') check.start(text.trim())
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
        isDungeonMode={isDungeonMode}
        isShowingTraces={isShowingTraces}
        canCopyChat={chat.messages.length > 0}
        onCopyChat={handleCopyChat}
        onModelChange={setModel}
        onNewChat={chat.reset}
        onToggleTraces={() => setIsShowingTraces(value => !value)}
        onToggleTheme={toggleTheme}
        onToggleDungeonMode={toggleDungeonMode}
      />
      <main
        ref={mainRef}
        onScroll={handleScroll}
        className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4"
      >
        {isShowingTraces && <TracesPanel />}
        {!isShowingTraces && chat.messages.length === 0 && (
          <Welcome
            isDisabled={!model || isRolling}
            onPick={handleSubmit}
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
          <p className="bg-danger/10 text-danger-text mt-3 rounded-md px-3 py-2 text-sm">
            {chat.error}
          </p>
        )}
      </main>
      {!isShowingTraces && (
        <footer className="mx-auto w-full max-w-3xl p-4 pt-0">
          <DiceRoller
            isDisabled={chat.isRunning || !model || check.phase !== 'idle'}
            stats={stats}
            onSend={handleSend}
            onRoll={addRoll}
            onBusyChange={setIsDiceRolling}
          />
          <Composer
            value={draft}
            isDisabled={chat.isRunning || !model || isRolling}
            isRunning={chat.isRunning}
            check={isDungeonMode ? { dc: DEFAULT_DC, mode: check.mode } : null}
            inputRef={inputRef}
            onChange={setDraft}
            onSend={handleSubmit}
            onStop={chat.stop}
          />
        </footer>
      )}
      <CheckOverlay
        run={check.run}
        phase={check.phase}
        announcement={check.announcement}
        onLand={check.land}
        onClose={check.close}
      />
      <QuivrMannetje model={model} />
      <SideVideo />
      <PopupAds />
    </div>
  )
}
