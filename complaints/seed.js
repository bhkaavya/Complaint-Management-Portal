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

const demoEmails = [
    'student@srmist.edu.in', 'auth@srmist.edu.in', 'canteen@srmist.edu.in',
    'academics@srmist.edu.in', 'hostel@srmist.edu.in', 'library@srmist.edu.in',
    'security@srmist.edu.in', 'transport@srmist.edu.in', 'infrastructure@srmist.edu.in',
    'cleanliness@srmist.edu.in'
];

const categoryMap = {
    'canteen': 'Cafeteria / Mess',
    'academics': 'Academic / Faculty',
    'hostel': 'Hostel / Residential',
    'library': 'Extracurriculars',
    'security': 'Campus Security',
    'transport': 'Transport',
    'infrastructure': 'Infrastructure',
    'cleanliness': 'Hostel / Residential'
};

const usersToSeed = allowedEmailsToSeed.map(m => {
    const prefix = m.email.split('@')[0];
    return {
        username: m.email,
        password: m.role === 'student' ? 'student123' : (m.role === 'admin' ? 'admin123' : 'auth123'),
        role: m.role,
        name: prefix,
        department: m.role === 'admin' ? (categoryMap[prefix] || 'Other') : null
    };
});

// Custom overrides
const studentUser = usersToSeed.find(u => u.username === 'student@srmist.edu.in');
if (studentUser) studentUser.name = 'Student Portal';

const authUser = usersToSeed.find(u => u.username === 'auth@srmist.edu.in');
if (authUser) authUser.name = 'Official Authenticator';


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
        await db.query(`
            CREATE TABLE IF NOT EXISTS issues_categories (
                "categoryId" TEXT PRIMARY KEY,
                "categoryName" TEXT,
                "departmentOwner" TEXT,
                "commonIssues" TEXT,
                priority TEXT
            )
        `);

        // Wipe existing tables representing these configurations
        await db.query("DELETE FROM allowed_emails");
        await db.query("DELETE FROM users");
        await db.query("DELETE FROM issues_categories");

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

        // Insert issues categories
        const categories = [
          ['CAT_01', 'Academic / Faculty', 'Dean of Academics', 'Attendance, Faculty, Course Material', 'High'],
          ['CAT_02', 'Hostel / Residential', 'Chief Warden', 'Room Repair, Electricity, Water', 'High'],
          ['CAT_03', 'Cafeteria / Mess', 'Food & Safety Comm.', 'Food Quality, Hygiene, Overcharging', 'Medium'],
          ['CAT_04', 'IT & Lab Services', 'IT Support / SysAdmin', 'Software, Hardware, System Access', 'Medium'],
          ['CAT_05', 'Transport', 'Transport Manager', 'Bus Timing, Driver, Route Changes', 'Medium'],
          ['CAT_06', 'Research Labs', 'Lab Coordinator', 'Equipment, Reagents, Safety Gear', 'High'],
          ['CAT_07', 'Extracurriculars', 'Cultural/Sports Head', 'Club Funds, Event Space, Equipment', 'Low'],
          ['CAT_08', 'Infrastructure', 'Maintenance Dept', 'Civil Works, Lighting, Furniture', 'Low'],
          ['CAT_09', 'Campus Security', 'Security Office', 'Lost & Found, Parking, Safety', 'Urgent'],
          ['CAT_10', 'Academic / Faculty', 'Dean of Academics', 'Attendance, Faculty, Course Material', 'High'],
          ['CAT_11', 'Placement Cell', 'Placement Officer', 'Registration, Company Updates', 'High'],
          ['CAT_12', 'Finance / Accounts', 'Accounts Office', 'Fees, Refunds, Scholarship', 'Medium']
        ];

        for (const cat of categories) {
          await db.query(
            'INSERT INTO issues_categories ("categoryId", "categoryName", "departmentOwner", "commonIssues", priority) VALUES ($1, $2, $3, $4, $5)',
            cat
          );
        }

        console.log(`Database seeded successfully with ${usersToSeed.length} allowed emails and users, and ${categories.length} categories!`);
    } catch (err) {
        console.error("Error during seeding:", err.message);
    } finally {
        await db.end();
    }
};

seedDB();
