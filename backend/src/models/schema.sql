CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    capacity INT NOT NULL,
    type TEXT DEFAULT 'lecture',
    is_lab BOOLEAN DEFAULT FALSE,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    credits INT NOT NULL DEFAULT 3,
    is_lab BOOLEAN DEFAULT FALSE,
    lab_duration INT DEFAULT 2,
    theory_hours INT DEFAULT 3,
    lab_hours INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    max_hours_per_week INT DEFAULT 20
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    substitute_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
    session_type TEXT DEFAULT 'theory'
);

CREATE TABLE IF NOT EXISTS teacher_availability (
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    timeslot TEXT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    from_date TEXT NOT NULL,
    to_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    admin_note TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS absence_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    reason TEXT,
    substitute_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetable_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope TEXT NOT NULL,
    action TEXT NOT NULL,
    note TEXT,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    source_option_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    schedule_json TEXT NOT NULL,
    metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    summary TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    metadata_json TEXT
);
