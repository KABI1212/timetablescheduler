const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const dbPath = path.join(__dirname, '../../database.json');

/** @type {{ users: any[], departments: any[], classrooms: any[], subjects: any[], teachers: any[], teacher_subjects: any[], timetable: any[] }} */
let data = {
  users: [],
  departments: [],
  classrooms: [],
  subjects: [],
  teachers: [],
  teacher_subjects: [],
  timetable: []
};

// Load data
if (fs.existsSync(dbPath)) {
  data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

const save = () => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

const generateId = () => Math.floor(Math.random() * 1000000);

/**
 * Executes a mock SQL query against the JSON database.
 * @param {string} text The SQL query text.
 * @param {any[]} params The query parameters.
 * @returns {Promise<{ rows: any[] }>} The query result.
 */
const query = async (text, params = []) => {
  // Always reload data from disk to ensure sync with manual edits
  if (fs.existsSync(dbPath)) {
    data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  const sql = text.trim().toLowerCase();

  // Auth - Register
  if (sql.includes('insert into users')) {
    const id = generateId();
    const user = { id, name: params[0], email: params[1], password_hash: params[2], role: params[3], created_at: new Date().toISOString() };
    data.users.push(user);
    save();
    return { rows: [user] };
  }

  // Auth - Login / exists
  if (sql.includes('select * from users where email')) {
    const match = data.users.find(u => u.email === params[0]);
    return { rows: match ? [match] : [] };
  }

  // Auth - getMe
  if (sql.includes('from users where id')) {
    const match = data.users.find(u => u.id == params[0]);
    return { rows: match ? [match] : [] };
  }

  // Classrooms
  if (sql.includes('select * from classrooms')) {
    return { rows: data.classrooms };
  }
  if (sql.includes('insert into classrooms')) {
    const item = { id: generateId(), name: params[0], capacity: params[1], type: params[2] || 'lecture' };
    data.classrooms.push(item);
    save();
    return { rows: [item] };
  }

  // Subjects
  if (sql.includes('select * from subjects')) {
    return { rows: data.subjects };
  }
  if (sql.includes('insert into subjects')) {
    const item = { id: generateId(), name: params[0], code: params[1], credits: params[2] || 3 };
    data.subjects.push(item);
    save();
    return { rows: [item] };
  }

  // Teachers (SELECT with JOIN)
  if (sql.includes('select t.id, u.name, u.email, t.max_hours_per_week')) {
    const rows = data.teachers.map(t => {
      const u = data.users.find(u => u.id == t.user_id) || {};
      return { id: t.id, name: u.name, email: u.email, max_hours_per_week: t.max_hours_per_week };
    });
    return { rows };
  }
  if (sql.includes('insert into teachers')) {
    const item = { id: generateId(), user_id: params[0], max_hours_per_week: params[1] || 20 };
    data.teachers.push(item);
    save();
    return { rows: [item] };
  }

  // Timetable API
  if (sql.includes('delete from timetable')) {
    data.timetable = [];
    save();
    return { rows: [] };
  }

  if (sql.includes('select ts.teacher_id as id, ts.subject_id')) {
    // 1. Get current valid mappings
    let validMappings = data.teacher_subjects.filter(ts =>
      data.teachers.some(t => t.id == ts.teacher_id) &&
      data.subjects.some(s => s.id == ts.subject_id)
    );

    // 2. Identify subjects that have NO valid mapping
    const unmappedSubjects = data.subjects.filter(s =>
      !validMappings.some(m => m.subject_id == s.id)
    );

    // 3. If there are unmapped subjects and we have teachers, map them automatically
    if (unmappedSubjects.length > 0 && data.teachers.length > 0) {
      unmappedSubjects.forEach((subject, index) => {
        // Distribute subjects across available teachers
        const teacher = data.teachers[index % data.teachers.length];
        validMappings.push({ teacher_id: teacher.id, subject_id: subject.id });
      });

      // Update the database with these new mappings permanently
      data.teacher_subjects = validMappings;
      save();
    }

    return { rows: validMappings.map(ts => ({ id: ts.teacher_id, subject_id: ts.subject_id })) };
  }

  if (sql.includes('insert into timetable')) {
    const item = {
      id: generateId(), subject_id: params[0], teacher_id: params[1],
      classroom_id: params[2], day_of_week: params[3], start_time: params[4], end_time: params[5]
    };
    data.timetable.push(item);
    save();
    return { rows: [item] };
  }

  if (sql.includes('select t.id, t.day_of_week')) { // getTimetable with JOINS
    const rows = data.timetable.map(t => {
      const s = data.subjects.find(x => x.id == t.subject_id) || {};
      const tr = data.teachers.find(x => x.id == t.teacher_id) || {};
      const u = data.users.find(x => x.id == tr.user_id) || {};
      const c = data.classrooms.find(x => x.id == t.classroom_id) || {};

      return {
        id: t.id, day_of_week: t.day_of_week, start_time: t.start_time, end_time: t.end_time,
        subject_name: s.name || 'Unknown',
        teacher_name: u.name || 'Unknown',
        classroom_name: c.name || 'Unknown'
      };
    });
    // Sort
    /** @type {Record<string, number>} */
    const order = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    rows.sort((a, b) => (order[a.day_of_week] - order[b.day_of_week]) || a.start_time.localeCompare(b.start_time));
    return { rows };
  }

  // DELETE logic
  if (sql.includes('delete from')) {
    const table = sql.split('from ')[1].split(' ')[0];
    const id = params[0];
    if (data[/** @type {keyof typeof data} */ (table)]) {
      data[/** @type {keyof typeof data} */ (table)] = data[/** @type {keyof typeof data} */ (table)].filter(item => item.id != id);
      save();
      return { rows: [] };
    }
  }

  // UPDATE logic (Selective handling for common updates)
  if (sql.includes('update users set')) {
    const user = data.users.find(u => u.id == params[params.length - 1]);
    if (user) {
      if (params.length === 2) user.name = params[0]; // Simple name update
      save();
      return { rows: [user] };
    }
  }

  // Analytics
  if (sql.includes('from teachers tr') && sql.includes('group by u.name')) {
    return {
      rows: data.teachers.map(t => {
        const u = data.users.find(x => x.id == t.user_id) || {};
        const count = data.timetable.filter(time => time.teacher_id == t.id).length;
        return { name: u.name || 'Unknown', classes_count: String(count) };
      })
    };
  }
  if (sql.includes('from classrooms c') && sql.includes('group by c.name')) {
    return {
      rows: data.classrooms.map(c => {
        const count = data.timetable.filter(time => time.classroom_id == c.id).length;
        return { name: c.name || 'Unknown', classes_count: String(count) };
      })
    };
  }
  if (sql.includes('select count(*) from teachers')) return { rows: [{ count: data.teachers.length }] };
  if (sql.includes('select count(*) from classrooms')) return { rows: [{ count: data.classrooms.length }] };
  if (sql.includes('select count(*) from subjects')) return { rows: [{ count: data.subjects.length }] };

  console.log("UNHANDLED SQL:", text);
  return { rows: [] };
};

const initializeDB = async () => {
  // Basic setup if empty
  if (data.users.length === 0) {
    console.log("Seeding initial JSON database...");
    // Seed admin user with password "admin"
    const adminHash = await bcrypt.hash('admin', 10);
    await query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Admin Core', 'admin@chrono.com', adminHash, 'admin']);
    await query('INSERT INTO classrooms (name, capacity, type) VALUES ($1, $2, $3)', ['CyberLab-A', 40, 'lab']);
    await query('INSERT INTO subjects (name, code, credits) VALUES ($1, $2, $3)', ['Quantum Computing', 'QC101', 4]);
    await query('INSERT INTO teachers (user_id, max_hours) VALUES ($1, $2)', [data.users[0].id, 20]);
  }
  console.log("JSON Database initialized.");
};

module.exports = { query, initializeDB };
