const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbPath = path.join(__dirname, 'database.json');

const createEmptyDatabase = (adminPasswordHash) => ({
  users: [
    {
      id: 1,
      name: 'Admin',
      email: 'admin@chronocampus.local',
      password_hash: adminPasswordHash,
      role: 'admin',
      created_at: new Date().toISOString()
    }
  ],
  departments: [],
  classrooms: [],
  subjects: [],
  teachers: [],
  teacher_subjects: [],
  timetable: [],
  working_timetable: [],
  teacher_availability: [],
  leave_requests: [],
  absence_records: [],
  notifications: [],
  generated_timetable: [],
  generated_timetable_options: [],
  timetable_versions: [],
  audit_logs: [],
  timetable_workflow: {
    status: 'idle',
    working_option_id: null,
    published_option_id: null,
    last_generated_at: null,
    last_published_at: null,
    last_published_by: null
  }
});

async function seedDatabase() {
  try {
    const databaseExists = fs.existsSync(dbPath);

    if (!databaseExists) {
      console.warn(`Database file not found at ${dbPath}. A new database.json will be created.`);
    }

    if (databaseExists) {
      JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }

    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
    const hash = await bcrypt.hash(adminPassword, 10);
    const data = createEmptyDatabase(hash);

    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log(`Database seeded successfully at ${dbPath}`);
    console.log('Default admin email: admin@chronocampus.local');
  } catch (error) {
    console.error(`Failed to seed database at ${dbPath}: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
