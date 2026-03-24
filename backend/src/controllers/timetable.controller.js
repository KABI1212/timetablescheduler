const db = require('../config/db');
const TimetableScheduler = require('../services/aiScheduling.service');
const { findSubstitutes } = require('../services/substituteEngine.service');

const progressClients = new Set();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = DAYS.reduce((acc, day, index) => ({ ...acc, [day]: index + 1 }), {});
const TIMESLOTS = [
    { start: '09:15:00', end: '10:00:00' },
    { start: '10:00:00', end: '10:45:00', breakAfter: true },
    { start: '11:00:00', end: '11:45:00' },
    { start: '11:45:00', end: '12:30:00', breakAfter: true },
    { start: '13:20:00', end: '14:05:00' },
    { start: '14:05:00', end: '14:50:00', breakAfter: true },
    { start: '15:05:00', end: '15:50:00' },
    { start: '15:55:00', end: '16:40:00' }
];
const slotIndex = new Map(TIMESLOTS.map((slot, index) => [slot.start, index]));

const clone = (value) => JSON.parse(JSON.stringify(value));

const sortSchedule = (rows) => clone(rows).sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.day_of_week] || 99) - (DAY_ORDER[b.day_of_week] || 99);
    if (dayDiff !== 0) return dayDiff;
    const startDiff = String(a.start_time || '').localeCompare(String(b.start_time || ''));
    if (startDiff !== 0) return startDiff;
    const roomDiff = Number(a.classroom_id || 0) - Number(b.classroom_id || 0);
    if (roomDiff !== 0) return roomDiff;
    return Number(a.subject_id || 0) - Number(b.subject_id || 0);
});

const scheduleSignature = (rows) => sortSchedule(rows)
    .map((entry) => [
        entry.subject_id,
        entry.teacher_id,
        entry.classroom_id,
        entry.day_of_week,
        entry.start_time,
        entry.end_time,
        entry.session_type || 'theory'
    ].join(':'))
    .join('|');

const sendProgress = (payload) => {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    progressClients.forEach((res) => {
        res.write(data);
    });
};

const buildLeaveMap = (leaveRequests) => {
    const leaveMap = new Map();
    leaveRequests
        .filter((request) => request.status === 'Approved')
        .forEach((request) => {
            const days = new Set();
            const from = new Date(request.from_date);
            const to = new Date(request.to_date);
            if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return;
            const cursor = new Date(from);
            while (cursor <= to) {
                days.add(cursor.toLocaleDateString('en-US', { weekday: 'long' }));
                cursor.setDate(cursor.getDate() + 1);
            }
            leaveMap.set(Number(request.teacher_id), days);
        });
    return leaveMap;
};

const buildAvailabilityMaps = (availability) => {
    const blockedSet = new Set();
    const preferredByTeacher = new Map();

    availability.forEach((entry) => {
        const status = String(entry.status || '').trim().toLowerCase();
        if (status === 'blocked') {
            blockedSet.add(`${entry.teacher_id}-${entry.day_of_week}-${entry.timeslot}`);
            return;
        }
        if (status === 'preferred') {
            const teacherId = Number(entry.teacher_id);
            const preferred = preferredByTeacher.get(teacherId) || new Set();
            preferred.add(`${entry.day_of_week}-${entry.timeslot}`);
            preferredByTeacher.set(teacherId, preferred);
        }
    });

    return { blockedSet, preferredByTeacher };
};

const isTeacherUnavailable = (teacherId, day, startTime, leaveMap, blockedSet) => {
    const leaveDays = leaveMap.get(Number(teacherId));
    if (leaveDays && leaveDays.has(day)) return true;
    if (blockedSet.has(`${teacherId}-${day}-${startTime}`)) return true;
    return false;
};

const teacherHasPreferredSlots = (teacherId, preferredByTeacher) => (
    (preferredByTeacher.get(Number(teacherId)) || new Set()).size > 0
);

const isTeacherPreferredSlot = (teacherId, day, startTime, preferredByTeacher) => (
    Boolean(preferredByTeacher.get(Number(teacherId))?.has(`${day}-${startTime}`))
);

const createConflict = ({
    id,
    type,
    details,
    level = 'hard',
    severity = 'error',
    constraint_code,
    ...rest
}) => ({
    id,
    type,
    details,
    level,
    severity,
    constraint_code,
    ...rest
});

const summarizeConflicts = (conflicts) => {
    const byType = new Map();

    conflicts.forEach((conflict) => {
        byType.set(conflict.type, (byType.get(conflict.type) || 0) + 1);
    });

    return {
        total: conflicts.length,
        hard: conflicts.filter((conflict) => conflict.level === 'hard').length,
        soft: conflicts.filter((conflict) => conflict.level === 'soft').length,
        error: conflicts.filter((conflict) => conflict.severity === 'error').length,
        warning: conflicts.filter((conflict) => conflict.severity === 'warning').length,
        by_type: [...byType.entries()]
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
    };
};

const loadLookupData = async () => {
    const [{ rows: subjects }, { rows: teachers }, { rows: users }, { rows: classrooms }] = await Promise.all([
        db.query('SELECT * FROM subjects'),
        db.query('SELECT * FROM teachers'),
        db.query('SELECT * FROM users'),
        db.query('SELECT * FROM classrooms')
    ]);

    return { subjects, teachers, users, classrooms };
};

const decorateScheduleRows = async (rows) => {
    const { subjects, teachers, users, classrooms } = await loadLookupData();

    const subjectById = new Map(subjects.map((subject) => [Number(subject.id), subject]));
    const teacherById = new Map(teachers.map((teacher) => [Number(teacher.id), teacher]));
    const userById = new Map(users.map((user) => [Number(user.id), user]));
    const classroomById = new Map(classrooms.map((room) => [Number(room.id), room]));

    return sortSchedule(rows).map((entry) => {
        const subject = subjectById.get(Number(entry.subject_id)) || {};
        const teacher = teacherById.get(Number(entry.teacher_id)) || {};
        const teacherUser = userById.get(Number(teacher.user_id)) || {};
        const classroom = classroomById.get(Number(entry.classroom_id)) || {};
        const substituteTeacher = teacherById.get(Number(entry.substitute_teacher_id)) || null;
        const substituteUser = substituteTeacher ? userById.get(Number(substituteTeacher.user_id)) : null;

        return {
            ...entry,
            subject_name: subject.name || 'Unknown',
            teacher_name: teacherUser.name || 'Unknown',
            classroom_name: classroom.name || 'Unknown',
            is_lab: Boolean(subject.is_lab),
            lab_duration: subject.lab_duration || 1,
            theory_hours: Number.isFinite(subject.theory_hours) ? subject.theory_hours : 3,
            lab_hours: Number.isFinite(subject.lab_hours) ? subject.lab_hours : (subject.is_lab ? 2 : 0),
            session_type: entry.session_type || 'theory',
            substitute_teacher_id: entry.substitute_teacher_id || null,
            substitute_teacher_name: substituteUser ? substituteUser.name : null
        };
    });
};

const analyzeSchedule = async (scheduleRows, options = {}) => {
    const teachers = options.teachers || (await db.query('SELECT * FROM teachers')).rows;
    const leaveRequests = options.leaveRequests || (await db.query('SELECT * FROM leave_requests')).rows;
    const availability = options.availability || (await db.query('SELECT * FROM teacher_availability')).rows;
    const { classrooms, users } = await loadLookupData();

    const teacherById = new Map(teachers.map((teacher) => [Number(teacher.id), teacher]));
    const classroomById = new Map(classrooms.map((room) => [Number(room.id), room]));
    const teacherNameById = new Map();

    teachers.forEach((teacher) => {
        const user = users.find((candidate) => Number(candidate.id) === Number(teacher.user_id));
        teacherNameById.set(Number(teacher.id), user?.name || `Teacher ${teacher.id}`);
    });

    const leaveMap = buildLeaveMap(leaveRequests);
    const { blockedSet, preferredByTeacher } = buildAvailabilityMaps(availability);
    const teacherSlots = new Map();
    const roomSlots = new Map();
    const teacherDailyCount = new Map();
    const teacherWeeklyCount = new Map();
    const conflicts = [];

    scheduleRows.forEach((entry) => {
        const teacherId = Number(entry.substitute_teacher_id || entry.teacher_id);
        const originalTeacherId = Number(entry.teacher_id);
        const roomId = Number(entry.classroom_id);
        const room = classroomById.get(roomId);
        const teacherName = teacherNameById.get(teacherId) || `Teacher ${teacherId}`;
        const roomName = room?.name || `Room ${roomId}`;
        const slotKey = `${entry.day_of_week}-${entry.start_time}`;
        const teacherSlotKey = `${slotKey}-${teacherId}`;
        const roomSlotKey = `${slotKey}-${roomId}`;

        if (room?.maintenance_mode) {
            conflicts.push(createConflict({
                id: `maintenance-${entry.id || roomSlotKey}`,
                type: 'Room under maintenance',
                details: `${roomName} is blocked for maintenance${room.maintenance_note ? `: ${room.maintenance_note}` : '.'}`,
                constraint_code: 'room_maintenance',
                entry_id: entry.id,
                classroom_id: roomId,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time
            }));
        }

        if (teacherSlots.has(teacherSlotKey)) {
            conflicts.push(createConflict({
                id: `teacher-${entry.id || teacherSlotKey}`,
                type: 'Teacher double-booked',
                details: `${teacherName} is assigned twice on ${entry.day_of_week} at ${entry.start_time}.`,
                constraint_code: 'teacher_double_booked',
                entry_id: entry.id,
                teacher_id: teacherId,
                original_teacher_id: originalTeacherId,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time
            }));
        } else {
            teacherSlots.set(teacherSlotKey, entry.id);
        }

        if (roomSlots.has(roomSlotKey)) {
            conflicts.push(createConflict({
                id: `room-${entry.id || roomSlotKey}`,
                type: 'Room double-booked',
                details: `${roomName} is assigned twice on ${entry.day_of_week} at ${entry.start_time}.`,
                constraint_code: 'room_double_booked',
                entry_id: entry.id,
                classroom_id: roomId,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time
            }));
        } else {
            roomSlots.set(roomSlotKey, entry.id);
        }

        if (isTeacherUnavailable(teacherId, entry.day_of_week, entry.start_time, leaveMap, blockedSet)) {
            conflicts.push(createConflict({
                id: `leave-${entry.id || `${teacherId}-${entry.day_of_week}-${entry.start_time}`}`,
                type: 'Teacher unavailable',
                details: `${teacherName} is unavailable on ${entry.day_of_week} at ${entry.start_time}.`,
                constraint_code: 'teacher_unavailable',
                entry_id: entry.id,
                teacher_id: teacherId,
                original_teacher_id: originalTeacherId,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time
            }));
        } else if (
            teacherHasPreferredSlots(teacherId, preferredByTeacher)
            && !isTeacherPreferredSlot(teacherId, entry.day_of_week, entry.start_time, preferredByTeacher)
        ) {
            conflicts.push(createConflict({
                id: `preferred-${entry.id || `${teacherId}-${entry.day_of_week}-${entry.start_time}`}`,
                type: 'Teacher preference missed',
                details: `${teacherName} prefers other time slots than ${entry.day_of_week} at ${entry.start_time}.`,
                level: 'soft',
                severity: 'warning',
                constraint_code: 'teacher_preference_missed',
                entry_id: entry.id,
                teacher_id: teacherId,
                original_teacher_id: originalTeacherId,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time
            }));
        }

        const dailyKey = `${teacherId}-${entry.day_of_week}`;
        const dailyCount = (teacherDailyCount.get(dailyKey) || 0) + 1;
        teacherDailyCount.set(dailyKey, dailyCount);
        if (dailyCount > 6) {
            conflicts.push(createConflict({
                id: `overload-day-${entry.id || dailyKey}`,
                type: 'Teacher daily overload',
                details: `${teacherName} exceeds the daily limit on ${entry.day_of_week}.`,
                constraint_code: 'teacher_daily_overload',
                entry_id: entry.id,
                teacher_id: teacherId,
                original_teacher_id: originalTeacherId,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time
            }));
        }

        const weeklyCount = (teacherWeeklyCount.get(teacherId) || 0) + 1;
        teacherWeeklyCount.set(teacherId, weeklyCount);
        const teacherMax = Number(teacherById.get(teacherId)?.max_hours_per_week || 0);
        if (teacherMax > 0 && weeklyCount > teacherMax) {
            conflicts.push(createConflict({
                id: `overload-week-${entry.id || teacherId}`,
                type: 'Teacher weekly overload',
                details: `${teacherName} exceeds the weekly workload limit (${teacherMax}).`,
                constraint_code: 'teacher_weekly_overload',
                entry_id: entry.id,
                teacher_id: teacherId,
                original_teacher_id: originalTeacherId,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time
            }));
        }
    });

    return {
        conflicts,
        summary: summarizeConflicts(conflicts)
    };
};

const summarizeOption = (option, workflow) => ({
    id: option.id,
    label: option.label,
    created_at: option.created_at,
    fitness: option.fitness,
    conflict_count: option.conflict_count,
    hard_conflict_count: option.hard_conflict_count || 0,
    soft_conflict_count: option.soft_conflict_count || 0,
    entry_count: option.entry_count,
    is_selected: workflow.working_option_id === option.id,
    is_published: workflow.published_option_id === option.id
});

const summarizeVersion = (version) => ({
    id: version.id,
    scope: version.scope,
    action: version.action,
    note: version.note,
    actor_id: version.actor_id,
    source_option_id: version.source_option_id,
    created_at: version.created_at,
    entry_count: Array.isArray(version.schedule) ? version.schedule.length : 0
});

const addTimetableAudit = ({ action, actorId, summary, metadata = {}, entityId = null }) => {
    db.addAuditLog({
        action,
        entity_type: 'timetable',
        entity_id: entityId,
        actor_id: actorId || null,
        summary,
        metadata
    });
};

const addTimetableVersion = ({ scope, action, note, actorId, schedule, sourceOptionId = null, metadata = {} }) => (
    db.addTimetableVersion({
        scope,
        action,
        note,
        actor_id: actorId || null,
        source_option_id: sourceOptionId,
        schedule,
        metadata
    })
);

const notifyUsersByRole = async (roles, message, type) => {
    const allowed = new Set(roles.map((role) => String(role || '').trim().toLowerCase()));
    const { rows: users } = await db.query('SELECT * FROM users');
    const timestamp = new Date().toISOString();

    const targets = users.filter((user) => allowed.has(String(user.role || '').trim().toLowerCase()));
    for (const user of targets) {
        await db.query(
            'INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [user.id, message, type, false, timestamp]
        );
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.streamProgress = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    progressClients.add(res);

    res.write(`data: ${JSON.stringify({ message: 'Preparing scheduler...', progress: 5 })}\n\n`);

    req.on('close', () => {
        progressClients.delete(res);
    });
};

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
exports.generateTimetable = async (_req, res) => {
    try {
        const [classroomsDb, subjectsDb, teacherMappings, leaveRequests, availability, teachers] = await Promise.all([
            db.query('SELECT * FROM classrooms'),
            db.query('SELECT * FROM subjects'),
            db.query(`
                SELECT ts.teacher_id as id, ts.subject_id
                FROM teacher_subjects ts
            `),
            db.query('SELECT * FROM leave_requests'),
            db.query('SELECT * FROM teacher_availability'),
            db.query('SELECT * FROM teachers')
        ]);
        const availableClassrooms = classroomsDb.rows.filter((room) => !room.maintenance_mode);

        if (availableClassrooms.length === 0 || subjectsDb.rows.length === 0 || teacherMappings.rows.length === 0) {
            return res.status(400).json({
                error: 'Incomplete data to generate timetable. Ensure teachers, subjects, and available classrooms exist.'
            });
        }

        const targetOptionCount = 3;
        const maxAttempts = 8;
        const generatedAt = new Date().toISOString();
        const options = [];
        const seenSignatures = new Set();

        sendProgress({ message: 'Generating candidate timetable options...', progress: 5 });

        for (let attempt = 0; attempt < maxAttempts && options.length < targetOptionCount; attempt += 1) {
            const optionNumber = options.length + 1;
            const scheduler = new TimetableScheduler(
                teacherMappings.rows,
                subjectsDb.rows,
                availableClassrooms,
                {
                    leaveRequests: leaveRequests.rows,
                    availability: availability.rows,
                    teachers: teachers.rows
                }
            );

            const schedule = await scheduler.run((payload) => {
                const optionProgress = payload.progress || 0;
                const overallProgress = Math.min(
                    95,
                    Math.round(((options.length + optionProgress / 100) / targetOptionCount) * 100)
                );

                sendProgress({
                    generation: payload.generation,
                    fitness: payload.fitness,
                    progress: overallProgress,
                    message: `Option ${optionNumber}/${targetOptionCount}: ${payload.message}`
                });
            });

            const signature = scheduleSignature(schedule);
            if (seenSignatures.has(signature)) {
                continue;
            }

            seenSignatures.add(signature);
            const analysis = await analyzeSchedule(schedule, {
                teachers: teachers.rows,
                leaveRequests: leaveRequests.rows,
                availability: availability.rows
            });

            options.push({
                id: `option-${Date.now()}-${options.length + 1}`,
                label: `Option ${options.length + 1}`,
                created_at: new Date().toISOString(),
                fitness: scheduler.calculateFitness(schedule),
                conflict_count: analysis.summary.total,
                hard_conflict_count: analysis.summary.hard,
                soft_conflict_count: analysis.summary.soft,
                entry_count: schedule.length,
                schedule: sortSchedule(schedule)
            });
        }

        if (options.length === 0) {
            sendProgress({ status: 'error', message: 'No valid timetable option could be generated.', progress: 0 });
            return res.status(500).json({ error: 'Unable to generate a timetable draft.' });
        }

        const firstOption = options[0];
        db.setGeneratedTimetableOptions(options);
        db.setGeneratedTimetable(firstOption.schedule);
        db.replaceWorkingTimetable(firstOption.schedule);
        db.setTimetableWorkflow({
            status: 'draft',
            working_option_id: firstOption.id,
            last_generated_at: generatedAt
        });
        addTimetableVersion({
            scope: 'draft',
            action: 'generated',
            note: 'Generated new draft timetable options.',
            actorId: _req.user?.id,
            schedule: firstOption.schedule,
            sourceOptionId: firstOption.id,
            metadata: {
                option_count: options.length,
                available_classrooms: availableClassrooms.length
            }
        });
        addTimetableAudit({
            action: 'timetable.generated',
            actorId: _req.user?.id,
            summary: `Generated ${options.length} timetable draft option(s).`,
            metadata: {
                option_ids: options.map((option) => option.id),
                available_classrooms: availableClassrooms.length
            }
        });

        const workflow = db.getTimetableWorkflow();
        sendProgress({
            status: 'complete',
            message: 'Draft timetable options ready for review.',
            progress: 100
        });

        res.json({
            message: 'Timetable draft options generated successfully.',
            options: options.map((option) => summarizeOption(option, workflow))
        });
    } catch (err) {
        console.error(err);
        sendProgress({ status: 'error', message: 'Generation failed.', progress: 0 });
        res.status(500).json({ error: 'Server error during timetable generation' });
    }
};

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
exports.getTimetable = async (_req, res) => {
    try {
        const rows = await decorateScheduleRows(db.getTimetableData());
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
exports.getWorkingTimetable = async (_req, res) => {
    try {
        const rows = await decorateScheduleRows(db.getWorkingTimetable());
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
exports.getTimetableStatus = async (_req, res) => {
    try {
        const workflow = db.getTimetableWorkflow();
        const options = db.getGeneratedTimetableOptions();
        const published = db.getTimetableData();
        const working = db.getWorkingTimetable();
        const versions = db.getTimetableVersions();
        const { rows: classrooms } = await db.query('SELECT * FROM classrooms');
        const conflictAnalysis = working.length > 0
            ? await analyzeSchedule(working)
            : { summary: summarizeConflicts([]) };

        res.json({
            ...workflow,
            option_count: options.length,
            version_count: versions.length,
            published_entry_count: published.length,
            draft_entry_count: working.length,
            draft_conflict_count: conflictAnalysis.summary.total,
            draft_hard_conflict_count: conflictAnalysis.summary.hard,
            draft_soft_conflict_count: conflictAnalysis.summary.soft,
            maintenance_block_count: classrooms.filter((room) => room.maintenance_mode).length,
            has_published: published.length > 0,
            has_draft: working.length > 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
exports.getTimetableOptions = async (_req, res) => {
    try {
        const workflow = db.getTimetableWorkflow();
        const options = db.getGeneratedTimetableOptions().map((option) => summarizeOption(option, workflow));
        res.json(options);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
exports.getTimetableHistory = async (_req, res) => {
    try {
        const versions = db.getTimetableVersions().map(summarizeVersion);
        res.json(versions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.selectTimetableOption = async (req, res) => {
    try {
        const { optionId } = req.params;
        const options = db.getGeneratedTimetableOptions();
        const option = options.find((candidate) => candidate.id === optionId);

        if (!option) {
            return res.status(404).json({ error: 'Timetable option not found.' });
        }

        db.setGeneratedTimetable(option.schedule);
        db.replaceWorkingTimetable(option.schedule);
        db.setTimetableWorkflow({
            status: 'draft',
            working_option_id: option.id
        });
        addTimetableVersion({
            scope: 'draft',
            action: 'selected-option',
            note: `Selected ${option.label} as the working draft.`,
            actorId: req.user?.id,
            schedule: option.schedule,
            sourceOptionId: option.id
        });
        addTimetableAudit({
            action: 'timetable.option-selected',
            actorId: req.user?.id,
            summary: `Selected ${option.label} as the working draft.`,
            metadata: { option_id: option.id, label: option.label }
        });

        const workflow = db.getTimetableWorkflow();
        res.json({
            message: 'Timetable option selected for review.',
            option: summarizeOption(option, workflow)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.rollbackTimetableVersion = async (req, res) => {
    try {
        const { versionId } = req.params;
        const versions = db.getTimetableVersions();
        const version = versions.find((item) => String(item.id) === String(versionId));

        if (!version) {
            return res.status(404).json({ error: 'Timetable version not found.' });
        }

        if (version.scope === 'published') {
            db.replaceTimetable(version.schedule);
            db.setTimetableWorkflow({
                status: 'published',
                published_option_id: version.source_option_id || db.getTimetableWorkflow().published_option_id || null,
                last_published_at: new Date().toISOString(),
                last_published_by: req.user?.id || null
            });
            await notifyUsersByRole(
                ['teacher', 'student'],
                `The published timetable was rolled back on ${new Date().toLocaleDateString('en-US')}. Review the latest schedule.`,
                'timetable'
            );
        } else {
            db.replaceWorkingTimetable(version.schedule);
            db.setTimetableWorkflow({
                status: 'draft',
                working_option_id: version.source_option_id || db.getTimetableWorkflow().working_option_id || null
            });
        }

        addTimetableVersion({
            scope: version.scope,
            action: 'rollback',
            note: `Rolled back ${version.scope} timetable to version ${version.id}.`,
            actorId: req.user?.id,
            schedule: version.schedule,
            sourceOptionId: version.source_option_id || null,
            metadata: { restored_version_id: version.id }
        });
        addTimetableAudit({
            action: 'timetable.rollback',
            actorId: req.user?.id,
            summary: `Rolled back the ${version.scope} timetable to version ${version.id}.`,
            metadata: { restored_version_id: version.id, scope: version.scope }
        });

        res.json({
            message: `Rolled back ${version.scope} timetable.`,
            version: summarizeVersion(version)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.publishTimetable = async (req, res) => {
    try {
        const working = db.getWorkingTimetable();
        if (working.length === 0) {
            return res.status(400).json({ error: 'No draft timetable is available to publish.' });
        }

        const publishedAt = new Date().toISOString();
        const workflow = db.getTimetableWorkflow();

        db.replaceTimetable(working);
        db.setTimetableWorkflow({
            status: 'published',
            published_option_id: workflow.working_option_id || workflow.published_option_id || null,
            last_published_at: publishedAt,
            last_published_by: req.user?.id || null
        });
        addTimetableVersion({
            scope: 'published',
            action: 'published',
            note: 'Published the current draft timetable.',
            actorId: req.user?.id,
            schedule: working,
            sourceOptionId: workflow.working_option_id || workflow.published_option_id || null
        });
        addTimetableAudit({
            action: 'timetable.published',
            actorId: req.user?.id,
            summary: 'Published the current timetable draft.',
            metadata: {
                published_option_id: workflow.working_option_id || workflow.published_option_id || null,
                entry_count: working.length
            }
        });

        await notifyUsersByRole(
            ['teacher', 'student'],
            `A new timetable was published on ${new Date(publishedAt).toLocaleDateString('en-US')}. Review the latest schedule.`,
            'timetable'
        );

        res.json({
            message: 'Timetable published successfully.',
            published_at: publishedAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getStudentTimetable = async (req, res) => {
    try {
        const { classId } = req.params;
        const rows = await decorateScheduleRows(db.getTimetableData());
        const filtered = rows.filter((row) => {
            if (!classId) return false;
            if (!Number.isNaN(Number(classId)) && Number(classId) === Number(row.classroom_id)) return true;
            return row.classroom_name === classId;
        });
        res.json(filtered);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const detectConflicts = async () => analyzeSchedule(db.getWorkingTimetable());

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
exports.getConflicts = async (_req, res) => {
    try {
        const analysis = await detectConflicts();
        res.json(analysis);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.fixConflict = async (req, res) => {
    try {
        const { conflictId } = req.body;
        const analysis = await detectConflicts();
        const conflict = analysis.conflicts.find((candidate) => candidate.id === conflictId);
        if (!conflict) return res.status(404).json({ error: 'Conflict not found' });

        const timetable = db.getWorkingTimetable();

        if ([
            'teacher_double_booked',
            'teacher_unavailable',
            'teacher_daily_overload',
            'teacher_weekly_overload'
        ].includes(conflict.constraint_code)) {
            const entry = timetable.find((item) => item.id == conflict.entry_id);
            if (!entry) return res.status(400).json({ error: 'Unable to locate conflict entry' });

            const suggestions = await findSubstitutes({
                subject_id: entry.subject_id,
                day_of_week: entry.day_of_week,
                start_time: entry.start_time,
                exclude_teacher_id: entry.teacher_id
            });

            if (suggestions.length === 0) return res.status(400).json({ error: 'No substitute found' });

            entry.substitute_teacher_id = suggestions[0].teacher_id;
            db.replaceWorkingTimetable(timetable);
        } else if (['room_double_booked', 'room_maintenance'].includes(conflict.constraint_code)) {
            const entry = timetable.find((item) => item.id == conflict.entry_id);
            if (!entry) return res.status(400).json({ error: 'Unable to locate conflict entry' });

            const { rows: classrooms } = await db.query('SELECT * FROM classrooms');
            const occupiedRooms = timetable
                .filter((item) => item.day_of_week === entry.day_of_week && item.start_time === entry.start_time)
                .map((item) => Number(item.classroom_id));
            const availableRoom = classrooms.find((room) => (
                !occupiedRooms.includes(Number(room.id))
                && !room.maintenance_mode
            ));
            if (!availableRoom) return res.status(400).json({ error: 'No available room' });

            entry.classroom_id = availableRoom.id;
            db.replaceWorkingTimetable(timetable);
        } else {
            return res.status(400).json({ error: 'Auto-fix is not available for this conflict type' });
        }

        res.json({ message: 'Conflict fixed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.validateSwap = async (req, res) => {
    try {
        const { entry_id, target_day, target_start_time, paired_entry_id } = req.body;
        const timetable = db.getWorkingTimetable();
        const entry = timetable.find((item) => item.id == entry_id);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        const targetSlot = TIMESLOTS[slotIndex.get(target_start_time)];
        if (!targetSlot) return res.status(400).json({ error: 'Invalid target slot' });

        const [{ rows: leaveRequests }, { rows: availability }] = await Promise.all([
            db.query('SELECT * FROM leave_requests'),
            db.query('SELECT * FROM teacher_availability')
        ]);

        const leaveMap = buildLeaveMap(leaveRequests);
        const { blockedSet } = buildAvailabilityMaps(availability);
        const teacherUnavailable = (teacherId, day, start) => isTeacherUnavailable(
            teacherId,
            day,
            start,
            leaveMap,
            blockedSet
        );

        const targetEntry = timetable.find((item) =>
            item.day_of_week === target_day &&
            item.start_time === target_start_time &&
            item.classroom_id === entry.classroom_id
        );

        if (paired_entry_id) {
            const paired = timetable.find((item) => item.id == paired_entry_id);
            if (!paired) return res.status(400).json({ error: 'Lab pair not found' });

            const nextIndex = slotIndex.get(target_start_time) + 1;
            const nextSlot = TIMESLOTS[nextIndex];
            if (!nextSlot || TIMESLOTS[slotIndex.get(target_start_time)].breakAfter) {
                return res.status(400).json({ error: 'Lab cannot cross break' });
            }

            const nextEntry = timetable.find((item) =>
                item.day_of_week === target_day &&
                item.start_time === nextSlot.start &&
                item.classroom_id === entry.classroom_id
            );

            if (nextEntry || targetEntry) return res.status(400).json({ error: 'Target lab slot occupied' });
            if (
                teacherUnavailable(entry.teacher_id, target_day, target_start_time) ||
                teacherUnavailable(entry.teacher_id, target_day, nextSlot.start)
            ) {
                return res.status(400).json({ error: 'Teacher unavailable for lab slot' });
            }

            entry.day_of_week = target_day;
            entry.start_time = target_start_time;
            entry.end_time = targetSlot.end;

            paired.day_of_week = target_day;
            paired.start_time = nextSlot.start;
            paired.end_time = nextSlot.end;

            db.replaceWorkingTimetable(timetable);
            return res.json(await decorateScheduleRows(timetable));
        }

        if (targetEntry) {
            const tempDay = entry.day_of_week;
            const tempStart = entry.start_time;
            const tempEnd = entry.end_time;

            entry.day_of_week = targetEntry.day_of_week;
            entry.start_time = targetEntry.start_time;
            entry.end_time = targetEntry.end_time;

            targetEntry.day_of_week = tempDay;
            targetEntry.start_time = tempStart;
            targetEntry.end_time = tempEnd;
        } else {
            entry.day_of_week = target_day;
            entry.start_time = target_start_time;
            entry.end_time = targetSlot.end;
        }

        const teacherConflict = timetable.some((item) =>
            item.id !== entry.id &&
            item.teacher_id === entry.teacher_id &&
            item.day_of_week === entry.day_of_week &&
            item.start_time === entry.start_time
        );

        if (teacherConflict) return res.status(400).json({ error: 'Teacher conflict at target slot' });
        if (teacherUnavailable(entry.teacher_id, entry.day_of_week, entry.start_time)) {
            return res.status(400).json({ error: 'Teacher unavailable for target slot' });
        }

        db.replaceWorkingTimetable(timetable);
        res.json(await decorateScheduleRows(timetable));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.saveLayout = async (req, res) => {
    try {
        const { schedule } = req.body;
        if (!Array.isArray(schedule)) return res.status(400).json({ error: 'Invalid schedule' });

        const sanitized = schedule.map((entry) => ({
            id: entry.id,
            subject_id: entry.subject_id,
            teacher_id: entry.teacher_id,
            classroom_id: entry.classroom_id,
            day_of_week: entry.day_of_week,
            start_time: entry.start_time,
            end_time: entry.end_time,
            substitute_teacher_id: entry.substitute_teacher_id || null,
            session_type: entry.session_type || 'theory'
        }));

        db.replaceWorkingTimetable(sanitized);
        addTimetableVersion({
            scope: 'draft',
            action: 'saved',
            note: 'Saved manual edits to the working draft.',
            actorId: req.user?.id,
            schedule: sanitized,
            sourceOptionId: db.getTimetableWorkflow().working_option_id || null
        });
        addTimetableAudit({
            action: 'timetable.saved',
            actorId: req.user?.id,
            summary: 'Saved manual edits to the working draft timetable.',
            metadata: { entry_count: sanitized.length }
        });
        res.json({ message: 'Layout saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
exports.resetTimetable = async (_req, res) => {
    try {
        const generated = db.getGeneratedTimetable();
        db.replaceWorkingTimetable(generated);
        addTimetableVersion({
            scope: 'draft',
            action: 'reset',
            note: 'Reset the draft timetable to the selected AI option.',
            actorId: _req.user?.id,
            schedule: generated,
            sourceOptionId: db.getTimetableWorkflow().working_option_id || null
        });
        addTimetableAudit({
            action: 'timetable.reset',
            actorId: _req.user?.id,
            summary: 'Reset the draft timetable to the selected AI option.',
            metadata: { entry_count: generated.length }
        });
        res.json({ message: 'Draft timetable reset to selected AI option.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
