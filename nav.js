/* nav.js — BoutiqueAI Sidebar & Navigation */

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',     icon: '🏠', href: 'home.html' },
  { id: 'agents',        label: 'My Agents',      icon: '🤖', href: 'agents.html' },
  { id: 'conversations', label: 'Conversations',  icon: '💬', href: 'conversations.html' },
]
const NAV_BOTTOM = [
  { id: 'billing', label: 'Billing & Plans',  icon: '⚡', href: 'payments.html' },
  { id: 'account', label: 'Account Settings', icon: '⚙️', href: 'account.html' },
]

async function renderNav(activeId) {
  // Use requireAuth() from api.js — redirects if no token
  if (!requireAuth()) return null

  let user = null
  try {
    // Use apiFetch + apiHeaders from api.js — same pattern as VP
    const json = await apiFetch('/auth/me')
    if (json && (json.email || json.name)) {
      user = json
    } else if (json && !json.success) {
      // Only redirect to login if the token was actually cleared (real 401 auth failure).
      // apiFetch clears the token on HTTP 401 but NOT on network errors.
      // Without this check, a network timeout causes an infinite redirect loop:
      // protected page → /auth/me fails → redirect to index.html → token still
      // in localStorage → redirect back to protected page → repeat forever.
      if (!getToken()) {
        location.replace('/index.html')
        return null
      }
      // Network error: token is still valid, continue rendering nav without user info
      console.warn('nav: /auth/me failed but token intact — likely a network error, continuing')
    }
  } catch (e) { console.warn('nav fetch failed', e) }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const planLabels = {
    free: '🆓 Free', small: '🌱 Small', medium: '🌿 Medium', enterprise: '🏢 Enterprise',
    starter: '🆓 Free', grower: '🌱 Small',   // backward compat for existing users
  }
  const plan = user?.plan || 'free'
  const avatarHtml = user?.picture
    ? `<img src="${user.picture}" alt="" loading="lazy"/>`
    : `<span>${(user?.name?.[0] || 'U').toUpperCase()}</span>`

  const sidebarHtml = `
    <a class="sidebar-logo" href="home.html">
      <div class="logo-mark">B</div>
      <span>Boutique<span class="logo-ai">AI</span></span>
    </a>
    ${user ? `
    <a class="sidebar-user" href="account.html">
      <div class="sidebar-avatar">${avatarHtml}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${user.name || user.email || 'User'}</div>
        <div class="sidebar-user-plan">${planLabels[plan] || plan}</div>
      </div>
    </a>` : ''}
    <div class="nav-section">
      <div class="nav-section-label">Main</div>
      ${NAV_ITEMS.map(item => `
        <a class="nav-item ${activeId === item.id ? 'active' : ''}" href="${item.href}">
          <span class="nav-icon">${item.icon}</span><span>${item.label}</span>
        </a>`).join('')}
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Settings</div>
      ${NAV_BOTTOM.map(item => `
        <a class="nav-item ${activeId === item.id ? 'active' : ''}" href="${item.href}">
          <span class="nav-icon">${item.icon}</span><span>${item.label}</span>
        </a>`).join('')}
    </div>
    <div class="sidebar-bottom">
      <button class="btn-logout" onclick="doLogout()">
        <span>→</span> Sign Out
      </button>
    </div>`

  const sidebar = document.getElementById('sidebar')
  if (sidebar) sidebar.innerHTML = sidebarHtml

  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.textContent = isDark ? '☀️' : '🌙'
    btn.onclick = () => {
      const nowDark = document.documentElement.getAttribute('data-theme') === 'dark'
      document.documentElement[nowDark ? 'removeAttribute' : 'setAttribute']('data-theme', 'dark')
      localStorage.setItem('ba_theme', nowDark ? 'light' : 'dark')
      document.querySelectorAll('.theme-toggle').forEach(b => b.textContent = nowDark ? '🌙' : '☀️')
    }
  })

  const skel = document.getElementById('page-skeleton')
  if (skel) { skel.classList.add('skel-hiding'); setTimeout(() => skel.remove(), 320) }

  return { user }
}

function doLogout() { clearToken(); location.replace('/index.html') }
function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('open')
  document.getElementById('sidebarBackdrop')?.classList.add('open')
}
function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open')
  document.getElementById('sidebarBackdrop')?.classList.remove('open')
}
