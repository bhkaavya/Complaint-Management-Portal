const fs = require('fs');
const path = require('path');

// --- 1. Update styles.css ---
const cssPath = path.join(__dirname, 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

const lightTheme = `
[data-theme="light"] {
  --bg: #f8fafc;
  --bg-surface: #ffffff;
  --bg-card: #ffffff;
  --bg-card2: #f1f5f9;
  --border: rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 0, 0, 0.15);
  --text: #0f172a;
  --text-muted: #475569;
  --text-faint: #94a3b8;
  
  --indigo: #4f46e5;
  --indigo-l: #6366f1;
  --indigo-dk: #4338ca;
  --amber: #d97706;
  --emerald: #059669;
  --rose: #e11d48;
  --cyan: #0891b2;
}
[data-theme="light"] body::before {
  background:
    radial-gradient(ellipse 70% 50% at 15% 10%, rgba(99, 102, 241, 0.04) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 85% 90%, rgba(6, 182, 212, 0.03) 0%, transparent 55%);
}
[data-theme="light"] .login-card.student::after {
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.03), transparent 70%);
}
[data-theme="light"] .login-card.auth::after {
  background: radial-gradient(circle at 20% 20%, rgba(245, 158, 11, 0.03), transparent 70%);
}
[data-theme="light"] .login-card.admin::after {
  background: radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.03), transparent 70%);
}
[data-theme="light"] .topbar, [data-theme="light"] .student-navbar {
  background: rgba(255, 255, 255, 0.85);
}
[data-theme="light"] .lc-creds,
[data-theme="light"] .field input,
[data-theme="light"] .field select,
[data-theme="light"] .field textarea,
[data-theme="light"] .nav-item:hover,
[data-theme="light"] .notif-bell {
  background: rgba(0, 0, 0, 0.03);
}
[data-theme="light"] .modal-overlay {
  background: rgba(255, 255, 255, 0.4);
}
[data-theme="light"] .sidebar {
  background: #f8fafc;
}
`;

if (!css.includes('[data-theme="light"]')) {
  css = css.replace(/:root \{/g, ':root, [data-theme="dark"] {');
  css = css + lightTheme;
  
  const toggleCss = `
.theme-toggle {
  background: rgba(128, 128, 128, 0.1);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.1rem;
}
.theme-toggle:hover {
  background: rgba(128, 128, 128, 0.2);
  border-color: var(--border-hover);
}
.anon-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.anon-check input {
  width: auto;
  margin: 0;
  accent-color: var(--indigo);
}
`;
  css = css + toggleCss;
  fs.writeFileSync(cssPath, css, 'utf8');
}

// --- 2. Update app.js to include Theme Toggle logic ---
const appJsPath = path.join(__dirname, 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

if (!appJs.includes('initTheme()')) {
  const themeLogic = `
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
`;
  appJs = appJs + themeLogic;
  fs.writeFileSync(appJsPath, appJs, 'utf8');
}

// --- 3. Update HTML files ---
const htmlFiles = ['index.html', 'student.html', 'admin.html', 'authenticator.html'];
const toggleBtn = `    <button class="theme-toggle" onclick="toggleTheme()" title="Toggle Theme"><i class="ph ph-sun" id="theme-icon"></i></button>\n`;

for (const file of htmlFiles) {
  const fPath = path.join(__dirname, file);
  let html = fs.readFileSync(fPath, 'utf8');
  
  if (!html.includes('theme-toggle')) {
    if (file === 'index.html') {
      html = html.replace('<div class="login-logo">', toggleBtn + '    <div class="login-logo">');
    } else {
      // Find topbar right section
      if (html.includes('<div class="topbar-right">')) {
        html = html.replace('<div class="topbar-right">', '<div class="topbar-right">\n' + toggleBtn);
      } else if (file === 'student.html' && html.includes('<div style="display:flex;align-items:center;gap:0.75rem;">')) {
        html = html.replace('<div style="display:flex;align-items:center;gap:0.75rem;">', '<div style="display:flex;align-items:center;gap:0.75rem;">\n' + toggleBtn);
      }
    }
  }

  // Add Anonymous Checkbox to student.html
  if (file === 'student.html' && !html.includes('anon-check')) {
    html = html.replace(
      '<textarea id="complaint-text" placeholder="Describe your issue clearly and in detail…"></textarea>',
      '<textarea id="complaint-text" placeholder="Describe your issue clearly and in detail…"></textarea>\n                    <label class="anon-check"><input type="checkbox" id="anon-checkbox"> Submit anonymously</label>'
    );
    // Update logic for anonymous submission
    html = html.replace(
      /await addComplaint\(dept, text, session \? session\.name : 'Student'\);/g,
      `const isAnon = document.getElementById('anon-checkbox').checked;\n            await addComplaint(dept, text, isAnon ? 'Anonymous' : (session ? session.name : 'Student'));\n            document.getElementById('anon-checkbox').checked = false;`
    );
  }

  // Ensure data-theme is present in html tag, but actually JS does it immediately on load.
  // Still, putting <html data-theme="dark"> prevents flash.
  if (html.includes('<html lang="en">')) {
     html = html.replace('<html lang="en">', '<html lang="en" data-theme="dark">');
  }

  fs.writeFileSync(fPath, html, 'utf8');
}

console.log('UI updates for Theme and Anonymous complete.');
