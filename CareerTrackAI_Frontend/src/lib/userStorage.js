export function currentUserStorageSuffix() {
  try {
    const user = JSON.parse(localStorage.getItem('careertrack_user') || 'null')
    return user?.id || user?.email || 'guest'
  } catch {
    return 'guest'
  }
}

export function scopedStorageKey(key) {
  return `${key}:${currentUserStorageSuffix()}`
}

export function readScopedJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(scopedStorageKey(key)) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

export function writeScopedJson(key, value) {
  localStorage.setItem(scopedStorageKey(key), JSON.stringify(value))
}

export function readScopedText(key, fallback = '') {
  try {
    return localStorage.getItem(scopedStorageKey(key)) || fallback
  } catch {
    return fallback
  }
}

export function writeScopedText(key, value) {
  localStorage.setItem(scopedStorageKey(key), value)
}

export function removeScopedStorage(key) {
  localStorage.removeItem(scopedStorageKey(key))
}
