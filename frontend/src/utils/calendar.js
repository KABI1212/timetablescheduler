const DAY_INDEX = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
};

const pad = (value) => String(value).padStart(2, '0');

const escapeText = (value) => String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

const sortEntries = (entries) => [...entries].sort((a, b) => {
    const dayDiff = (DAY_INDEX[a.day_of_week] || 99) - (DAY_INDEX[b.day_of_week] || 99);
    if (dayDiff !== 0) return dayDiff;
    return String(a.start_time || '').localeCompare(String(b.start_time || ''));
});

const mergeRecurringEntries = (entries) => {
    const merged = [];

    sortEntries(entries).forEach((entry) => {
        const previous = merged[merged.length - 1];
        const canMerge = previous
            && previous.day_of_week === entry.day_of_week
            && previous.subject_id === entry.subject_id
            && previous.teacher_id === entry.teacher_id
            && previous.substitute_teacher_id === entry.substitute_teacher_id
            && previous.classroom_id === entry.classroom_id
            && previous.session_type === entry.session_type
            && previous.end_time === entry.start_time;

        if (canMerge) {
            previous.end_time = entry.end_time;
            return;
        }

        merged.push({ ...entry });
    });

    return merged;
};

const getNextOccurrence = (dayName) => {
    const today = new Date();
    const targetDay = DAY_INDEX[dayName];
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (!Number.isInteger(targetDay)) return base;

    let delta = targetDay - base.getDay();
    if (delta < 0) delta += 7;

    base.setDate(base.getDate() + delta);
    return base;
};

const buildLocalDateTime = (baseDate, timeValue) => {
    const [hours = '00', minutes = '00', seconds = '00'] = String(timeValue || '00:00:00').split(':');
    const date = new Date(baseDate);
    date.setHours(Number(hours), Number(minutes), Number(seconds), 0);
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const buildUtcStamp = () => {
    const now = new Date();
    return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
};

export const downloadCalendarFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const buildICalendar = (entries, options = {}) => {
    const calendarName = options.calendarName || 'ChronoCampus Timetable';
    const recurrenceCount = Number(options.recurrenceCount) > 0 ? Number(options.recurrenceCount) : 16;
    const dtStamp = buildUtcStamp();

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ChronoCampus//Smart Timetable Scheduler//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeText(calendarName)}`
    ];

    mergeRecurringEntries(entries).forEach((entry, index) => {
        const baseDate = getNextOccurrence(entry.day_of_week);
        const teacherName = entry.substitute_teacher_name || entry.teacher_name || 'Faculty';
        const summary = `${entry.subject_name || 'Class'}${entry.session_type === 'lab' ? ' Lab' : ''}`;
        const description = [
            `Teacher: ${teacherName}`,
            `Classroom: ${entry.classroom_name || 'Unassigned'}`,
            `Session: ${entry.session_type === 'lab' ? 'Lab' : 'Theory'}`
        ].join('\n');

        lines.push(
            'BEGIN:VEVENT',
            `UID:${entry.id || `${entry.subject_id}-${entry.classroom_id}-${entry.day_of_week}-${entry.start_time}-${index}`}@chronocampus.local`,
            `DTSTAMP:${dtStamp}`,
            `DTSTART:${buildLocalDateTime(baseDate, entry.start_time)}`,
            `DTEND:${buildLocalDateTime(baseDate, entry.end_time)}`,
            `RRULE:FREQ=WEEKLY;COUNT=${recurrenceCount}`,
            `SUMMARY:${escapeText(summary)}`,
            `DESCRIPTION:${escapeText(description)}`,
            `LOCATION:${escapeText(entry.classroom_name || '')}`,
            'END:VEVENT'
        );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
};
