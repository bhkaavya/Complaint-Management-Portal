const fs = require('fs');
let serverDb = fs.readFileSync('server.js', 'utf8');

// Add users table creation
if (!serverDb.includes('CREATE TABLE IF NOT EXISTS users')) {
    serverDb = serverDb.replace(
        /db\.run\(`CREATE INDEX IF NOT EXISTS idx_department ON complaints\(department\)`\);/,
        `db.run(\`CREATE INDEX IF NOT EXISTS idx_department ON complaints(department)\`);\n      db.run(\`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT, name TEXT, department TEXT)\`);`
    );
}

// Add login endpoint
if (!serverDb.includes('app.post(\'/api/login\'')) {
    const loginEndpoint = `\n// Login Endpoint\napp.post('/api/login', (req, res) => {\n  const { username, password, role } = req.body;\n  db.get('SELECT * FROM users WHERE username = ? AND password = ? AND role = ?', [username, password, role], (err, row) => {\n    if (err) return res.status(500).json({ error: err.message });\n    if (!row) return res.status(401).json({ error: 'Invalid credentials' });\n    res.json(row);\n  });\n});\n\n`;
    serverDb = serverDb.replace(/(\/\/ Start Server)/, loginEndpoint + '$1');
}

// Optionally remove USERS object
serverDb = serverDb.replace(/const USERS = \{[\s\S]*?\};\n/, '');

fs.writeFileSync('server.js', serverDb);
console.log('patched server.js');
