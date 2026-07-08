import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Copy, FileText, Lightbulb, LoaderCircle, PlugZap, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react'
import useAiStudioController from './aiStudio/useAiStudioController.js'
import DismissibleNotice from '../components/DismissibleNotice.jsx'

function friendlyGeminiPingMessage(result) {
  const raw = `${result?.message || ''} ${result?.reply || ''}`.toLowerCase()
  if (result?.success) return result.message || 'Gemini responded successfully.'
  if (raw.includes('quota') || raw.includes('resource_exhausted') || raw.includes('429') || raw.includes('limit')) {
    return 'Gemini is connected, but the API quota or daily limit has been reached. Try again later or switch to another API key.'
  }
  if (raw.includes('api key') || raw.includes('apikey') || raw.includes('unauthorized') || raw.includes('401') || raw.includes('403')) {
    return 'Gemini rejected the API key. Check that the key is correct, enabled, and allowed to use this model.'
  }
  if (raw.includes('not configured') || raw.includes('local-fallback')) {
    return 'Gemini is not configured on the backend yet.'
  }
  if (raw.includes('network') || raw.includes('socket') || raw.includes('timeout') || raw.includes('timed out')) {
    return 'The backend could not reach Gemini right now. Check your internet connection and try again.'
  }
  return result?.message || 'Gemini did not respond successfully. Check the API key and try again.'
}

function AiStudio() {
  const {
    message,
    setMessage,
    history,
    recommendations,
    coverLetter,
    aiStatus,
    pingResult,
    applications,
    resumes,
    selectedApplicationId,
    setSelectedApplicationId,
    selectedResumeId,
    setSelectedResumeId,
    coverNotes,
    setCoverNotes,
    coverLoading,
    coverMessage,
    clearCoverMessage,
    copied,
    loading,
    loadingRecommendations,
    pinging,
    clearPingResult,
    messagesEndRef,
    refreshRecommendations,
    clearChat,
    sendMessage,
    generateCoverLetter,
    copyCoverLetter,
    pingGemini,
  } = useAiStudioController()
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="card flex h-[720px] min-h-0 flex-col">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Bot />
          </div>
          <div>
            <p className="label">Career copilot</p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Ask with your application context</h2>
          </div>
          <button onClick={clearChat} className="btn-secondary ml-auto" title="Clear conversation">
            <Trash2 size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
          {history.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Ask about follow-ups, company fit, resume gaps, interview prep, or which opportunity deserves attention today.
            </div>
          )}
          {history.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-lg px-4 py-3 text-sm leading-6 ${
                  item.role === 'user'
                    ? 'bg-slate-950 text-white dark:bg-teal-400 dark:text-slate-950'
                    : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                {item.role === 'user' ? (
                  item.content
                ) : (
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
                    {item.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} className="mt-4 flex gap-3">
          <input className="input" value={message} onChange={(event) => setMessage(event.target.value)} />
          <button className="btn-primary" disabled={loading}>
            <Send size={17} />
          </button>
        </form>
      </section>

      <aside className="space-y-6">
        <section className="rounded-lg border border-teal-200 bg-teal-50 p-5 dark:border-teal-800 dark:bg-teal-950/60">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="text-teal-700 dark:text-teal-300" />
              <h3 className="font-bold text-teal-950 dark:text-teal-100">Recommendations</h3>
            </div>
            <button onClick={refreshRecommendations} className="rounded-lg bg-white/80 p-2 text-teal-700 hover:bg-white dark:bg-slate-900 dark:text-teal-300">
              <RefreshCw size={16} />
            </button>
          </div>
          <p className="text-sm leading-6 text-teal-800 dark:text-teal-200">
            {recommendations?.summary || (loadingRecommendations ? 'Generating recommendations...' : 'Click refresh when you want AI recommendations.')}
          </p>
          {recommendations && (
            <div className="mt-4 space-y-3">
            {[
              ['Companies to follow', recommendations?.companiesToFollow],
              ['Skills to learn', recommendations?.skillsToLearn],
              ['Application tips', recommendations?.applicationTips],
            ].map(([title, values]) => (
              <div key={title} className="rounded-lg bg-white/80 p-3 dark:bg-slate-900/80">
                <p className="text-sm font-bold text-slate-950 dark:text-white">{title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(values || []).map((value) => (
                    <span key={value} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            </div>
          )}
        </section>

        {aiStatus && (
          <section className="card">
            <p className="label">Provider status</p>
            <h3 className="mt-1 font-bold text-slate-950 dark:text-white">{aiStatus.provider}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{aiStatus.model}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${aiStatus.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                {aiStatus.mode}
              </span>
            </div>
            {!aiStatus.configured && (
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Live Gemini is unavailable for this session. The app will keep local guidance available until the backend reports live mode again.
              </p>
            )}
            <button type="button" onClick={pingGemini} disabled={pinging} className="btn-secondary mt-4 w-full">
              {pinging ? <LoaderCircle className="animate-spin" size={17} /> : <PlugZap size={17} />}
              {pinging ? 'Checking connection...' : 'Test Gemini Connection'}
            </button>
            {pingResult && (
              <DismissibleNotice
                className={`mt-3 text-sm font-semibold ${
                  pingResult.success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                }`}
                onDismiss={clearPingResult}
              >
                {friendlyGeminiPingMessage(pingResult)}
                {!pingResult.success && pingResult.reply && (
                  <details className="mt-2 text-xs font-normal">
                    <summary className="cursor-pointer font-bold">Technical details</summary>
                    <span className="mt-1 block break-words font-mono">{pingResult.reply}</span>
                  </details>
                )}
                {pingResult.success && pingResult.reply && <span className="mt-1 block font-mono text-xs">Reply: {pingResult.reply}</span>}
              </DismissibleNotice>
            )}
          </section>
        )}

        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="text-amber-500" />
            <h3 className="font-bold text-slate-950 dark:text-white">Cover letter generator</h3>
          </div>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Generate a draft from one tracked application and an optional resume.</p>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="label">Application</span>
              <select className="input mt-2" value={selectedApplicationId} onChange={(event) => setSelectedApplicationId(event.target.value)}>
                {applications.length === 0 && <option value="">No tracked applications</option>}
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.jobOpportunity?.title || 'Application'} at {application.jobOpportunity?.company?.name || 'Company'}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Resume</span>
              <select className="input mt-2" value={selectedResumeId} onChange={(event) => setSelectedResumeId(event.target.value)}>
                <option value="">No resume context</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Tone and notes</span>
              <textarea
                className="input mt-2 min-h-24 resize-y"
                value={coverNotes}
                onChange={(event) => setCoverNotes(event.target.value)}
                placeholder="Mention tone, strengths, or specific skills to emphasize."
              />
            </label>
          </div>
          <button onClick={generateCoverLetter} disabled={coverLoading || applications.length === 0} className="btn-secondary mt-4 w-full">
            {coverLoading ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />}
            {coverLoading ? 'Generating...' : 'Generate cover letter'}
          </button>
          {coverMessage && (
            <DismissibleNotice
              className="mt-3 border-teal-200 bg-teal-50 text-sm font-semibold text-teal-800 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-100"
              onDismiss={clearCoverMessage}
            >
              {coverMessage}
            </DismissibleNotice>
          )}
          {coverLetter && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold text-slate-950 dark:text-white">{coverLetter.subject}</p>
                <button type="button" onClick={copyCoverLetter} className="rounded-md p-1 text-slate-500 hover:bg-white dark:hover:bg-slate-900" title="Copy cover letter">
                  <Copy size={15} />
                </button>
              </div>
              {copied && <p className="mb-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">Copied</p>}
              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{coverLetter.coverLetter}</pre>
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}

export default AiStudio
