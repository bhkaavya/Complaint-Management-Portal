const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOtpEmail(email, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`\n=== OTP EMAIL SIMULATION ===\nTo: ${email}\nOTP: ${otp}\n============================\n`);
    return;
  }
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Campus Portal - Your OTP Verification Code',
    text: `Your OTP for the Campus Complaint Management Portal is: ${otp}\n\nThis code is valid for 5 minutes.`
  };
  await transporter.sendMail(mailOptions);
}

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// PostgreSQL connection
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dtm_complaints',
  user: process.env.DB_USER || 'dtm_user',
  password: process.env.DB_PASS || 'yourpassword',
});



// Database Initialization
const initDB = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        department TEXT,
        "subProblem" TEXT,
        text TEXT,
        status TEXT,
        "authorName" TEXT,
        "createdAt" TEXT,
        "approvedAt" TEXT,
        "resolvedAt" TEXT,
        "rejectedAt" TEXT,
        "rejectionReason" TEXT
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_department ON complaints(department)
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        name TEXT,
        department TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS allowed_emails (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        role TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS issues_categories (
        "categoryId" TEXT PRIMARY KEY,
        "categoryName" TEXT,
        "departmentOwner" TEXT,
        "commonIssues" TEXT,
        priority TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS votes (
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
        "voterName" TEXT,
        UNIQUE(complaint_id, "voterName")
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
        "authorName" TEXT,
        role TEXT,
        text TEXT,
        "createdAt" TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        "forRole" TEXT,
        message TEXT,
        type TEXT,
        icon TEXT,
        read INTEGER DEFAULT 0,
        "createdAt" TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        email TEXT,
        otp TEXT,
        expires_at TIMESTAMP
      )
    `);

    // Add subProblem column if it doesn't exist (for existing databases)
    await db.query(`
      ALTER TABLE complaints ADD COLUMN IF NOT EXISTS "subProblem" TEXT
    `).catch(() => {}); // ignore if already exists

    // Add Image Upload and Location Geotag Support 
    await db.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`).catch(() => {});
    await db.query(`ALTER TABLE complaints ADD COLUMN IF NOT EXISTS geotag TEXT`).catch(() => {});

    console.log('Connected to PostgreSQL and tables initialized.');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
};

initDB();

// Helper: Get all complaints with their votes and comments
const getExpandedComplaints = async (dept) => {
  let query = `SELECT * FROM complaints`;
  let params = [];
  if (dept) {
    query += ` WHERE department = $1`;
    params.push(dept);
  }

  const { rows: complaints } = await db.query(query, params);
  const { rows: votes } = await db.query(`SELECT * FROM votes`);
  const { rows: comments } = await db.query(`SELECT * FROM comments`);

  return complaints.map(c => ({
    ...c,
    votes: votes.filter(v => v.complaint_id === c.id).map(v => v.voterName),
    comments: comments.filter(cm => cm.complaint_id === c.id)
  }));
};

// --- API Endpoints ---

// Register (Step 1: Validate & Send OTP)
app.post('/api/register', async (req, res) => {
  const { username, password, role, name, department } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Missing fields' });

  const email = username.toLowerCase();
  
  const COLLEGE_DOMAIN = '@srmist.edu.in';
  if (!email.endsWith(COLLEGE_DOMAIN)) {
    return res.status(400).json({ error: `Only college emails ending in ${COLLEGE_DOMAIN} are allowed.` });
  }

  try {
    if (role === 'admin' || role === 'authenticator') {
      const { rows: allowedRows } = await db.query('SELECT * FROM allowed_emails WHERE email = $1', [email]);
      if (allowedRows.length === 0 || allowedRows[0].role !== role) {
        return res.status(403).json({ error: `Email not authorized for the ${role} role. Please contact administration.` });
      }
    }

    // Check if user already exists
    const { rows: existingUsers } = await db.query('SELECT id FROM users WHERE username = $1', [email]);
    if (existingUsers.length > 0) return res.status(409).json({ error: 'Email already registered' });

    // Generate and store OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes
    
    await db.query('DELETE FROM otps WHERE email = $1', [email]);
    await db.query('INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)', [email, otp, expiresAt]);
    
    await sendOtpEmail(email, otp);
    
    res.status(200).json({ success: true, message: 'OTP sent successfully. Verification required.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Registration (Step 2)
app.post('/api/verify-registration', async (req, res) => {
  const { username, password, role, name, department, otp } = req.body;
  if (!username || !otp || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  const email = username.toLowerCase();

  try {
    const { rows: otps } = await db.query('SELECT * FROM otps WHERE email = $1 AND otp = $2 AND expires_at > NOW() ORDER BY id DESC LIMIT 1', [email, otp]);
    if (otps.length === 0) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await db.query('DELETE FROM otps WHERE email = $1', [email]);

    const { rows } = await db.query(
      `INSERT INTO users (username, password, role, name, department) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, password, role, name || email.split('@')[0], department || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login (Password Fallback)
app.post('/api/login', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE username = $1 AND password = $2 AND role = $3`,
      [username.toLowerCase(), password, role]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login OTP Request (Alternative Login)
app.post('/api/login-otp', async (req, res) => {
  const { username, role } = req.body;
  if (!username || !role) return res.status(400).json({ error: 'Missing fields' });
  const email = username.toLowerCase();

  try {
    const { rows: users } = await db.query('SELECT id FROM users WHERE username = $1 AND role = $2', [email, role]);
    if (users.length === 0) return res.status(404).json({ error: 'Account not found for this role. Please sign up.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000);
    
    await db.query('DELETE FROM otps WHERE email = $1', [email]);
    await db.query('INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)', [email, otp, expiresAt]);
    
    await sendOtpEmail(email, otp);
    res.status(200).json({ success: true, message: 'OTP sent for login' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Login OTP
app.post('/api/verify-login', async (req, res) => {
  const { username, role, otp } = req.body;
  if (!username || !role || !otp) return res.status(400).json({ error: 'Missing fields' });
  const email = username.toLowerCase();

  try {
    const { rows: otps } = await db.query('SELECT * FROM otps WHERE email = $1 AND otp = $2 AND expires_at > NOW() ORDER BY id DESC LIMIT 1', [email, otp]);
    if (otps.length === 0) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await db.query('DELETE FROM otps WHERE email = $1', [email]);

    const { rows } = await db.query('SELECT * FROM users WHERE username = $1 AND role = $2', [email, role]);
    if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const { dept } = req.query;
    const complaints = await getExpandedComplaints(dept);
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Categories
app.get('/api/categories', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM issues_categories ORDER BY "categoryId"');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Complaint
app.post('/api/complaints', upload.single('image'), async (req, res) => {
  const { department, subProblem, text, authorName, geotag } = req.body;
  const author = authorName || 'Student';
  const createdAt = new Date().toISOString();
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const { rows } = await db.query(
      `INSERT INTO complaints (department, "subProblem", text, status, "authorName", "createdAt", "imageUrl", geotag)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [department, subProblem || null, text, 'pending', author, createdAt, imageUrl, geotag || null]
    );
    const complaintId = rows[0].id;

    await db.query(
      `INSERT INTO votes (complaint_id, "voterName") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [complaintId, author]
    );

    res.status(201).json({
      id: complaintId,
      department,
      subProblem: subProblem || null,
      text,
      status: 'pending',
      authorName: author,
      createdAt,
      imageUrl,
      geotag: geotag || null,
      votes: [author],
      comments: []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upvote Complaint
app.post('/api/complaints/:id/upvote', async (req, res) => {
  const { id } = req.params;
  const { voterName } = req.body;
  const name = voterName || 'Student';

  try {
    await db.query(
      `INSERT INTO votes (complaint_id, "voterName") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, name]
    );
    res.json({ success: true, message: 'Upvoted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Complaint Status (approve, resolve)
app.put('/api/complaints/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const now = new Date().toISOString();

  let query = `UPDATE complaints SET status = $1 WHERE id = $2`;
  let params = [status, id];

  if (status === 'approved') {
    query = `UPDATE complaints SET status = $1, "approvedAt" = $2 WHERE id = $3`;
    params = [status, now, id];
  } else if (status === 'resolved') {
    query = `UPDATE complaints SET status = $1, "resolvedAt" = $2 WHERE id = $3`;
    params = [status, now, id];
  }

  try {
    await db.query(query, params);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject Complaint
app.put('/api/complaints/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const now = new Date().toISOString();

  try {
    await db.query(
      `UPDATE complaints SET status = 'rejected', "rejectedAt" = $1, "rejectionReason" = $2 WHERE id = $3`,
      [now, reason || 'No reason given', id]
    );
    res.json({ success: true, status: 'rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Comment
app.post('/api/complaints/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { authorName, role, text } = req.body;
  const createdAt = new Date().toISOString();

  try {
    const { rows } = await db.query(
      `INSERT INTO comments (complaint_id, "authorName", role, text, "createdAt")
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [id, authorName, role, text, createdAt]
    );
    res.status(201).json({ id: rows[0].id, authorName, role, text, createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Notifications
app.get('/api/notifications', async (req, res) => {
  const { forRole } = req.query;
  let query = `SELECT * FROM notifications`;
  let params = [];

  if (forRole) {
    query += ` WHERE "forRole" = $1`;
    params = [forRole];
  }

  try {
    const { rows } = await db.query(query, params);
    const notifications = rows.map(r => ({ ...r, read: !!r.read }));
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Notification
app.post('/api/notifications', async (req, res) => {
  const { forRole, message, type = 'info', icon = 'ℹ️' } = req.body;
  const createdAt = new Date().toISOString();

  try {
    const { rows } = await db.query(
      `INSERT INTO notifications ("forRole", message, type, icon, "createdAt")
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [forRole, message, type, icon, createdAt]
    );
    res.status(201).json({ id: rows[0].id, forRole, message, type, icon, read: false, createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark Notification Read
app.put('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`UPDATE notifications SET read = 1 WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark All Notifications Read
app.put('/api/notifications/read-all', async (req, res) => {
  const { forRole } = req.body;
  try {
    await db.query(`UPDATE notifications SET read = 1 WHERE "forRole" = $1`, [forRole]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin: Authorized Emails Management ---

// Get all allowed emails
app.get('/api/admin/allowed-emails', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM allowed_emails ORDER BY email ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new allowed email
app.post('/api/admin/allowed-emails', async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'Email and role are required' });
  
  try {
    const { rows } = await db.query(
      'INSERT INTO allowed_emails (email, role) VALUES ($1, $2) RETURNING *',
      [email.toLowerCase(), role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email already in authorized list' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Remove an allowed email
app.delete('/api/admin/allowed-emails/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM allowed_emails WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Default route for single page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
