const fs = require('fs');

// Patch App.js to remove static USERS
let appDb = fs.readFileSync('app.js', 'utf8');
appDb = appDb.replace(/const USERS = \{[\s\S]*?\};\n/, '');
fs.writeFileSync('app.js', appDb);

// Patch index.html to use POST /api/login and remove static USERS check
let indexDb = fs.readFileSync('index.html', 'utf8');

const oldCheck = `const s = getSession();\n    if (s) { const u = Object.values(USERS).find(u => u.role === s.role); if (u) window.location.href = u.page; }`;
const newCheck = `const s = getSession();\n    if (s) { const pages = { student: 'student.html', authenticator: 'authenticator.html', admin: 'admin.html' }; window.location.href = pages[s.role]; }`;
indexDb = indexDb.replace(oldCheck, newCheck);

const oldLogin = `const u = USERS[user];
      if (!u || u.password !== pass || u.role !== currentRole) { errEl.style.display = 'block'; return; }
      setSession(u.role, u.name, u.dept);
      showToast('Welcome back!', 'success');
      setTimeout(() => window.location.href = u.page, 500);`;
      
const newLogin = `try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass, role: currentRole })
        });
        if (!res.ok) { errEl.style.display = 'block'; return; }
        const u = await res.json();
        setSession(u.role, u.name, u.department);
        showToast('Welcome back!', 'success');
        const pages = { student: 'student.html', authenticator: 'authenticator.html', admin: 'admin.html' };
        setTimeout(() => window.location.href = pages[u.role], 500);
      } catch (err) {
        errEl.style.display = 'block';
      }`;

// In case the replacement fails with strict space match, let's use a regex
indexDb = indexDb.replace(/const u = USERS\[user\];[\s\S]*?setTimeout\(\(\) => window\.location\.href = u\.page, 500\);/, newLogin);

fs.writeFileSync('index.html', indexDb);
console.log('Frontend patched successfully for DB login');
