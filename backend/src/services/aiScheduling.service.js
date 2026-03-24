// @ts-nocheck
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMESLOTS = [
    { start: '09:15:00', end: '10:00:00' }, // P1
    { start: '10:00:00', end: '10:45:00', breakAfter: true }, // P2
    { start: '11:00:00', end: '11:45:00' }, // P3
    { start: '11:45:00', end: '12:30:00', breakAfter: true }, // P4
    { start: '13:20:00', end: '14:05:00' }, // P5
    { start: '14:05:00', end: '14:50:00', breakAfter: true }, // P6
    { start: '15:05:00', end: '15:50:00' }, // P7
    { start: '15:55:00', end: '16:40:00' }  // P8
];
const LAB_BLOCK_LENGTH = 2;
const TOTAL_PERIODS_PER_CLASSROOM = DAYS.length * TIMESLOTS.length;
const MAX_TEACHER_DAILY_LOAD = 6;
const THEORY_PICK_LIMIT = 3;
const LAB_PICK_LIMIT = 4;

const getCount = (map, key) => map.get(key) || 0;

const incrementCount = (map, key, amount = 1) => {
    const next = getCount(map, key) + amount;
    map.set(key, next);
    return next;
};

const getOrCreate = (map, key, factory) => {
    let value = map.get(key);
    if (!value) {
        value = factory();
        map.set(key, value);
    }
    return value;
};

const shuffleList = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const pickRandom = (list, limit = list.length) => {
    const pickCount = Math.min(limit, list.length);
    return list[Math.floor(Math.random() * pickCount)];
};

class TimetableScheduler {
    /**
     * @param {any[]} teacherMappings
     * @param {any[]} subjects
     * @param {any[]} classrooms
     * @param {{ leaveRequests?: any[], availability?: any[] }} [options]
     */
    constructor(teacherMappings, subjects, classrooms, options = {}) {
        this.teacherMappings = teacherMappings;
        this.subjects = subjects;
        this.classrooms = classrooms;
        this.generations = 300;
        this.populationSize = 40;
        this.teacherDetails = options.teachers || [];
        this.teacherMaxHours = new Map(
            this.teacherDetails.map((teacher) => [Number(teacher.id), Number(teacher.max_hours_per_week) || 0])
        );
        this.subjectById = new Map(this.subjects.map((subject) => [Number(subject.id), subject]));
        this.classroomSubjectTargets = this.buildClassroomSubjectTargets();
        this.teacherRequiredHours = new Map();
        this.subjectTeacherMap = new Map();
        this.buildTeacherAssignmentMaps(teacherMappings);
        this.leaveMap = this.buildLeaveMap(options.leaveRequests || []);
        const availabilityMaps = this.buildAvailabilityMaps(options.availability || []);
        this.blockedAvailability = availabilityMaps.blockedAvailability;
        this.preferredAvailability = availabilityMaps.preferredAvailability;
    }

    buildTeacherAssignmentMaps(teacherMappings) {
        teacherMappings.forEach((mapping) => {
            const teacherId = Number(mapping.teacher_id || mapping.id);
            const subjectId = Number(mapping.subject_id);
            if (!this.subjectTeacherMap.has(subjectId)) {
                this.subjectTeacherMap.set(subjectId, teacherId);
            }
            if (!teacherId) return;
            const requiredHours = this.getTargetSubjectTotalHours(subjectId) * this.classrooms.length;
            incrementCount(this.teacherRequiredHours, teacherId, requiredHours);
        });
    }

    buildLeaveMap(leaveRequests) {
        const leaveMap = new Map();
        leaveRequests.forEach((request) => {
            if (request.status !== 'Approved') return;
            const days = new Set();
            const from = new Date(request.from_date);
            const to = new Date(request.to_date);
            if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return;
            const cursor = new Date(from);
            while (cursor <= to) {
                const dayName = cursor.toLocaleDateString('en-US', { weekday: 'long' });
                days.add(dayName);
                cursor.setDate(cursor.getDate() + 1);
            }
            leaveMap.set(request.teacher_id, days);
        });
        return leaveMap;
    }

    buildAvailabilityMaps(availabilityEntries) {
        const blockedAvailability = new Set();
        const preferredAvailability = new Map();
        availabilityEntries.forEach((entry) => {
            const status = String(entry.status || '').trim().toLowerCase();
            const slotKey = `${entry.teacher_id}-${entry.day_of_week}-${entry.timeslot}`;
            if (status === 'blocked') {
                blockedAvailability.add(slotKey);
                return;
            }
            if (status === 'preferred') {
                const teacherId = Number(entry.teacher_id);
                getOrCreate(preferredAvailability, teacherId, () => new Set()).add(`${entry.day_of_week}-${entry.timeslot}`);
            }
        });
        return { blockedAvailability, preferredAvailability };
    }

    createClassroomState() {
        const remainingTheory = new Map();
        const remainingLabBlocks = new Map();
        const dayLimit = new Map();

        this.subjects.forEach((subject) => {
            const target = this.getTargetForSubject(subject.id);
            remainingTheory.set(subject.id, target.theoryHours);
            remainingLabBlocks.set(subject.id, target.labBlocks);
            dayLimit.set(subject.id, Math.max(1, Math.ceil(target.totalHours / DAYS.length)));
        });

        return {
            occupied: new Set(),
            remainingTheory,
            remainingLabBlocks,
            dayUsage: new Map(),
            labDayUsage: new Map(),
            labBlockUsage: new Map(),
            dayLimit,
            prevByDay: new Map()
        };
    }

    canUseSlotWindow({ teacherId, day, startIndex, length, occupied, teacherSlots, teacherDailyCount }) {
        const dailyKey = `${teacherId}-${day}`;
        const dailyCount = getCount(teacherDailyCount, dailyKey);

        if (dailyCount + length > MAX_TEACHER_DAILY_LOAD) return false;

        for (let offset = 0; offset < length; offset += 1) {
            const slotIndex = startIndex + offset;
            const slot = TIMESLOTS[slotIndex];
            if (!slot) return false;
            if (offset < length - 1 && slot.breakAfter) return false;
            if (occupied.has(`${day}-${slot.start}`)) return false;
            if (teacherSlots.has(`${day}-${slot.start}-${teacherId}`)) return false;
            if (this.isTeacherUnavailable(teacherId, day, slot.start)) return false;
        }

        return true;
    }

    getWindowPreferencePenalty(teacherId, day, startIndex, length = 1) {
        let penalty = 0;
        for (let offset = 0; offset < length; offset += 1) {
            const slot = TIMESLOTS[startIndex + offset];
            if (!slot) return Number.POSITIVE_INFINITY;
            penalty += this.getPreferredSlotPenalty(teacherId, day, slot.start);
        }
        return penalty;
    }

    /**
     * @param {any} subject
     */
    getTheoryHours(subject) {
        if (Number.isFinite(subject?.theory_hours)) return Math.max(0, subject.theory_hours);
        return 3;
    }

    /**
     * @param {any} subject
     */
    getLabDuration(subject) {
        if (subject?.is_lab) return LAB_BLOCK_LENGTH;
        return 1;
    }

    /**
     * @param {any} subject
     */
    getLabHours(subject) {
        if (Number.isFinite(subject?.lab_hours)) return Math.max(0, subject.lab_hours);
        return subject?.is_lab ? this.getLabDuration(subject) : 0;
    }

    /**
     * @param {any} subject
     */
    getSubjectTotalHours(subject) {
        return this.getTheoryHours(subject) + this.getLabHours(subject);
    }

    buildClassroomSubjectTargets() {
        const targets = new Map();
        const theoryEligibleSubjects = [];
        let plannedTotal = 0;

        this.subjects.forEach((subject) => {
            const theoryHours = this.getTheoryHours(subject);
            const labDuration = this.getLabDuration(subject);
            const labBlocks = Math.ceil(this.getLabHours(subject) / labDuration);
            const labHours = labBlocks * labDuration;

            targets.set(subject.id, {
                theoryHours,
                labHours,
                totalHours: theoryHours + labHours,
                labBlocks
            });
            plannedTotal += theoryHours + labHours;

            if (theoryHours > 0) {
                theoryEligibleSubjects.push(subject);
            }
        });

        let fillerTheoryHours = Math.max(0, TOTAL_PERIODS_PER_CLASSROOM - plannedTotal);
        let cursor = 0;
        while (fillerTheoryHours > 0 && theoryEligibleSubjects.length > 0) {
            const subject = theoryEligibleSubjects[cursor % theoryEligibleSubjects.length];
            const target = targets.get(subject.id);
            target.theoryHours += 1;
            target.totalHours += 1;
            fillerTheoryHours -= 1;
            cursor += 1;
        }

        return targets;
    }

    /**
     * @param {number|string} subjectId
     */
    getTargetForSubject(subjectId) {
        return this.classroomSubjectTargets.get(Number(subjectId)) || {
            theoryHours: 0,
            labHours: 0,
            totalHours: 0,
            labBlocks: 0
        };
    }

    /**
     * @param {number|string} subjectId
     */
    getTargetSubjectTotalHours(subjectId) {
        return this.getTargetForSubject(subjectId).totalHours;
    }

    /**
     * @param {number} teacherId
     * @param {string} day
     * @param {string} timeslot
     */
    isTeacherUnavailable(teacherId, day, timeslot) {
        const leaveDays = this.leaveMap.get(teacherId);
        if (leaveDays && leaveDays.has(day)) return true;
        if (this.blockedAvailability.has(`${teacherId}-${day}-${timeslot}`)) return true;
        return false;
    }

    /**
     * @param {number} teacherId
     * @returns {boolean}
     */
    hasPreferredSlots(teacherId) {
        return (this.preferredAvailability.get(Number(teacherId)) || new Set()).size > 0;
    }

    /**
     * @param {number} teacherId
     * @param {string} day
     * @param {string} timeslot
     * @returns {boolean}
     */
    isPreferredSlot(teacherId, day, timeslot) {
        return Boolean(this.preferredAvailability.get(Number(teacherId))?.has(`${day}-${timeslot}`));
    }

    /**
     * Preferred slots are soft constraints. If a teacher has declared preferences,
     * any class placed outside that set receives a small penalty.
     * @param {number} teacherId
     * @param {string} day
     * @param {string} timeslot
     * @returns {number}
     */
    getPreferredSlotPenalty(teacherId, day, timeslot) {
        if (!this.hasPreferredSlots(teacherId)) return 0;
        return this.isPreferredSlot(teacherId, day, timeslot) ? 0 : 1;
    }

    /**
     * @returns {any[]}
     */
    generateRandomChromosome() {
        return this.buildScheduleWithSingles();
    }

    /**
     * Build a schedule that assigns theory periods and consecutive lab blocks.
     * @returns {any[]}
     */
    buildScheduleWithSingles() {
        const subjects = this.subjects;
        const classrooms = this.classrooms;
        const attempts = 40;
        let bestSchedule = [];
        let bestMissing = Number.POSITIVE_INFINITY;
        let bestFitness = Number.POSITIVE_INFINITY;

        const buildAttempt = () => {
            const schedule = [];
            const teacherSlots = new Set();
            const teacherDailyCount = new Map();
            const teacherWeeklyCount = new Map();
            let missing = 0;

            for (const classroom of classrooms) {
                const {
                    occupied,
                    remainingTheory,
                    remainingLabBlocks,
                    dayUsage,
                    labDayUsage,
                    labBlockUsage,
                    dayLimit,
                    prevByDay
                } = this.createClassroomState();
                const getRemainingLoad = (subject) =>
                    getCount(remainingTheory, subject.id) +
                    (getCount(remainingLabBlocks, subject.id) * this.getLabDuration(subject));
                const getLabBlockUsage = (slotIndex) => getCount(labBlockUsage, slotIndex);
                const getDaySubjectUsage = (day, subjectId) => getCount(dayUsage.get(day) || new Map(), subjectId);

                const incrementDayUsage = (day, subjectId, amount = 1) => {
                    incrementCount(getOrCreate(dayUsage, day, () => new Map()), subjectId, amount);
                };

                const markLabDay = (day, subjectId) => {
                    getOrCreate(labDayUsage, day, () => new Set()).add(subjectId);
                };

                const canPlace = (day, slotIndex, subject, allowOverLimit) => {
                    const teacherId = this.subjectTeacherMap.get(subject.id);
                    if (!teacherId) return false;
                    if (getCount(remainingTheory, subject.id) <= 0) return false;
                    if (!allowOverLimit && getDaySubjectUsage(day, subject.id) >= getCount(dayLimit, subject.id)) return false;
                    const previousSlot = TIMESLOTS[slotIndex - 1];
                    if (previousSlot) {
                        const previousEntry = schedule.find((entry) =>
                            entry.classroom_id === classroom.id &&
                            entry.day_of_week === day &&
                            entry.start_time === previousSlot.start
                        );
                        if (previousEntry && previousEntry.subject_id === subject.id && previousEntry.session_type !== 'lab') {
                            return false;
                        }
                    }
                    return this.canUseSlotWindow({
                        teacherId,
                        day,
                        startIndex: slotIndex,
                        length: 1,
                        occupied,
                        teacherSlots,
                        teacherDailyCount
                    });
                };

                const canPlaceLab = (day, startIndex, subject) => {
                    const teacherId = this.subjectTeacherMap.get(subject.id);
                    if (!teacherId) return false;
                    if (getCount(remainingLabBlocks, subject.id) <= 0) return false;
                    if (startIndex % LAB_BLOCK_LENGTH !== 0) return false;
                    if ((labDayUsage.get(day) || new Set()).has(subject.id)) return false;
                    return this.canUseSlotWindow({
                        teacherId,
                        day,
                        startIndex,
                        length: this.getLabDuration(subject),
                        occupied,
                        teacherSlots,
                        teacherDailyCount
                    });
                };

                const placeEntry = (subject, day, slotIndex, sessionType) => {
                    const teacherId = this.subjectTeacherMap.get(subject.id);
                    const slot = TIMESLOTS[slotIndex];
                    if (!teacherId || !slot) return;

                    schedule.push({
                        subject_id: subject.id,
                        teacher_id: teacherId,
                        classroom_id: classroom.id,
                        day_of_week: day,
                        start_time: slot.start,
                        end_time: slot.end,
                        session_type: sessionType
                    });
                    occupied.add(`${day}-${slot.start}`);
                    teacherSlots.add(`${day}-${slot.start}-${teacherId}`);

                    const dailyKey = `${teacherId}-${day}`;
                    incrementCount(teacherDailyCount, dailyKey);
                    incrementCount(teacherWeeklyCount, teacherId);
                };

                const placeLabBlock = (subject, day, startIndex) => {
                    const duration = this.getLabDuration(subject);
                    for (let offset = 0; offset < duration; offset += 1) {
                        placeEntry(subject, day, startIndex + offset, 'lab');
                    }
                    incrementCount(labBlockUsage, startIndex);
                    remainingLabBlocks.set(subject.id, Math.max(0, getCount(remainingLabBlocks, subject.id) - 1));
                    incrementDayUsage(day, subject.id, duration);
                    markLabDay(day, subject.id);
                };

                const selectSubject = (day, slotIndex, prevSubjectId, allowOverLimit) => {
                    let candidates = subjects.filter((subject) => canPlace(day, slotIndex, subject, allowOverLimit));
                    if (candidates.length === 0) return null;
                    if (prevSubjectId) {
                        const filtered = candidates.filter((subject) => subject.id !== prevSubjectId);
                        if (filtered.length > 0) candidates = filtered;
                    }
                    candidates.sort((a, b) => {
                        const teacherPenaltyA = this.getWindowPreferencePenalty(this.subjectTeacherMap.get(a.id), day, slotIndex);
                        const teacherPenaltyB = this.getWindowPreferencePenalty(this.subjectTeacherMap.get(b.id), day, slotIndex);
                        if (teacherPenaltyA !== teacherPenaltyB) return teacherPenaltyA - teacherPenaltyB;
                        const remainingDiff = getRemainingLoad(b) - getRemainingLoad(a);
                        if (remainingDiff !== 0) return remainingDiff;
                        const usageA = getDaySubjectUsage(day, a.id);
                        const usageB = getDaySubjectUsage(day, b.id);
                        if (usageA !== usageB) return usageA - usageB;
                        return Math.random() - 0.5;
                    });
                    return pickRandom(candidates, THEORY_PICK_LIMIT);
                };

                const labSubjects = shuffleList(subjects.filter((subject) => this.getLabHours(subject) > 0));
                for (const subject of labSubjects) {
                    while (getCount(remainingLabBlocks, subject.id) > 0) {
                        const placements = [];
                        shuffleList(DAYS).forEach((day) => {
                            for (let slotIndex = 0; slotIndex < TIMESLOTS.length; slotIndex += 1) {
                                if (canPlaceLab(day, slotIndex, subject)) {
                                    placements.push({
                                        day,
                                        slotIndex,
                                        tieBreaker: Math.random(),
                                        score: getDaySubjectUsage(day, subject.id)
                                            + getLabBlockUsage(slotIndex)
                                            + this.getWindowPreferencePenalty(
                                                this.subjectTeacherMap.get(subject.id),
                                                day,
                                                slotIndex,
                                                this.getLabDuration(subject)
                                            ) * 2
                                    });
                                }
                            }
                        });

                        if (placements.length === 0) {
                            missing += this.getLabDuration(subject) * getCount(remainingLabBlocks, subject.id);
                            remainingLabBlocks.set(subject.id, 0);
                            break;
                        }

                        // Spread labs across all valid double-period windows instead of
                        // always drifting toward the earliest morning slots.
                        placements.sort((a, b) => a.score - b.score || a.tieBreaker - b.tieBreaker);
                        const placement = pickRandom(placements, LAB_PICK_LIMIT);
                        placeLabBlock(subject, placement.day, placement.slotIndex);
                    }
                }

                const dayOrder = shuffleList(DAYS);
                for (const day of dayOrder) {
                    prevByDay.set(day, null);
                    for (let slotIndex = 0; slotIndex < TIMESLOTS.length; slotIndex += 1) {
                        const slot = TIMESLOTS[slotIndex];
                        if (occupied.has(`${day}-${slot.start}`)) {
                            continue;
                        }
                        const prevSubjectId = prevByDay.get(day);
                        const subject = selectSubject(day, slotIndex, prevSubjectId, false)
                            || selectSubject(day, slotIndex, prevSubjectId, true);
                        if (!subject) {
                            prevByDay.set(day, null);
                            continue;
                        }
                        placeEntry(subject, day, slotIndex, 'theory');
                        remainingTheory.set(subject.id, Math.max(0, getCount(remainingTheory, subject.id) - 1));
                        incrementDayUsage(day, subject.id);
                        prevByDay.set(day, subject.id);
                    }
                }

                for (const count of remainingTheory.values()) {
                    if (count > 0) missing += count;
                }
            }

            return { schedule, missing };
        };

        for (let attempt = 0; attempt < attempts; attempt++) {
            const result = buildAttempt();
            const fitness = this.calculateFitness(result.schedule);
            if (result.missing < bestMissing || (result.missing === bestMissing && fitness < bestFitness)) {
                bestMissing = result.missing;
                bestFitness = fitness;
                bestSchedule = result.schedule;
                if (bestMissing === 0 && bestFitness === 0) break;
            }
        }

        return bestSchedule;
    }

    /**
     * @param {any[]} schedule
     */
    calculateFitness(schedule) {
        let conflicts = 0;
        const teacherUsage = new Map();
        const classroomUsage = new Map();
        const dailySubjectCount = new Map();
        const teacherDailyCount = new Map();
        const teacherWeeklyCount = new Map();
        const dayLimitBySubject = new Map();
        this.subjects.forEach((subject) => {
            dayLimitBySubject.set(subject.id, Math.max(1, Math.ceil(this.getTargetSubjectTotalHours(subject.id) / DAYS.length)));
        });

        const desiredCounts = new Map();
        this.classrooms.forEach((classroom) => {
            this.subjects.forEach((subject) => {
                desiredCounts.set(`${classroom.id}-${subject.id}`, this.getTargetSubjectTotalHours(subject.id));
            });
        });
        const actualCounts = new Map();
        const classDayEntries = new Map();
        const slotOrder = new Map(TIMESLOTS.map((slot, index) => [slot.start, index]));

        for (const entry of schedule) {
            const key = `${entry.day_of_week}-${entry.start_time}`;
            const tKey = `${key}-${entry.teacher_id}`;
            if (teacherUsage.has(tKey)) conflicts += 100;
            teacherUsage.set(tKey, true);

            const cKey = `${key}-${entry.classroom_id}`;
            if (classroomUsage.has(cKey)) conflicts += 10;
            classroomUsage.set(cKey, true);

            const classDaySubjKey = `${entry.classroom_id}-${entry.day_of_week}-${entry.subject_id}`;
            const count = incrementCount(dailySubjectCount, classDaySubjKey);
            const dayLimit = dayLimitBySubject.get(entry.subject_id) || 1;
            if (count > dayLimit) conflicts += 8;

            const teacherDayKey = `${entry.teacher_id}-${entry.day_of_week}`;
            const tCount = incrementCount(teacherDailyCount, teacherDayKey);
            if (tCount > MAX_TEACHER_DAILY_LOAD) conflicts += 15;

            const weeklyCount = incrementCount(teacherWeeklyCount, entry.teacher_id);
            const weeklyLimit = this.teacherMaxHours.get(Number(entry.teacher_id)) || 0;
            const requiredHours = this.teacherRequiredHours.get(Number(entry.teacher_id)) || 0;
            if (weeklyLimit > 0 && requiredHours <= weeklyLimit && weeklyCount > weeklyLimit) {
                conflicts += 40;
            }

            if (this.isTeacherUnavailable(entry.teacher_id, entry.day_of_week, entry.start_time)) {
                conflicts += 120;
            }

            conflicts += this.getPreferredSlotPenalty(entry.teacher_id, entry.day_of_week, entry.start_time) * 6;

            const subjectKey = `${entry.classroom_id}-${entry.subject_id}`;
            incrementCount(actualCounts, subjectKey);

            const classDayKey = `${entry.classroom_id}-${entry.day_of_week}`;
            const list = getOrCreate(classDayEntries, classDayKey, () => []);
            list.push(entry);
        }

        for (const [key, desired] of desiredCounts.entries()) {
            const actual = actualCounts.get(key) || 0;
            if (actual < desired) conflicts += (desired - actual) * 20;
            if (actual > desired) conflicts += (actual - desired) * 10;
        }

        for (const entries of classDayEntries.values()) {
            entries.sort((a, b) => (slotOrder.get(a.start_time) || 0) - (slotOrder.get(b.start_time) || 0));
            for (let i = 1; i < entries.length; i += 1) {
                const current = entries[i];
                const previous = entries[i - 1];
                if (
                    current.subject_id === previous.subject_id &&
                    !(current.session_type === 'lab' && previous.session_type === 'lab')
                ) {
                    conflicts += 6;
                }
            }
        }

        return conflicts;
    }

    /**
     * @param {(payload: { generation: number, fitness: number, progress: number, message: string }) => void} [onProgress]
     */
    async run(onProgress) {
        let population = Array.from({ length: this.populationSize }, () => this.generateRandomChromosome());
        for (let generation = 0; generation < this.generations; generation++) {
            population.sort((a, b) => this.calculateFitness(a) - this.calculateFitness(b));

            const bestFitness = this.calculateFitness(population[0]);
            const fitnessPercent = Math.max(0, 100 - bestFitness);

            if (onProgress) {
                onProgress({
                    generation: generation + 1,
                    fitness: fitnessPercent,
                    progress: Math.min(95, Math.floor(((generation + 1) / this.generations) * 90) + 5),
                    message: generation === 0 ? 'Initializing population...' : 'Crossover & Mutation in progress...'
                });
            }

            if (bestFitness === 0) {
                return population[0];
            }

            const nextGeneration = population.slice(0, Math.floor(this.populationSize / 2));
            while (nextGeneration.length < this.populationSize) {
                const parent = nextGeneration[Math.floor(Math.random() * nextGeneration.length)];
                const child = JSON.parse(JSON.stringify(parent));

                const mutateIndex1 = Math.floor(Math.random() * child.length);
                const mutateIndex2 = Math.floor(Math.random() * child.length);

                if (child[mutateIndex1].classroom_id === child[mutateIndex2].classroom_id) {
                    const tempDay = child[mutateIndex1].day_of_week;
                    const tempStart = child[mutateIndex1].start_time;
                    const tempEnd = child[mutateIndex1].end_time;

                    child[mutateIndex1].day_of_week = child[mutateIndex2].day_of_week;
                    child[mutateIndex1].start_time = child[mutateIndex2].start_time;
                    child[mutateIndex1].end_time = child[mutateIndex2].end_time;

                    child[mutateIndex2].day_of_week = tempDay;
                    child[mutateIndex2].start_time = tempStart;
                    child[mutateIndex2].end_time = tempEnd;
                }
                nextGeneration.push(child);
            }
            population = nextGeneration;
        }

        population.sort((a, b) => this.calculateFitness(a) - this.calculateFitness(b));
        return population[0];
    }
}

module.exports = TimetableScheduler;
