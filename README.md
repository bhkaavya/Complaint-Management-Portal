# Complaint Management Portal

The Complaint Management Portal is a comprehensive full-stack web application designed for students and college administration to log, manage, and resolve campus-wide complaints effectively.

## Features
- **Role-Based Portals**:
  - **Student View (`student.html`)**: Allows students to submit complaints, attach photographic evidence, and automatically track and capture their geolocation using the browser's Geolocation API.
  - **Authenticator View (`authenticator.html`)**: Allows intermediate staff to verify, filter out duplicate complaints, and approve/reject issues with clear feedback to the students.
  - **Management/Admin View (`admin.html`)**: Allows the administration to track metrics, investigate validated complaints (with interactive Google Map links and photo views), and mark resolutions.
- **Strict Domain Registration**: Registration is automatically locked strictly to members with `@srmist.edu.in` domain email addresses ensuring security.
- **Robust PostgreSQL Backend**: The architecture handles fast parsing and schema migrations gracefully.
- **Media Uploads**: Powered by `multer` to securely process `multipart/form-data` uploads and save evidence natively to the server.

## Technologies Used
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (including native Geolocation usage & dynamically generated UI components).
- **Backend Environment**: Node.js & Express.
- **Database**: PostgreSQL (with `pg` module).
- **File Uploads**: `multer`.

## Local Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <your-repository-url>
   cd DTM
   ```

2. **Install Dependencies**
   Make sure you have [Node.js](https://nodejs.org/) installed, and run:
   ```bash
   npm install
   ```

3. **Configure the Database**
   Ensure you have PostgreSQL running locally with a user `dtm_user` and database `dtm_complaints`. You may need to modify the configuration block in `complaints/server.js` if your PostgreSQL setup uses different credentials.

4. **Initialize Metadata/Test Data**
   Run the seeder step to prepare your tables, seed initial users, and whitelist your testing emails:
   ```bash
   node complaints/seed.js
   ```
   **Default Test Credentials (seeded automatically):**
   - **Student:** `student@srmist.edu.in` | Password: `student123`
   - **Authenticator:** `auth@srmist.edu.in` | Password: `auth123`
   - **Admin:** `canteen@srmist.edu.in` | Password: `admin123`

5. **Start the Development Server**
   ```bash
   node complaints/server.js
   ```
   The backend server will run on `http://localhost:3000`. Navigate to this link in your browser to access the application.

## Collaboration Guidelines
When making changes to this repository:
1. Ensure all new logic related to SQL interactions utilizes the asynchronous `Pool` functions correctly initialized in `server.js`.
2. Don't push local database binaries or your local `node_modules`. Stick to standard definitions found in the tracked `.gitignore`.
3. Submit feature patches locally through standard branching format prior to issuing pull requests!
