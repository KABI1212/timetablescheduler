const fs = require('fs');
const bcrypt = require('bcryptjs');

async function setup() {
    const hash = await bcrypt.hash('Kabi@1212', 10);
    const dbPath = require('path').join(__dirname, '../c/Users/Admin/OneDrive/Desktop/Smart Classroom & Timetable Scheduler/backend/database.json');

    // Fallback to absolute path just in case
    const absPath = 'c:/Users/Admin/OneDrive/Desktop/Smart Classroom & Timetable Scheduler/backend/database.json';

    const data = {
        "users": [
            {
                "id": 1,
                "name": "Kabi",
                "email": "kabileshk702@gmail.com",
                "password_hash": hash,
                "role": "admin"
            }
        ],
        "departments": [],
        "classrooms": [],
        "subjects": [],
        "teachers": [],
        "teacher_subjects": [],
        "timetable": []
    };

    fs.writeFileSync(absPath, JSON.stringify(data, null, 2));
    console.log("Database seeded successfully.");
}

setup();
