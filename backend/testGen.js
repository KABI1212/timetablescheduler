const db = require('./src/config/db');
const TimetableScheduler = require('./src/services/aiScheduling.service');

async function forceGenerate() {
    console.log('Fetching database data...');
    const classroomsDb = await db.query('SELECT * FROM classrooms');
    const subjectsDb = await db.query('SELECT * FROM subjects');
    const teacherMappings = await db.query(`
        SELECT ts.teacher_id as id, ts.subject_id 
        FROM teacher_subjects ts
    `);

    console.log('Initializing AI Scheduler...');
    const scheduler = new TimetableScheduler(
        teacherMappings.rows,
        subjectsDb.rows,
        classroomsDb.rows
    );

    console.log('Running Genetic Algorithm...');
    const bestSchedule = await scheduler.run();

    console.log(`Generated ${bestSchedule.length} slots. Clearing old timetable...`);
    await db.query('DELETE FROM timetable');

    console.log('Inserting new timetable...');
    for (const entry of bestSchedule) {
        await db.query(
            'INSERT INTO timetable (subject_id, teacher_id, classroom_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6)',
            [entry.subject_id, entry.teacher_id, entry.classroom_id, entry.day_of_week, entry.start_time, entry.end_time]
        );
    }

    console.log('done!');
    process.exit(0);
}

forceGenerate().catch(console.error);
