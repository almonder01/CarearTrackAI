import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, LoaderCircle, MessageCircle, Send, Trash2, X } from 'lucide-react'
import { careerApi } from '../lib/api.js'
import { readScopedJson, removeScopedStorage, writeScopedJson } from '../lib/userStorage.js'

const FLOATING_AGENT_STORAGE_KEY = 'careertrack_floating_agent_history'

function MessageContent({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children: value }) => <p className="mb-2 last:mb-0">{value}</p>,
        ul: ({ children: value }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{value}</ul>,
        ol: ({ children: value }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{value}</ol>,
        strong: ({ children: value }) => <strong className="font-bold text-slate-950 dark:text-white">{value}</strong>,
        code: ({ children: value }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">{value}</code>,
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

function FloatingAiAgent() {
  const location = useLocation()
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem('careertrack_show_floating_agent') !== 'false')
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('What should I do next on this page?')
  const [history, setHistory] = useState(() => readScopedJson(FLOATING_AGENT_STORAGE_KEY, []))
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    function syncPreference() {
      setIsEnabled(localStorage.getItem('careertrack_show_floating_agent') !== 'false')
    }

    window.addEventListener('storage', syncPreference)
    window.addEventListener('careertrack_preferences_changed', syncPreference)
    return () => {
      window.removeEventListener('storage', syncPreference)
      window.removeEventListener('careertrack_preferences_changed', syncPreference)
    }
  }, [])

  useEffect(() => {
    writeScopedJson(FLOATING_AGENT_STORAGE_KEY, history)
  }, [history])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [history, loading, isOpen])

  if (!isEnabled) return null

  async function sendMessage(event) {
    event.preventDefault()
    if (!message.trim()) return
    const userMessage = {
      role: 'user',
      content: `${message}\n\nCurrent page path: ${location.pathname}`,
    }
    const nextHistory = [...history, userMessage]
    setHistory(nextHistory)
    setMessage('')
    setLoading(true)
    try {
      const response = await careerApi.aiChat({ message: userMessage.content, history: nextHistory })
      setHistory([...nextHistory, { role: 'model', content: response.reply }])
    } catch (error) {
      setHistory([...nextHistory, { role: 'model', content: error.message || 'AI Agent is unavailable right now. Please try again later.' }])
    } finally {
      setLoading(false)
    }
  }

  function clearConversation() {
    setHistory([])
    removeScopedStorage(FLOATING_AGENT_STORAGE_KEY)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-5 sm:right-5">
      {isOpen && (
        <section className="mb-3 flex h-[520px] max-h-[calc(100dvh-7rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">AI Agent</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Site-wide guidance</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={clearConversation} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" title="Clear chat">
                <Trash2 size={16} />
              </button>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" title="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 dark:bg-slate-950">
            {history.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Ask where to go, how to import jobs, how to track applications, or what to do next from the current page.
              </div>
            )}
            {history.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] rounded-lg px-3 py-2 text-sm leading-6 ${
                    item.role === 'user'
                      ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950'
                      : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  {item.role === 'user' ? item.content.replace(/\n\nCurrent page path:.+$/s, '') : <MessageContent>{item.content}</MessageContent>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <LoaderCircle className="animate-spin" size={15} />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
            <input className="input py-2" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask the site agent..." />
            <button type="submit" disabled={loading} className="btn-primary px-3" title="Send">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-2xl shadow-slate-950/25 transition hover:-translate-y-0.5 hover:bg-slate-800 active:scale-95 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
        title="Open AI Agent"
      >
        <MessageCircle size={23} />
      </button>
    </div>
  )
}

export default FloatingAiAgent
