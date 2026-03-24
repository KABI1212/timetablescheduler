const db = require('../config/db');

/**
 * Find substitute teachers for a specific subject and time slot.
 * @param {{
 *  subject_id: number,
 *  day_of_week: string,
 *  start_time: string,
 *  exclude_teacher_id?: number
 * }} params
 * @returns {Promise<Array<{ teacher_id: number, teacher_name: string, day_load: number }>>}
 */
const findSubstitutes = async ({ subject_id, day_of_week, start_time, exclude_teacher_id }) => {
    const { rows: teachers } = await db.query('SELECT * FROM teachers');
    const { rows: teacherSubjects } = await db.query('SELECT * FROM teacher_subjects');
    const { rows: users } = await db.query('SELECT * FROM users');
    const { rows: leaveRequests } = await db.query('SELECT * FROM leave_requests');
    const { rows: availability } = await db.query('SELECT * FROM teacher_availability');
    const timetable = db.getTimetableData();

    const approvedLeaves = leaveRequests.filter((req) => req.status === 'Approved');
    const leaveMap = new Map();
    approvedLeaves.forEach((req) => {
        const days = new Set();
        const from = new Date(req.from_date);
        const to = new Date(req.to_date);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return;
        const cursor = new Date(from);
        while (cursor <= to) {
            days.add(cursor.toLocaleDateString('en-US', { weekday: 'long' }));
            cursor.setDate(cursor.getDate() + 1);
        }
        leaveMap.set(req.teacher_id, days);
    });

    const unavailableSet = new Set(
        availability
            .filter((a) => a.status === 'blocked')
            .map((a) => `${a.teacher_id}-${a.day_of_week}-${a.timeslot}`)
    );

    const candidates = teacherSubjects
        .filter((ts) => ts.subject_id == subject_id)
        .map((ts) => ts.teacher_id)
        .filter((id) => id !== exclude_teacher_id);

    const uniqueCandidates = [...new Set(candidates)];

    const available = uniqueCandidates.filter((teacherId) => {
        const leaveDays = leaveMap.get(teacherId);
        if (leaveDays && leaveDays.has(day_of_week)) return false;
        if (unavailableSet.has(`${teacherId}-${day_of_week}-${start_time}`)) return false;
        const alreadyScheduled = timetable.some((t) =>
            t.teacher_id == teacherId && t.day_of_week === day_of_week && t.start_time === start_time
        );
        return !alreadyScheduled;
    });

    const withLoad = available.map((teacherId) => {
        const dayLoad = timetable.filter((t) => t.teacher_id == teacherId && t.day_of_week === day_of_week).length;
        const teacher = teachers.find((t) => t.id == teacherId);
        const user = users.find((u) => u.id == teacher?.user_id);
        return {
            teacher_id: teacherId,
            teacher_name: user?.name || 'Unknown',
            day_load: dayLoad
        };
    });

    return withLoad.sort((a, b) => a.day_load - b.day_load).slice(0, 3);
};

module.exports = { findSubstitutes };
