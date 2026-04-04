const fs = require('fs');
const path = require('path');

const files = ['index.html', 'student.html', 'admin.html', 'authenticator.html'];

for (const file of files) {
  let content = fs.readFileSync(path.join(__dirname, file), 'utf8');

  // Convert functions calling API to async
  content = content.replace(/function openLogin\(/g, 'async function openLogin(');
  content = content.replace(/function doLogin\(/g, 'async function doLogin(');
  content = content.replace(/function onDeptChange\(/g, 'async function onDeptChange(');
  content = content.replace(/function doUpvote\(/g, 'async function doUpvote(');
  content = content.replace(/function submitComplaint\(/g, 'async function submitComplaint(');
  content = content.replace(/function renderSubmissions\(/g, 'async function renderSubmissions(');
  
  content = content.replace(/function renderPending\(/g, 'async function renderPending(');
  content = content.replace(/function renderAllRecent\(/g, 'async function renderAllRecent(');
  content = content.replace(/function doApprove\(/g, 'async function doApprove(');
  content = content.replace(/function confirmApprove\(/g, 'async function confirmApprove(');
  content = content.replace(/function showRejectDialog\(/g, 'async function showRejectDialog(');
  content = content.replace(/function confirmReject\(/g, 'async function confirmReject(');
  content = content.replace(/function submitComment\(/g, 'async function submitComment(');
  
  content = content.replace(/function renderDashboard\(/g, 'async function renderDashboard(');
  content = content.replace(/function renderApproved\(/g, 'async function renderApproved(');
  content = content.replace(/function renderRejected\(/g, 'async function renderRejected(');
  content = content.replace(/function renderResolved\(/g, 'async function renderResolved(');
  content = content.replace(/function doResolve\(/g, 'async function doResolve(');
  content = content.replace(/function confirmResolve\(/g, 'async function confirmResolve(');
  
  // Replace API calls with await
  content = content.replace(/const existing = findSimilarOpenComplaint\(/g, 'const existing = await findSimilarOpenComplaint(');
  content = content.replace(/upvoteComplaint\(/g, 'await upvoteComplaint(');
  content = content.replace(/addComplaint\(/g, 'await addComplaint(');
  content = content.replace(/const all = getComplaints\(/g, 'const all = await getComplaints(');
  content = content.replace(/const c = getComplaints\(\).find/g, 'const __all = await getComplaints();\n            const c = __all.find');
  content = content.replace(/updateComplaintStatus\(/g, 'await updateComplaintStatus(');
  content = content.replace(/rejectComplaint\(/g, 'await rejectComplaint(');
  content = content.replace(/addNotification\(/g, 'await addNotification(');
  content = content.replace(/addComment\(/g, 'await addComment(');
  
  content = content.replace(/const fwd = getComplaints\(\).filter/g, 'const fwd = (await getComplaints()).filter');
  content = content.replace(/const rej = getComplaints\(\).filter/g, 'const rej = (await getComplaints()).filter');
  content = content.replace(/const res = getComplaints\(\).filter/g, 'const res = (await getComplaints()).filter');

  // Fix API Login since we don't have users in localStorage anymore
  if (file === 'index.html') {
    content = content.replace(
      /const u = USERS\[user\];\n      if \(!u \|\| u.password !== pass \|\| u\.role !== currentRole\) \{ errEl.style.display = 'block'; return; \}/g,
      `try {
        const res = await fetch('/api/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass, role: currentRole })
        });
        if (!res.ok) throw new Error('Invalid login');
        const data = await res.json();
        const u = data.user;`
    );
    // add a closing brace for the try check
    content = content.replace(
      /setTimeout\(\(\) => window.location.href = u.page, 500\);\n    \}/g,
      `setTimeout(() => window.location.href = u.page, 500);
      } catch (err) {
        errEl.style.display = 'block';
      }
    }`
    );
  }

  fs.writeFileSync(path.join(__dirname, file), content, 'utf8');
}
console.log('HTML files successfully updated for async APIs.');
