const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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
  database: 'dtm_complaints',
  user: 'dtm_user',
  password: 'yourpassword',
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

// Register
app.post('/api/register', async (req, res) => {
  const { username, password, role, name, department } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ error: 'Missing fields' });

  const email = username.toLowerCase();
  
  // Enforce college domain
  const COLLEGE_DOMAIN = '@srmist.edu.in';
  if (!email.endsWith(COLLEGE_DOMAIN)) {
    return res.status(400).json({ error: `Only college emails ending in ${COLLEGE_DOMAIN} are allowed.` });
  }

  try {
    const { rows: allowedRows } = await db.query('SELECT * FROM allowed_emails WHERE email = $1', [email]);
    if (allowedRows.length === 0) {
      return res.status(403).json({ error: 'Email not authorized for access. Please contact administration.' });
    }

    const { rows } = await db.query(
      `INSERT INTO users (username, password, role, name, department) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, password, role, name || email.split('@')[0], department || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') { // PostgreSQL unique violation code
      res.status(409).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ error: 'Missing fields' });

  try {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE username = $1 AND password = $2 AND role = $3`,
      [username.toLowerCase(), password, role]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });
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

// Default route for single page app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
