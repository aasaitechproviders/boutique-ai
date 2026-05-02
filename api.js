/* api.js — BoutiqueAI API helper */

const API = 'https://ekbg3nf6b6vr6i3ssxxni3g6ia0jwcwm.lambda-url.ap-southeast-2.on.aws'
const SUBDOMAIN_BASE = 'boutiquesaas.aasaitech.in'

// ── SESSION + TOKEN ─────────────────────────────────────────
let token = localStorage.getItem('ba_token') || ''
let sessionId = localStorage.getItem('ba_session') || (() => {
  const s = 'sess_' + Math.random().toString(36).slice(2)
  localStorage.setItem('ba_session', s)
  return s
})()

function getToken()  { return localStorage.getItem('ba_token') }
function clearToken(){ localStorage.removeItem('ba_token'); token = '' }

// ── HEADERS ─────────────────────────────────────────────────
// auth=true  → include Authorization header (default for protected pages)
// auth=false → skip auth header (e.g. public endpoints)
function apiHeaders(auth = true) {
  const h = { 'Content-Type': 'application/json', 'x-session-id': sessionId }
  if (auth && token) h['Authorization'] = 'Bearer ' + token
  return h
}

// ── FETCH ───────────────────────────────────────────────────
// Never throws, always returns parsed JSON.
// Backend always wraps success as { success: true, data: X }.
// This function auto-unwraps that envelope so every caller gets X
// directly — no page needs to do .data themselves.
// Error responses { success: false, error: '...' } pass through as-is.
// Network failures return { success: false, error: '...', message: '...' }
async function apiFetch(path, opts = {}) {
  if (!opts.headers) opts.headers = apiHeaders()
  try {
    const res = await fetch(API + path, opts)
    if (res.status === 401) clearToken()
    const json = await res.json()
    // Unwrap { success: true, data: X } → return X directly
    return (json && json.success === true && json.data !== undefined) ? json.data : json
  } catch (e) {
    console.error('apiFetch', path, e)
    return { success: false, error: e.message, message: e.message }
  }
}

// ── AUTH GUARD ───────────────────────────────────────────────
// Call at the top of any page that requires login.
// Redirects to index.html when no token is present.
function requireAuth() {
  if (!token) {
    location.replace('/index.html')
    return false
  }
  return true
}

// ── TOAST ───────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' }
  const c = document.getElementById('toast-container')
  if (!c) return
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${msg}</span>`
  el.onclick = () => dismiss(el)
  c.appendChild(el)
  const t = setTimeout(() => dismiss(el), duration)
  function dismiss(el) { clearTimeout(t); el.classList.add('hiding'); setTimeout(() => el.remove(), 200) }
}

// ── FORMATTERS ───────────────────────────────────────────────
function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtRelative(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return Math.floor(diff / 86400000) + 'd ago'
}

function toSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '')
}

// ── AGENT URL HELPERS ───────────────────────────────────────
function agentUrl(agent) {
  if (!agent.published || !agent.slug) return null
  if (agent.custom_domain) return 'https://' + agent.custom_domain
  return 'https://' + agent.slug + '.' + SUBDOMAIN_BASE
}

function agentUrlDisplay(agent) {
  if (!agent.published || !agent.slug) return 'Not published yet'
  if (agent.custom_domain) return agent.custom_domain
  return agent.slug + '.' + SUBDOMAIN_BASE
}

// ── CLIPBOARD ───────────────────────────────────────────────
function copyText(text, label = 'Copied!') {
  navigator.clipboard.writeText(text)
    .then(() => toast(label, 'success'))
    .catch(() => {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy')
      ta.remove(); toast(label, 'success')
    })
}

function shareUrl(url, name) {
  if (navigator.share) { navigator.share({ title: name, url }).catch(() => {}) }
  else { copyText(url, 'Link copied!') }
}
