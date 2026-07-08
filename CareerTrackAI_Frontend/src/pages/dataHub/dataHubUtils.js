import { Bot, Building2, FileText, FileUp } from 'lucide-react'
import { readScopedJson } from '../../lib/userStorage.js'

export const companyHeaders = ['name', 'industry', 'description', 'city', 'country', 'website', 'email', 'phone', 'linkedInUrl', 'logoUrl', 'sourceUrl', 'sourceProvider']
export const visibleCompanyFields = companyHeaders
export const opportunityHeaders = [
  'title',
  'companyName',
  'type',
  'employmentType',
  'description',
  'location',
  'isRemote',
  'salaryMin',
  'salaryMax',
  'applicationDeadline',
  'requiredSkills',
  'jobUrl',
  'sourceUrl',
  'sourceProvider',
]

export const tabs = [
  ['companies', 'Database', Building2],
  ['resumes', 'CVs', FileText],
  ['manual', 'Manual CSV', FileUp],
  ['ai', 'Sourcing', Bot],
]

export const visibleOpportunityFields = ['title', 'companyName', 'type', 'employmentType', 'location', 'jobUrl', 'sourceProvider']
export const DATA_HUB_PREVIEW_STORAGE_KEY = 'careertrack_data_hub_preview_v2'

export function readStoredDataHubPreview() {
  return readScopedJson(DATA_HUB_PREVIEW_STORAGE_KEY, {})
}

export function escapeCsv(value = '') {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export function toCsv(rows, headers = companyHeaders) {
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','))].join('\n')
}

export function downloadCsv(filename, rows, headers = companyHeaders) {
  const blob = new Blob([toCsv(rows, headers)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function parseCsvLine(line) {
  const values = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"' && line[index + 1] === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map((item) => item.trim())
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce((row, header, index) => ({ ...row, [header]: values[index] || '' }), {})
  })
}

export function guessIndustry(name = '', website = '') {
  const source = `${name} ${website}`.toLowerCase()
  if (source.includes('bank') || source.includes('pay') || source.includes('stripe')) return 'Fintech'
  if (source.includes('health') || source.includes('medical')) return 'Healthcare'
  if (source.includes('ai') || source.includes('data')) return 'Artificial Intelligence'
  if (source.includes('telecom')) return 'Telecommunications'
  if (source.includes('energy')) return 'Energy Technology'
  return 'Technology'
}

export function opportunityToRow(item) {
  return {
    title: item.title,
    companyName: item.company?.name || 'Unknown company',
    type: item.type || 'Job',
    employmentType: item.employmentType || 'FullTime',
    description: item.description || '',
    location: item.location || item.company?.city || '',
    isRemote: String(Boolean(item.isRemote)),
    salaryMin: item.salaryMin || '',
    salaryMax: item.salaryMax || '',
    applicationDeadline: item.applicationDeadline || '',
    requiredSkills: item.requiredSkills || '',
    jobUrl: item.jobUrl || '',
    sourceUrl: item.sourceUrl || item.jobUrl || '',
    sourceProvider: item.sourceProvider || item.company?.sourceProvider || '',
  }
}

export function companyToRow(item) {
  return {
    name: item.name || '',
    industry: item.industry || '',
    description: item.description || '',
    city: item.city || '',
    country: item.country || '',
    website: item.website || '',
    email: item.email || '',
    phone: item.phone || '',
    linkedInUrl: item.linkedInUrl || '',
    logoUrl: item.logoUrl || '',
    sourceUrl: item.sourceUrl || '',
    sourceProvider: item.sourceProvider || '',
  }
}

export function normalizeKey(value = '') {
  return value.trim().replace(/\s+/g, '').toLowerCase()
}

export function normalizeSearchText(value = '') {
  return String(value || '').toLowerCase().trim()
}

export function matchesText(value, term) {
  return normalizeSearchText(value).includes(term)
}

export function uniqueValues(items, selector) {
  return [...new Set(items.map(selector).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
}

export function getRowValue(row, ...keys) {
  const entries = Object.entries(row || {}).reduce((acc, [key, value]) => {
    acc[normalizeKey(key)] = value
    return acc
  }, {})

  for (const key of keys) {
    const value = entries[normalizeKey(key)]
    if (value !== undefined && String(value).trim() !== '') return value
  }
  return ''
}

export function normalizeRowForDataset(row, dataset) {
  if (dataset === 'companies') {
    return {
      name: getRowValue(row, 'name', 'companyName', 'company'),
      industry: getRowValue(row, 'industry', 'sector'),
      description: getRowValue(row, 'description', 'notes'),
      city: getRowValue(row, 'city', 'location'),
      country: getRowValue(row, 'country'),
      website: getRowValue(row, 'website', 'url'),
      email: getRowValue(row, 'email'),
      phone: getRowValue(row, 'phone'),
      linkedInUrl: getRowValue(row, 'linkedInUrl', 'linkedinurl', 'linkedin'),
      logoUrl: getRowValue(row, 'logoUrl', 'logourl'),
      sourceUrl: getRowValue(row, 'sourceUrl', 'sourceurl'),
      sourceProvider: getRowValue(row, 'sourceProvider', 'source'),
    }
  }

  return {
    title: getRowValue(row, 'title', 'role', 'position'),
    companyName: getRowValue(row, 'companyName', 'company', 'name'),
    type: getRowValue(row, 'type', 'opportunityType'),
    employmentType: getRowValue(row, 'employmentType', 'employment'),
    description: getRowValue(row, 'description', 'notes'),
    location: getRowValue(row, 'location', 'city'),
    isRemote: getRowValue(row, 'isRemote', 'remote'),
    salaryMin: getRowValue(row, 'salaryMin', 'minimumSalary', 'minSalary'),
    salaryMax: getRowValue(row, 'salaryMax', 'maximumSalary', 'maxSalary'),
    applicationDeadline: getRowValue(row, 'applicationDeadline', 'deadline'),
    requiredSkills: getRowValue(row, 'requiredSkills', 'skills'),
    jobUrl: getRowValue(row, 'jobUrl', 'url', 'applyUrl', 'applicationUrl'),
    sourceUrl: getRowValue(row, 'sourceUrl', 'sourceurl'),
    sourceProvider: getRowValue(row, 'sourceProvider', 'source'),
  }
}

export function buildFallbackFilledRow(row, dataset) {
  const normalized = normalizeRowForDataset(row, dataset)
  if (dataset === 'companies') {
    return {
      ...normalized,
      industry: normalized.industry || guessIndustry(normalized.name, normalized.website),
      description: normalized.description || `Lead for ${normalized.name || 'this company'}. Verify details before importing.`,
      sourceProvider: normalized.sourceProvider || 'Manual CSV',
    }
  }

  return {
    ...normalized,
    type: normalized.type || 'Internship',
    employmentType: normalized.employmentType || 'FullTime',
    isRemote: normalized.isRemote || 'false',
    requiredSkills: normalized.requiredSkills || 'Communication, Problem Solving',
    description: normalized.description || `Opportunity draft for ${normalized.title || 'this role'}. Verify details before importing.`,
    sourceProvider: normalized.sourceProvider || 'Manual CSV',
  }
}

export function parseAiFilledRows(reply = '') {
  const cleaned = reply.replace(/```json/gi, '').replace(/```/g, '').trim()
  const candidates = [cleaned]
  const arrayStart = cleaned.indexOf('[')
  const arrayEnd = cleaned.lastIndexOf(']')
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(cleaned.slice(arrayStart, arrayEnd + 1))
  const objectStart = cleaned.indexOf('{')
  const objectEnd = cleaned.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(cleaned.slice(objectStart, objectEnd + 1))

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (Array.isArray(parsed)) return parsed
      if (Array.isArray(parsed.rows)) return parsed.rows
    } catch {
      // Try the next JSON candidate.
    }
  }

  return []
}

export function mergeMissingFields(row, suggestion, dataset) {
  const headers = dataset === 'companies' ? companyHeaders : opportunityHeaders
  const current = normalizeRowForDataset(row, dataset)
  const fallback = buildFallbackFilledRow(row, dataset)
  const suggested = normalizeRowForDataset(suggestion || {}, dataset)

  return headers.reduce((next, header) => {
    next[header] = current[header] || suggested[header] || fallback[header] || ''
    return next
  }, {})
}
