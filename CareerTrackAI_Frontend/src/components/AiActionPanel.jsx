import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, LoaderCircle, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { careerApi } from '../lib/api.js'

function storageKeyForPanel(title) {
  return `careertrack_ai_panel_${String(title || 'panel')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`
}

function readStoredPanelContent(key) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function MarkdownBlock({ value }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
        strong: ({ children }) => <strong className="font-bold text-slate-950 dark:text-white">{children}</strong>,
        code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">{children}</code>,
      }}
    >
      {value}
    </ReactMarkdown>
  )
}

function AiActionPanel({ title = 'AI next move', prompt = '', children, actions = [] }) {
  const storageKey = useMemo(() => storageKeyForPanel(title), [title])
  const [isVisible, setIsVisible] = useState(() => localStorage.getItem('careertrack_show_ai_panels') !== 'false')
  const [content, setContent] = useState(() => readStoredPanelContent(storageKey))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setContent(readStoredPanelContent(storageKey))
  }, [storageKey])

  useEffect(() => {
    function syncPreference() {
      setIsVisible(localStorage.getItem('careertrack_show_ai_panels') !== 'false')
    }

    window.addEventListener('storage', syncPreference)
    window.addEventListener('careertrack_preferences_changed', syncPreference)
    return () => {
      window.removeEventListener('storage', syncPreference)
      window.removeEventListener('careertrack_preferences_changed', syncPreference)
    }
  }, [])

  if (!isVisible) return null

  async function refreshInsight() {
    setLoading(true)
    try {
      const response = await careerApi.aiChat({
        message:
          prompt ||
          `Give a concise, useful career workspace insight for this panel: "${title}". Focus on the user's next practical action. Use Markdown.`,
        history: [],
      })
      const nextContent = response.reply || 'No AI insight returned.'
      setContent(nextContent)
      localStorage.setItem(storageKey, nextContent)
    } catch (error) {
      const nextContent = error.message || 'Could not refresh this AI insight.'
      setContent(nextContent)
      localStorage.setItem(storageKey, nextContent)
    } finally {
      setLoading(false)
    }
  }

  function clearInsight() {
    setContent('')
    localStorage.removeItem(storageKey)
  }

  return (
    <section className="rounded-lg border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-amber-50 p-5 shadow-sm dark:border-teal-800 dark:from-teal-950/60 dark:via-slate-900 dark:to-amber-950/40 dark:shadow-black/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
            <Bot size={20} />
          </div>
          <div>
            <p className="label">Embedded intelligence</p>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {content && (
            <button type="button" onClick={clearInsight} className="btn-secondary px-3" title="Clear AI insight">
              <Trash2 size={16} />
            </button>
          )}
          <button type="button" onClick={refreshInsight} disabled={loading} className="btn-secondary px-3" title="Refresh AI insight">
            {loading ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          </button>
          <Sparkles className="hidden text-amber-500 sm:block" size={22} />
        </div>
      </div>

      {content && (
        <div className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <MarkdownBlock value={content} />
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button key={action.label} onClick={action.onClick} className="btn-secondary">
              <Wand2 size={16} />
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div className="hidden">{children}</div>
    </section>
  )
}

export default AiActionPanel
