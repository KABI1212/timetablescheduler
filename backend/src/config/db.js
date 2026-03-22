const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const dbPath = path.join(__dirname, '../../database.json');

/** @type {{ users: any[], classrooms: any[], subjects: any[], teachers: any[], teacher_subjects: any[], timetable: any[], working_timetable: any[], teacher_availability: any[], leave_requests: any[], absence_records: any[], notifications: any[], generated_timetable: any[], generated_timetable_options: any[], timetable_workflow: any, timetable_versions: any[], audit_logs: any[] }} */
let data = {
  users: [],
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
};

// Load data
if (fs.existsSync(dbPath)) {
  data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

const normalizeData = () => {
  data.users = data.users || [];
  data.classrooms = (data.classrooms || []).map((room) => ({
    ...room,
    maintenance_mode: Boolean(room.maintenance_mode),
    maintenance_note: room.maintenance_note || ''
  }));
  data.subjects = data.subjects || [];
  data.teachers = data.teachers || [];
  data.teacher_subjects = data.teacher_subjects || [];
  data.timetable = data.timetable || [];
  data.working_timetable = data.working_timetable || [];
  data.teacher_availability = data.teacher_availability || [];
  data.leave_requests = data.leave_requests || [];
  data.absence_records = data.absence_records || [];
  data.notifications = data.notifications || [];
  data.generated_timetable = data.generated_timetable || [];
  data.generated_timetable_options = data.generated_timetable_options || [];
  data.timetable_versions = data.timetable_versions || [];
  data.audit_logs = data.audit_logs || [];
  data.timetable_workflow = {
    status: data.timetable_workflow?.status || 'idle',
    working_option_id: data.timetable_workflow?.working_option_id || null,
    published_option_id: data.timetable_workflow?.published_option_id || null,
    last_generated_at: data.timetable_workflow?.last_generated_at || null,
    last_published_at: data.timetable_workflow?.last_published_at || null,
    last_published_by: data.timetable_workflow?.last_published_by || null
  };
};

normalizeData();

const save = () => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

const generateId = () => Math.floor(Math.random() * 1000000);
const clone = (value) => JSON.parse(JSON.stringify(value));

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
  normalizeData();

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
    const item = {
      id: generateId(),
      name: params[0],
      capacity: params[1],
      type: params[2] || 'lecture',
      is_lab: Boolean(params[3]),
      maintenance_mode: Boolean(params[4]),
      maintenance_note: params[5] || ''
    };
    data.classrooms.push(item);
    save();
    return { rows: [item] };
  }

  // Subjects
  if (sql.includes('select * from subjects')) {
    return { rows: data.subjects };
  }

  if (sql.includes('select * from teachers')) {
    return { rows: data.teachers };
  }

  if (sql.includes('select * from teacher_subjects')) {
    return { rows: data.teacher_subjects };
  }

  if (sql.includes('select * from timetable')) {
    return { rows: data.timetable };
  }

  if (sql.includes('select * from users')) {
    return { rows: data.users };
  }
  if (sql.includes('insert into subjects')) {
    const theoryHours = params.length > 5 ? params[5] : undefined;
    const labHours = params.length > 6 ? params[6] : undefined;
    const item = {
      id: generateId(),
      name: params[0],
      code: params[1],
      credits: params[2] || 3,
      is_lab: Boolean(params[3]),
      lab_duration: params[4] || 1,
      theory_hours: Number.isFinite(theoryHours) ? theoryHours : 3,
      lab_hours: Number.isFinite(labHours) ? Math.max(0, labHours) : (params[3] ? 2 : 0)
    };
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
      classroom_id: params[2], day_of_week: params[3], start_time: params[4], end_time: params[5],
      substitute_teacher_id: params[6] || null,
      session_type: params[7] || 'theory'
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
      const subTeacher = data.teachers.find(x => x.id == t.substitute_teacher_id) || null;
      const subUser = subTeacher ? data.users.find(x => x.id == subTeacher.user_id) : null;
      const inferredSessionType = t.session_type || 'theory';

      return {
        id: t.id,
        day_of_week: t.day_of_week,
        start_time: t.start_time,
        end_time: t.end_time,
        subject_id: t.subject_id,
        teacher_id: t.teacher_id,
        classroom_id: t.classroom_id,
        subject_name: s.name || 'Unknown',
        teacher_name: u.name || 'Unknown',
        classroom_name: c.name || 'Unknown',
        is_lab: Boolean(s.is_lab),
        lab_duration: s.lab_duration || 1,
        theory_hours: Number.isFinite(s.theory_hours) ? s.theory_hours : 3,
        lab_hours: Number.isFinite(s.lab_hours) ? s.lab_hours : (s.is_lab ? 2 : 0),
        session_type: inferredSessionType,
        substitute_teacher_id: t.substitute_teacher_id || null,
        substitute_teacher_name: subUser ? subUser.name : null
      };
    });
    // Sort
    /** @type {Record<string, number>} */
    const order = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    rows.sort((a, b) => (order[a.day_of_week] - order[b.day_of_week]) || a.start_time.localeCompare(b.start_time));
    return { rows };
  }

  // Teacher Availability
  if (sql.includes('select * from teacher_availability')) {
    let rows = data.teacher_availability;
    if (sql.includes('where teacher_id')) {
      rows = rows.filter(a => a.teacher_id == params[0]);
    }
    return { rows };
  }

  if (sql.includes('insert into teacher_availability')) {
    const [teacher_id, day_of_week, timeslot, is_available] = params;
    const existing = data.teacher_availability.find(a => a.teacher_id == teacher_id && a.day_of_week == day_of_week && a.timeslot == timeslot);
    if (existing) {
      existing.is_available = Boolean(is_available);
      save();
      return { rows: [existing] };
    }
    const item = { id: generateId(), teacher_id, day_of_week, timeslot, is_available: Boolean(is_available) };
    data.teacher_availability.push(item);
    save();
    return { rows: [item] };
  }

  if (sql.includes('update teacher_availability')) {
    const [is_available, teacher_id, day_of_week, timeslot] = params;
    const existing = data.teacher_availability.find(a => a.teacher_id == teacher_id && a.day_of_week == day_of_week && a.timeslot == timeslot);
    if (existing) {
      existing.is_available = Boolean(is_available);
      save();
      return { rows: [existing] };
    }
  }

  // Leave Requests
  if (sql.includes('select * from leave_requests')) {
    let rows = data.leave_requests;
    if (sql.includes('where teacher_id')) {
      rows = rows.filter(r => r.teacher_id == params[0]);
    }
    return { rows };
  }

  if (sql.includes('insert into leave_requests')) {
    const [teacher_id, from_date, to_date, reason, type, status, admin_note, created_at] = params;
    const item = {
      id: generateId(),
      teacher_id,
      from_date,
      to_date,
      reason,
      type,
      status,
      admin_note,
      created_at
    };
    data.leave_requests.push(item);
    save();
    return { rows: [item] };
  }

  if (sql.includes('update leave_requests')) {
    const [status, admin_note, id] = params;
    const existing = data.leave_requests.find(r => r.id == id);
    if (existing) {
      existing.status = status;
      existing.admin_note = admin_note;
      save();
      return { rows: [existing] };
    }
  }

  // Absence Records
  if (sql.includes('select * from absence_records')) {
    return { rows: data.absence_records };
  }

  if (sql.includes('insert into absence_records')) {
    const [teacher_id, date, reason, substitute_teacher_id, day_of_week, start_time, end_time, subject_id, classroom_id] = params;
    const item = {
      id: generateId(),
      teacher_id,
      date,
      reason,
      substitute_teacher_id: substitute_teacher_id || null,
      day_of_week,
      start_time,
      end_time,
      subject_id,
      classroom_id
    };
    data.absence_records.push(item);
    save();
    return { rows: [item] };
  }

  if (sql.includes('update absence_records')) {
    const [substitute_teacher_id, id] = params;
    const existing = data.absence_records.find(r => r.id == id);
    if (existing) {
      existing.substitute_teacher_id = substitute_teacher_id;
      save();
      return { rows: [existing] };
    }
  }

  // Notifications
  if (sql.includes('select * from notifications')) {
    let rows = data.notifications;
    if (sql.includes('where user_id')) {
      rows = rows.filter(n => n.user_id == params[0]);
    }
    return { rows };
  }

  if (sql.includes('insert into notifications')) {
    const [user_id, message, type, is_read, created_at] = params;
    const item = {
      id: generateId(),
      user_id,
      message,
      type,
      is_read: Boolean(is_read),
      created_at
    };
    data.notifications.push(item);
    save();
    return { rows: [item] };
  }

  if (sql.includes('update notifications set is_read')) {
    const [user_id] = params;
    data.notifications.forEach(n => {
      if (n.user_id == user_id) n.is_read = true;
    });
    save();
    return { rows: [] };
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

  if (sql.includes('update subjects set')) {
    const subjectId = params[params.length - 1];
    const subject = data.subjects.find(s => s.id == subjectId);
    if (subject) {
      subject.name = params[0];
      subject.code = params[1];
      subject.credits = params[2] || 3;
      subject.is_lab = Boolean(params[3]);
      subject.lab_duration = params[4] || (subject.is_lab ? 2 : 1);
      subject.theory_hours = Number.isFinite(params[5]) ? params[5] : (subject.theory_hours ?? 3);
      subject.lab_hours = Number.isFinite(params[6]) ? Math.max(0, params[6]) : (subject.is_lab ? 2 : 0);
      save();
      return { rows: [subject] };
    }
  }

  if (sql.includes('update classrooms set')) {
    const roomId = params[params.length - 1];
    const room = data.classrooms.find(c => c.id == roomId);
    if (room) {
      room.name = params[0];
      room.capacity = params[1];
      room.type = params[2] || 'lecture';
      room.is_lab = Boolean(params[3]);
      if (params.length >= 7) {
        room.maintenance_mode = Boolean(params[4]);
        room.maintenance_note = params[5] || '';
      }
      save();
      return { rows: [room] };
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
      ['Admin Core', 'admin@rising.ai', adminHash, 'admin']);
    await query('INSERT INTO classrooms (name, capacity, type, is_lab) VALUES ($1, $2, $3, $4)', ['Quantum Lab A', 40, 'lab', true]);
    await query('INSERT INTO subjects (name, code, credits, is_lab, lab_duration) VALUES ($1, $2, $3, $4, $5)', ['Quantum Computing', 'QC101', 4, false, 1]);
    await query('INSERT INTO teachers (user_id, max_hours_per_week) VALUES ($1, $2)', [data.users[0].id, 20]);
  }
  console.log("JSON Database initialized.");
};

const setGeneratedTimetable = (rows) => {
  data.generated_timetable = Array.isArray(rows) ? clone(rows) : [];
  save();
};

const getGeneratedTimetable = () => clone(data.generated_timetable || []);

const setGeneratedTimetableOptions = (options) => {
  data.generated_timetable_options = Array.isArray(options) ? clone(options) : [];
  save();
};

const getGeneratedTimetableOptions = () => clone(data.generated_timetable_options || []);

const replaceTimetable = (rows) => {
  data.timetable = Array.isArray(rows) ? clone(rows) : [];
  save();
};

const getTimetableData = () => clone(data.timetable || []);

const replaceWorkingTimetable = (rows) => {
  data.working_timetable = Array.isArray(rows) ? clone(rows) : [];
  save();
};

const getWorkingTimetable = () => clone(data.working_timetable || []);

const setTimetableWorkflow = (patch) => {
  data.timetable_workflow = {
    ...data.timetable_workflow,
    ...(patch || {})
  };
  save();
};

const getTimetableWorkflow = () => clone(data.timetable_workflow || {});

const addTimetableVersion = (version) => {
  const item = {
    id: generateId(),
    scope: version.scope || 'draft',
    action: version.action || 'snapshot',
    note: version.note || '',
    actor_id: version.actor_id || null,
    source_option_id: version.source_option_id || null,
    created_at: version.created_at || new Date().toISOString(),
    schedule: Array.isArray(version.schedule) ? clone(version.schedule) : [],
    metadata: clone(version.metadata || {})
  };
  data.timetable_versions = [item, ...(data.timetable_versions || [])].slice(0, 40);
  save();
  return clone(item);
};

const getTimetableVersions = () => clone(data.timetable_versions || []);

const addAuditLog = (log) => {
  const item = {
    id: generateId(),
    action: log.action || 'updated',
    entity_type: log.entity_type || 'system',
    entity_id: log.entity_id || null,
    actor_id: log.actor_id || null,
    summary: log.summary || '',
    created_at: log.created_at || new Date().toISOString(),
    metadata: clone(log.metadata || {})
  };
  data.audit_logs = [item, ...(data.audit_logs || [])].slice(0, 200);
  save();
  return clone(item);
};

const getAuditLogs = () => clone(data.audit_logs || []);

module.exports = {
  query,
  initializeDB,
  setGeneratedTimetable,
  getGeneratedTimetable,
  setGeneratedTimetableOptions,
  getGeneratedTimetableOptions,
  replaceTimetable,
  getTimetableData,
  replaceWorkingTimetable,
  getWorkingTimetable,
  setTimetableWorkflow,
  getTimetableWorkflow,
  addTimetableVersion,
  getTimetableVersions,
  addAuditLog,
  getAuditLogs
};
