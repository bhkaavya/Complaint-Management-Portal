const { Pool } = require('pg');

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dtm_complaints',
  user: process.env.DB_USER || 'dtm_user',
  password: process.env.DB_PASS || 'yourpassword',
});

const allowedEmailsToSeed = [
    { email: 'student@srmist.edu.in', role: 'student' },
    { email: 'bz0198@srmist.edu.in', role: 'student' },
    { email: 'ab6789@srmist.edu.in', role: 'student' },
    { email: 'cd1234@srmist.edu.in', role: 'student' },
    { email: 'ef5678@srmist.edu.in', role: 'student' },
    { email: 'gh9012@srmist.edu.in', role: 'authenticator' },
    { email: 'auth@srmist.edu.in', role: 'authenticator' },
    { email: 'canteen@srmist.edu.in', role: 'admin' },
    { email: 'academics@srmist.edu.in', role: 'admin' },
    { email: 'hostel@srmist.edu.in', role: 'admin' },
    { email: 'library@srmist.edu.in', role: 'admin' },
    { email: 'security@srmist.edu.in', role: 'admin' },
    { email: 'transport@srmist.edu.in', role: 'admin' },
    { email: 'infrastructure@srmist.edu.in', role: 'admin' },
    { email: 'cleanliness@srmist.edu.in', role: 'admin' }
];

const usersToSeed = allowedEmailsToSeed.map(m => {
    return {
        username: m.email,
        password: m.role === 'student' ? 'student123' : (m.role === 'admin' ? 'admin123' : 'auth123'),
        role: m.role,
        name: m.email.split('@')[0],
        department: m.role === 'admin' ? m.email.split('@')[0].charAt(0).toUpperCase() + m.email.split('@')[0].slice(1) : null
    };
});

// Custom overrides
usersToSeed.find(u => u.username === 'student@srmist.edu.in').name = 'Student Portal';
usersToSeed.find(u => u.username === 'auth@srmist.edu.in').name = 'Official Authenticator';

const seedDB = async () => {
    try {
        // Ensure tables exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS allowed_emails (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE,
                role TEXT
            )
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

        // Wipe existing tables representing these configurations
        await db.query("DELETE FROM allowed_emails");
        await db.query("DELETE FROM users");

        // Insert allowed emails
        for (const m of allowedEmailsToSeed) {
            await db.query(
                "INSERT INTO allowed_emails (email, role) VALUES ($1, $2)",
                [m.email, m.role]
            );
        }

        // Insert new users
        for (const u of usersToSeed) {
            await db.query(
                "INSERT INTO users (username, password, role, name, department) VALUES ($1, $2, $3, $4, $5)",
                [u.username, u.password, u.role, u.name, u.department]
            );
        }

        console.log(`Database seeded successfully with ${usersToSeed.length} allowed emails and users!`);
    } catch (err) {
        console.error("Error during seeding:", err.message);
    } finally {
        await db.end();
    }
};

seedDB();
