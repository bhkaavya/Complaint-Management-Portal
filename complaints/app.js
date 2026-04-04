// ─── Shared App Logic ───────────────────────────────────────────

const DEPARTMENTS = ['Canteen', 'Academics', 'Hostel', 'Library & Sports', 'Security', 'Transportation', 'Infrastructure', 'Cleanliness'];

const SUB_PROBLEMS = {
  'Canteen': ['Poor food quality', 'Hygiene issues', 'Overcharging', 'Other'],
  'Academics': ['Class cancellation', 'Faculty absence', 'Syllabus delay', 'Other'],
  'Hostel': ['Room maintenance', 'Water supply', 'Electricity issue', 'Other'],
  'Library & Sports': ['Book availability', 'Equipment damage', 'Timing issue', 'Other'],
  'Security': ['Gate access', 'Lost item', 'Safety concern', 'Other'],
  'Transportation': ['Bus delay', 'Overcrowding', 'Driver behavior', 'Other'],
  'Infrastructure': ['Broken furniture', 'AC/Fan not working', 'Washroom cleanliness', 'Other'],
  'Cleanliness': ['Classroom dust', 'Corridor litter', 'Odor issue', 'Other']
};

const API_URL = '/api';

// ─── Theme ───────────────────────────────────────────────────────
function initTheme() {
  const theme = localStorage.getItem('app_theme') || 'dark';
  document.documentElement.dataset.theme = theme;
  updateThemeIcon();
}
function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('app_theme', next);
  updateThemeIcon();
}
function updateThemeIcon() {
  const btns = document.querySelectorAll('.theme-toggle');
  const theme = document.documentElement.dataset.theme || 'dark';
  btns.forEach(btn => btn.textContent = theme === 'dark' ? '☀️' : '🌙');
}
// Run immediately if this script is parsed early
initTheme();

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${endpoint}`, options);
  if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  return res.json();
}

// ─── Complaints Storage ──────────────────────────────────────────
async function getComplaints(dept = null) {
  return await apiRequest(`/complaints${dept ? `?dept=${encodeURIComponent(dept)}` : ''}`);
}
async function addComplaint(department, subProblem, text, authorName, imageFile, geotag) {
  const formData = new FormData();
  formData.append('department', department);
  if (subProblem) formData.append('subProblem', subProblem);
  formData.append('text', text);
  if (authorName) formData.append('authorName', authorName);
  if (geotag) formData.append('geotag', geotag);
  if (imageFile) formData.append('image', imageFile);

  const res = await fetch(`${API_URL}/complaints`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  return res.json();
}
async function findSimilarOpenComplaint(department) {
  const all = await getComplaints();
  return all.find(c => c.department === department && (c.status === 'pending' || c.status === 'approved')) || null;
}
async function upvoteComplaint(id, voterName) {
  return await apiRequest(`/complaints/${id}/upvote`, 'POST', { voterName });
}
async function updateComplaintStatus(id, status) {
  return await apiRequest(`/complaints/${id}/status`, 'PUT', { status });
}
async function rejectComplaint(id, reason) {
  return await apiRequest(`/complaints/${id}/reject`, 'PUT', { reason });
}

// ─── Comments ────────────────────────────────────────────────────
async function addComment(complaintId, authorName, role, text) {
  return await apiRequest(`/complaints/${complaintId}/comments`, 'POST', { authorName, role, text });
}

// ─── Notifications ───────────────────────────────────────────────
async function getNotifications(forRole) {
  return await apiRequest(`/notifications${forRole ? `?forRole=${forRole}` : ''}`);
}
async function addNotification(forRole, message, type = 'info', icon = '<i class="ph ph-info"></i>') {
  return await apiRequest('/notifications', 'POST', { forRole, message, type, icon });
}
async function markNotificationRead(id) {
  return await apiRequest(`/notifications/${id}/read`, 'PUT');
}
async function markAllNotificationsRead(forRole) {
  return await apiRequest(`/notifications/read-all`, 'PUT', { forRole });
}
async function getUnreadCount(forRole) {
  const notifs = await getNotifications(forRole);
  return notifs.filter(n => !n.read).length;
}

// ─── Session ─────────────────────────────────────────────────────
function getSession() {
  return JSON.parse(sessionStorage.getItem('app_session') || 'null');
}
function setSession(role, name, dept) {
  sessionStorage.setItem('app_session', JSON.stringify({ role, name, dept, loginTime: Date.now() }));
}
function clearSession() { sessionStorage.removeItem('app_session'); }
function logout() { clearSession(); window.location.href = 'index.html'; }
function requireRole(role) {
  const session = getSession();
  if (!session || session.role !== role) { window.location.href = 'index.html'; return null; }
  return session;
}

// ─── Toast ───────────────────────────────────────────────────────
function showToast(message, type = 'info', icon = null) {
  const icons = { success: '<i class="ph ph-check-circle"></i>', error: '<i class="ph ph-x-circle"></i>', info: '<i class="ph ph-info"></i>', warning: '<i class="ph ph-warning"></i>' };
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon || icons[type]}</span><span class="toast-text">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}
function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container'; div.className = 'toast-container';
  document.body.appendChild(div); return div;
}

// ─── Helpers ─────────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function deptClass(dept) {
  const map = { Canteen: 'dept-canteen', Academics: 'dept-academics', Hostel: 'dept-hostel', 'Library & Sports': 'dept-library-sports', Security: 'dept-security', Transportation: 'dept-transportation', Infrastructure: 'dept-infrastructure', Cleanliness: 'dept-cleanliness' };
  return map[dept] || 'dept-canteen';
}
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escJs(str) { return String(str).replace(/'/g, "\\'").substring(0, 200); }

// ─── SLA Timer ───────────────────────────────────────────────────
function getSLAInfo(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = ms / 3600000;
  const days = hours / 24;
  let label, colorClass, overdue = false;
  if (hours < 24) { label = `${Math.round(hours)}h ago`; colorClass = 'sla-ok'; }
  else if (days < 3) { label = `${Math.floor(days)}d ${Math.round((days % 1) * 24)}h ago`; colorClass = 'sla-warn'; }
  else { label = `${Math.floor(days)} days ago`; colorClass = 'sla-over'; overdue = true; }
  return { label, colorClass, overdue };
}

// ─── Notification Bell (shared UI) ───────────────────────────────
async function initNotificationBell(role) {
  const bellEl = document.getElementById('notif-bell');
  const countEl = document.getElementById('notif-count');
  const dropEl = document.getElementById('notif-drop');
  if (!bellEl) return;

  async function refresh() {
    try {
      const unread = await getUnreadCount(role);
      countEl.textContent = unread;
      countEl.style.display = unread > 0 ? 'flex' : 'none';
    } catch (e) {
      console.warn('Failed to fetch notifications:', e.message);
    }
  }

  bellEl.addEventListener('click', async (e) => {
    e.stopPropagation();
    const notifsParams = await getNotifications(role);
    const notifs = notifsParams.slice().reverse();
    if (!notifs.length) {
      dropEl.innerHTML = '<div style="padding:1rem;color:var(--text-muted);font-size:0.83rem;text-align:center;">No notifications</div>';
    } else {
      dropEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;border-bottom:1px solid var(--border);">
          <span style="font-size:0.85rem;font-weight:600;">Notifications</span>
          <button onclick="markAllNotificationsRead('${role}').then(() => { initNotificationBell('${role}'); document.getElementById('notif-drop').style.display='none'; })" style="background:none;border:none;color:var(--text-muted);font-size:0.75rem;cursor:pointer;">Mark all read</button>
        </div>
        ${notifs.map(n => `
          <div onclick="markNotificationRead(${n.id}).then(() => { this.style.opacity='0.5'; refresh(); })" style="padding:0.75rem 1rem;border-bottom:1px solid var(--border);cursor:pointer;opacity:${n.read ? '0.5' : '1'};transition:opacity 0.2s;">
            <div style="font-size:0.83rem;line-height:1.5;display:flex;gap:0.5rem;">
              <span>${n.icon}</span>
              <span>${escHtml(n.message)}</span>
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem;padding-left:1.5rem;">${formatTime(n.createdAt)}</div>
          </div>
        `).join('')}
      `;
    }
    dropEl.style.display = dropEl.style.display === 'block' ? 'none' : 'block';
    await markAllNotificationsRead(role);
    setTimeout(refresh, 500);
  });
  document.addEventListener('click', () => { dropEl.style.display = 'none'; });
  refresh();
  setInterval(refresh, 5000);
}

// ─── Comment Thread HTML ──────────────────────────────────────────
function renderCommentThread(complaint, inputRole, inputName) {
  const comments = complaint.comments || [];
  const roleColors = { authenticator: '#f59e0b', admin: '#10b981', student: '#818cf8' };
  const commentsHtml = comments.length ? comments.map(c => `
    <div style="display:flex;gap:0.6rem;margin-bottom:0.6rem;">
      <div style="width:26px;height:26px;border-radius:50%;background:${roleColors[c.role] || '#818cf8'}22;border:1px solid ${roleColors[c.role] || '#818cf8'}44;display:flex;align-items:center;justify-content:center;font-size:0.7rem;flex-shrink:0;color:${roleColors[c.role] || '#818cf8'};font-weight:700;">${c.authorName.charAt(0).toUpperCase()}</div>
      <div style="flex:1;">
        <div style="font-size:0.75rem;color:${roleColors[c.role] || '#818cf8'};font-weight:600;margin-bottom:0.2rem;">${escHtml(c.authorName)} <span style="color:var(--text-muted);font-weight:400;">· ${formatTime(c.createdAt)}</span></div>
        <div style="font-size:0.83rem;color:var(--text);line-height:1.5;">${escHtml(c.text)}</div>
      </div>
    </div>
  `).join('') : '<div style="font-size:0.78rem;color:var(--text-muted);font-style:italic;padding:0.25rem 0;">No responses yet.</div>';

  const inputHtml = inputRole ? `
    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
      <input id="comment-input-${complaint.id}" type="text" placeholder="Add a note or response…"
        style="flex:1;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:0.5rem 0.75rem;color:var(--text);font-family:Inter,sans-serif;font-size:0.82rem;outline:none;"
        onkeydown="if(event.key==='Enter')submitComment(${complaint.id},'${escJs(inputName)}','${inputRole}')" />
      <button onclick="submitComment(${complaint.id},'${escJs(inputName)}','${inputRole}')"
        style="padding:0.5rem 0.9rem;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);color:#818cf8;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer;white-space:nowrap;">
        Send 💬
      </button>
    </div>
  ` : '';

  return `
    <div class="comment-thread" style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);">
      <div style="font-size:0.72rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem;">Responses</div>
      ${commentsHtml}
      ${inputHtml}
    </div>
  `;
}

// ─── Theme Management ────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('app_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('app_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btns = document.querySelectorAll('.theme-toggle');
  btns.forEach(btn => {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
}
window.addEventListener('DOMContentLoaded', initTheme);
