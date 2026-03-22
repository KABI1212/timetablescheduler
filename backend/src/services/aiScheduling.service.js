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
        teacherMappings.forEach((mapping) => {
            const teacherId = Number(mapping.teacher_id || mapping.id);
            const subjectId = Number(mapping.subject_id);
            if (!this.subjectTeacherMap.has(subjectId)) {
                this.subjectTeacherMap.set(subjectId, teacherId);
            }
            if (!teacherId) return;
            const requiredHours = this.getTargetSubjectTotalHours(subjectId) * this.classrooms.length;
            this.teacherRequiredHours.set(
                teacherId,
                (this.teacherRequiredHours.get(teacherId) || 0) + requiredHours
            );
        });

        this.leaveMap = new Map();
        (options.leaveRequests || []).forEach((request) => {
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
            this.leaveMap.set(request.teacher_id, days);
        });

        this.unavailableMap = new Set();
        (options.availability || []).forEach((entry) => {
            if (!entry.is_available) {
                this.unavailableMap.add(`${entry.teacher_id}-${entry.day_of_week}-${entry.timeslot}`);
            }
        });
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
        if (this.unavailableMap.has(`${teacherId}-${day}-${timeslot}`)) return true;
        return false;
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

        const shuffle = (list) => {
            const copy = [...list];
            for (let i = copy.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
        };

        const buildAttempt = () => {
            const schedule = [];
            const teacherSlots = new Set();
            const teacherDailyCount = new Map();
            const teacherWeeklyCount = new Map();
            let missing = 0;

            for (const classroom of classrooms) {
                const occupied = new Set();
                const remainingTheory = new Map();
                const remainingLabBlocks = new Map();
                const dayUsage = new Map();
                const labDayUsage = new Map();
                const dayLimit = new Map();
                const prevByDay = new Map();
                const getRemainingLoad = (subject) =>
                    (remainingTheory.get(subject.id) || 0) +
                    ((remainingLabBlocks.get(subject.id) || 0) * this.getLabDuration(subject));

                subjects.forEach((subject) => {
                    const target = this.getTargetForSubject(subject.id);
                    remainingTheory.set(subject.id, target.theoryHours);
                    remainingLabBlocks.set(subject.id, target.labBlocks);
                    dayLimit.set(subject.id, Math.max(1, Math.ceil(target.totalHours / DAYS.length)));
                });

                const incrementDayUsage = (day, subjectId, amount = 1) => {
                    const usage = dayUsage.get(day) || new Map();
                    usage.set(subjectId, (usage.get(subjectId) || 0) + amount);
                    dayUsage.set(day, usage);
                };

                const markLabDay = (day, subjectId) => {
                    const usage = labDayUsage.get(day) || new Set();
                    usage.add(subjectId);
                    labDayUsage.set(day, usage);
                };

                const canUseSlotWindow = (teacherId, day, startIndex, length) => {
                    const dailyKey = `${teacherId}-${day}`;
                    const dailyCount = teacherDailyCount.get(dailyKey) || 0;

                    if (dailyCount + length > 6) return false;

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
                };

                const canPlace = (day, slotIndex, subject, allowOverLimit) => {
                    const teacherId = this.subjectTeacherMap.get(subject.id);
                    if (!teacherId) return false;
                    if ((remainingTheory.get(subject.id) || 0) <= 0) return false;
                    const usage = dayUsage.get(day) || new Map();
                    const usageCount = usage.get(subject.id) || 0;
                    if (!allowOverLimit && usageCount >= (dayLimit.get(subject.id) || 1)) return false;
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
                    return canUseSlotWindow(teacherId, day, slotIndex, 1);
                };

                const canPlaceLab = (day, startIndex, subject) => {
                    const teacherId = this.subjectTeacherMap.get(subject.id);
                    if (!teacherId) return false;
                    if ((remainingLabBlocks.get(subject.id) || 0) <= 0) return false;
                    if (startIndex % LAB_BLOCK_LENGTH !== 0) return false;
                    const usage = labDayUsage.get(day) || new Set();
                    if (usage.has(subject.id)) return false;
                    return canUseSlotWindow(teacherId, day, startIndex, this.getLabDuration(subject));
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
                    teacherDailyCount.set(dailyKey, (teacherDailyCount.get(dailyKey) || 0) + 1);
                    teacherWeeklyCount.set(teacherId, (teacherWeeklyCount.get(teacherId) || 0) + 1);
                };

                const placeLabBlock = (subject, day, startIndex) => {
                    const duration = this.getLabDuration(subject);
                    for (let offset = 0; offset < duration; offset += 1) {
                        placeEntry(subject, day, startIndex + offset, 'lab');
                    }
                    remainingLabBlocks.set(subject.id, Math.max(0, (remainingLabBlocks.get(subject.id) || 0) - 1));
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
                        const remainingDiff = getRemainingLoad(b) - getRemainingLoad(a);
                        if (remainingDiff !== 0) return remainingDiff;
                        const usageA = (dayUsage.get(day) || new Map()).get(a.id) || 0;
                        const usageB = (dayUsage.get(day) || new Map()).get(b.id) || 0;
                        if (usageA !== usageB) return usageA - usageB;
                        return Math.random() - 0.5;
                    });
                    const pickCount = Math.min(3, candidates.length);
                    return candidates[Math.floor(Math.random() * pickCount)];
                };

                const labSubjects = shuffle(subjects.filter((subject) => this.getLabHours(subject) > 0));
                for (const subject of labSubjects) {
                    while ((remainingLabBlocks.get(subject.id) || 0) > 0) {
                        const placements = [];
                        shuffle(DAYS).forEach((day) => {
                            for (let slotIndex = 0; slotIndex < TIMESLOTS.length; slotIndex += 1) {
                                if (canPlaceLab(day, slotIndex, subject)) {
                                    const usage = dayUsage.get(day) || new Map();
                                    placements.push({
                                        day,
                                        slotIndex,
                                        score: usage.get(subject.id) || 0
                                    });
                                }
                            }
                        });

                        if (placements.length === 0) {
                            missing += this.getLabDuration(subject) * (remainingLabBlocks.get(subject.id) || 0);
                            remainingLabBlocks.set(subject.id, 0);
                            break;
                        }

                        placements.sort((a, b) => a.score - b.score || a.slotIndex - b.slotIndex);
                        const pickCount = Math.min(3, placements.length);
                        const placement = placements[Math.floor(Math.random() * pickCount)];
                        placeLabBlock(subject, placement.day, placement.slotIndex);
                    }
                }

                const dayOrder = shuffle(DAYS);
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
                        remainingTheory.set(subject.id, Math.max(0, (remainingTheory.get(subject.id) || 0) - 1));
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
            const count = dailySubjectCount.get(classDaySubjKey) || 0;
            dailySubjectCount.set(classDaySubjKey, count + 1);
            const dayLimit = dayLimitBySubject.get(entry.subject_id) || 1;
            if (count + 1 > dayLimit) conflicts += 8;

            const teacherDayKey = `${entry.teacher_id}-${entry.day_of_week}`;
            const tCount = teacherDailyCount.get(teacherDayKey) || 0;
            teacherDailyCount.set(teacherDayKey, tCount + 1);
            if (tCount + 1 > 6) conflicts += 15;

            const weeklyCount = teacherWeeklyCount.get(entry.teacher_id) || 0;
            teacherWeeklyCount.set(entry.teacher_id, weeklyCount + 1);
            const weeklyLimit = this.teacherMaxHours.get(Number(entry.teacher_id)) || 0;
            const requiredHours = this.teacherRequiredHours.get(Number(entry.teacher_id)) || 0;
            if (weeklyLimit > 0 && requiredHours <= weeklyLimit && weeklyCount + 1 > weeklyLimit) {
                conflicts += 40;
            }

            if (this.isTeacherUnavailable(entry.teacher_id, entry.day_of_week, entry.start_time)) {
                conflicts += 120;
            }

            const subjectKey = `${entry.classroom_id}-${entry.subject_id}`;
            actualCounts.set(subjectKey, (actualCounts.get(subjectKey) || 0) + 1);

            const classDayKey = `${entry.classroom_id}-${entry.day_of_week}`;
            const list = classDayEntries.get(classDayKey) || [];
            list.push(entry);
            classDayEntries.set(classDayKey, list);
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
