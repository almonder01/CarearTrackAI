import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { careerApi, friendlyUserMessage } from '../../lib/api.js'

function useOpportunitiesController() {
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState({ type: '', employmentType: '' })
  const [showAdzuna, setShowAdzuna] = useState(() => localStorage.getItem('careertrack_show_adzuna_opportunities') !== 'false')
  const [showJobDataLake, setShowJobDataLake] = useState(() => localStorage.getItem('careertrack_show_jobdatalake_opportunities') !== 'false')
  const [includeShared, setIncludeShared] = useState(false)
  const [trackedIds, setTrackedIds] = useState([])
  const [linkChecks, setLinkChecks] = useState({})
  const [checkingLinks, setCheckingLinks] = useState([])
  const [actionMessage, setActionMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  const refreshData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [opportunities, applications] = await Promise.all([
        careerApi.opportunities({ ...filters, includeShared }),
        careerApi.applications().catch(() => []),
      ])
      setItems(opportunities)
      setTrackedIds(applications.map((item) => item.jobOpportunity.id))
    } catch (err) {
      setError(err.message || 'Could not load opportunities.')
    } finally {
      setLoading(false)
    }
  }, [filters, includeShared])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  function sourceText(item) {
    return [
      item.sourceProvider,
      item.company?.sourceProvider,
      item.sourceUrl,
      item.jobUrl,
      item.description,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  }

  function sourceOf(item) {
    const source = sourceText(item)
    const provider = String(item.sourceProvider || item.company?.sourceProvider || '').toLowerCase()
    if (provider === 'adzuna' || source.includes('adzuna')) return 'Adzuna'
    if (provider === 'jobdatalake' || source.includes('jobdatalake') || source.includes('job data lake')) return 'JobDataLake'
    if (source.includes('linkedin')) return 'LinkedIn Scout'
    if (source.includes('google')) return 'Google Search'
    return item.isImported ? 'Imported' : 'Manual'
  }

  function cleanText(value, fallback = '-') {
    const text = String(value || '').replace(/\btrue\b|\bfalse\b/gi, '').replace(/\s*,\s*,+/g, ', ').trim()
    return text || fallback
  }

  function normalizeUrl(value) {
    const text = String(value || '').trim()
    if (!text || ['false', 'true', 'null', 'undefined', 'no_link', 'n/a', '-'].includes(text.toLowerCase())) return ''
    const match = text.match(/https?:\/\/[^\s),\]}>"']+/i) || text.match(/\b(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s),\]}>"']*)?/i)
    if (!match) return ''
    const url = match[0].replace(/[.,;:]+$/, '')
    return /^https?:\/\//i.test(url) ? url : `https://${url}`
  }

  function primaryUrl(item) {
    return (
      normalizeUrl(item.jobUrl) ||
      normalizeUrl(item.sourceUrl) ||
      normalizeUrl(item.company?.website) ||
      normalizeUrl(item.description) ||
      ''
    )
  }

  function postingUrl(item) {
    return normalizeUrl(item.jobUrl) || normalizeUrl(item.sourceUrl) || ''
  }

  function urlHost(value) {
    try {
      return new URL(value).hostname.replace(/^www\./, '')
    } catch {
      return 'link'
    }
  }

  function sameUrl(first, second) {
    const normalize = (value) => {
      try {
        const url = new URL(normalizeUrl(value))
        return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`.toLowerCase()
      } catch {
        return ''
      }
    }
    return normalize(first) && normalize(first) === normalize(second)
  }

  function skillList(value) {
    return String(value || '')
      .split(/[,|]/)
      .map((skill) => skill.trim())
      .filter((skill) => skill && !['true', 'false', 'null'].includes(skill.toLowerCase()))
      .slice(0, 8)
  }

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const source = sourceOf(item)
        if (!showAdzuna && source === 'Adzuna') return false
        if (!showJobDataLake && source === 'JobDataLake') return false
        return true
      }),
    [items, showAdzuna, showJobDataLake],
  )
  const industries = useMemo(() => [...new Set(visibleItems.map((item) => item.company.industry).filter(Boolean))], [visibleItems])

  function updateShowAdzuna(value) {
    setShowAdzuna(value)
    localStorage.setItem('careertrack_show_adzuna_opportunities', String(value))
  }

  function updateShowJobDataLake(value) {
    setShowJobDataLake(value)
    localStorage.setItem('careertrack_show_jobdatalake_opportunities', String(value))
  }

  async function trackOpportunity(item) {
    try {
      await careerApi.createApplication({ jobOpportunityId: item.id, notes: `Tracked from Opportunities: ${sourceOf(item)}` })
      setTrackedIds((ids) => [...new Set([...ids, item.id])])
      setActionMessage(`Tracked "${item.title}" in Applications.`)
    } catch (error) {
      if (String(error.message || '').includes('already')) {
        setTrackedIds((ids) => [...new Set([...ids, item.id])])
        setActionMessage(`"${item.title}" is already tracked in Applications.`)
      } else {
        setActionMessage(`Could not track "${item.title}".`)
      }
    }
  }

  async function deleteOpportunity(item) {
    if (!window.confirm(`Delete "${item.title}" from opportunities?`)) return
    await careerApi.deleteOpportunity(item.id)
    setItems((current) => current.filter((entry) => entry.id !== item.id))
    setTrackedIds((ids) => ids.filter((id) => id !== item.id))
    setActionMessage(`Deleted "${item.title}" from Opportunities.`)
  }

  async function exportOpportunitiesCsv() {
    setExportingCsv(true)
    try {
      const blob = await careerApi.exportOpportunitiesCsv()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `careertrack-opportunities-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      setActionMessage('Opportunities CSV exported. You can re-import it from Data Hub later.')
    } catch (error) {
      setActionMessage(error.message || 'Could not export Opportunities CSV right now.')
    } finally {
      setExportingCsv(false)
    }
  }

  async function deleteAllOpportunities() {
    setDeletingAll(true)
    try {
      const result = await careerApi.deleteAllOpportunities()
      await refreshData()
      setLinkChecks({})
      setShowDeleteAllDialog(false)
      setActionMessage(
        `Deleted ${result.opportunitiesDeleted || 0} opportunities, ${result.applicationsDeleted || 0} linked applications, and ${result.interviewsDeleted || 0} linked interviews.`,
      )
    } catch (error) {
      setActionMessage(error.message || 'Could not delete all opportunities right now.')
    } finally {
      setDeletingAll(false)
    }
  }

  async function verifyJobLink(item) {
    const url = primaryUrl(item)
    const hasExistingUrl = Boolean(url)
    setCheckingLinks((ids) => [...new Set([...ids, item.id])])
    try {
      if (hasExistingUrl) {
        const result = await careerApi.verifyOpportunityLink({
          url,
          title: item.title,
          companyName: item.company?.name,
        })
        const finalUrl = normalizeUrl(result.finalUrl)
        const alternativeUrl = finalUrl && !sameUrl(finalUrl, url) ? finalUrl : ''
        const status =
          result.status === 'Verified'
            ? 'Verified: this link is reachable and looks like an application or careers page.'
            : result.status === 'Reachable'
              ? 'Reachable: the link opens, but it may be a general company page.'
              : friendlyUserMessage(result.message, 'This link could not be verified right now. Open it manually before applying.')

        setLinkChecks((checks) => ({
          ...checks,
          [item.id]: {
            status,
            alternativeUrl,
            isProblem: !result.isReachable,
          },
        }))
        setActionMessage(status)
        return
      }

      const status = await careerApi.aiStatus().catch(() => null)
      if (status && !status.configured) {
        const message = 'AI link search is unavailable because Gemini is not configured. Add a posting URL manually or open the company website.'
        setLinkChecks((checks) => ({
          ...checks,
          [item.id]: { status: message, isProblem: true },
        }))
        setActionMessage(message)
        return
      }
      const response = await careerApi.aiChat({
        message:
          `Find the most likely official application or careers URL for this role. Return only one URL if you can infer a reliable one. If you cannot, return exactly NO_LINK. No explanation.\n\nRole: ${item.title}\nCompany: ${item.company?.name}`,
        history: [],
      })
      const text = response.reply?.trim() || ''
      const urlMatch = text.match(/https?:\/\/[^\s)]+/i)
      const normalizedSuggestion = normalizeUrl(urlMatch?.[0])
      const exact = text.replace(/[.!]/g, '').trim().toUpperCase()

      let result
      if (normalizedSuggestion) {
        result = { status: 'Link found', alternativeUrl: normalizedSuggestion }
      } else if (exact === 'NO_LINK') {
        result = { status: 'AI could not find a reliable link' }
      } else {
        result = { status: 'AI link search is unavailable or could not find a reliable link right now.', isProblem: true }
      }

      setLinkChecks((checks) => ({
        ...checks,
        [item.id]: result,
      }))
      setActionMessage(result.status)
    } catch (error) {
      const message = friendlyUserMessage(error.message, 'Link checking is unavailable right now. You can still open the posting manually.')
      setLinkChecks((checks) => ({
        ...checks,
        [item.id]: {
          status: message,
          isProblem: true,
        },
      }))
      setActionMessage(message)
    } finally {
      setCheckingLinks((ids) => ids.filter((id) => id !== item.id))
    }
  }


  return {
    items,
    filters,
    setFilters,
    showAdzuna,
    showJobDataLake,
    includeShared,
    setIncludeShared,
    trackedIds,
    linkChecks,
    checkingLinks,
    actionMessage,
    clearActionMessage: () => setActionMessage(''),
    loading,
    error,
    clearError: () => setError(''),
    showDeleteAllDialog,
    setShowDeleteAllDialog,
    deletingAll,
    exportingCsv,
    visibleItems,
    industries,
    sourceOf,
    cleanText,
    primaryUrl,
    postingUrl,
    urlHost,
    skillList,
    updateShowAdzuna,
    updateShowJobDataLake,
    trackOpportunity,
    deleteOpportunity,
    exportOpportunitiesCsv,
    deleteAllOpportunities,
    verifyJobLink,
  }
}

export default useOpportunitiesController
