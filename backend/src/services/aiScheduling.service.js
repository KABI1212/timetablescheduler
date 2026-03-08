const db = require('../config/db');

// Simple Genetic Algorithm for Timetable Scheduling
// Constraint Satisfaction Optimization

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMESLOTS = [
    { start: '09:15:00', end: '10:00:00' }, // P1
    { start: '10:00:00', end: '10:45:00' }, // P2
    { start: '11:00:00', end: '11:45:00' }, // P3
    { start: '11:45:00', end: '12:30:00' }, // P4
    { start: '13:20:00', end: '14:05:00' }, // P5
    { start: '14:05:00', end: '14:50:00' }, // P6
    { start: '15:05:00', end: '15:50:00' }, // P7
    { start: '15:55:00', end: '16:40:00' }  // P8
];

class TimetableScheduler {
    /**
     * @param {any[]} teacherMappings
     * @param {any[]} subjects
     * @param {any[]} classrooms
     */
    constructor(teacherMappings, subjects, classrooms) {
        this.teacherMappings = teacherMappings;
        this.subjects = subjects;
        this.classrooms = classrooms;
        this.generations = 500; // Increased for higher complexity
        this.populationSize = 50;
    }

    generateRandomChromosome() {
        const schedule = [];

        // For each class (classroom), we need to fill 8 slots * 6 days = 48 slots
        for (const classroom of this.classrooms) {
            const classSlots = [];
            // Create a list of all 48 (Day, Timeslot) pairs
            for (const day of DAYS) {
                for (const timeslot of TIMESLOTS) {
                    classSlots.push({ day, timeslot });
                }
            }

            // User wants an even number of periods for all classes
            // Distribute the 48 slots evenly amongst the available subjects
            const subjectPool = [];
            const periodsPerSubject = Math.floor(48 / this.subjects.length);
            const remainder = 48 % this.subjects.length;

            for (let i = 0; i < this.subjects.length; i++) {
                const count = periodsPerSubject + (i < remainder ? 1 : 0);
                for (let j = 0; j < count; j++) {
                    subjectPool.push(this.subjects[i]);
                }
            }

            // Shuffle slots to randomize
            for (let i = classSlots.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [classSlots[i], classSlots[j]] = [classSlots[j], classSlots[i]];
            }

            // Assign subjects to slots for this class
            for (let i = 0; i < classSlots.length; i++) {
                const subject = subjectPool[i];
                if (!subject) continue;

                const mapping = this.teacherMappings.find(m => m.subject_id === subject.id);
                if (!mapping) continue;

                schedule.push({
                    subject_id: subject.id,
                    teacher_id: mapping.id,
                    classroom_id: classroom.id,
                    day_of_week: classSlots[i].day,
                    start_time: classSlots[i].timeslot.start,
                    end_time: classSlots[i].timeslot.end
                });
            }
        }
        return schedule;
    }

    /**
     * @param {any[]} schedule
     */
    calculateFitness(schedule) {
        let conflicts = 0;
        // Optimization: Use a map to track teacher/classroom usage per day/timeslot
        const teacherUsage = new Map();
        const classroomUsage = new Map();

        // Map to track how many times a subject is taught in a class per day
        const dailySubjectCount = new Map();

        for (const entry of schedule) {
            const key = `${entry.day_of_week}-${entry.start_time}`;

            // Teacher conflict: One teacher in two places at once
            const tKey = `${key}-${entry.teacher_id}`;
            if (teacherUsage.has(tKey)) {
                conflicts += 100; // Strong penalty for double-booking a teacher
            }
            teacherUsage.set(tKey, true);

            // Classroom conflict: Two classes in the same room (Algorithmically unlikely here, but good for safety)
            const cKey = `${key}-${entry.classroom_id}`;
            if (classroomUsage.has(cKey)) {
                conflicts += 10;
            }
            classroomUsage.set(cKey, true);

            // New Constraint: Max 2 periods of the same subject in a day for a single class
            const classDaySubjKey = `${entry.classroom_id}-${entry.day_of_week}-${entry.subject_id}`;
            const count = dailySubjectCount.get(classDaySubjKey) || 0;
            dailySubjectCount.set(classDaySubjKey, count + 1);
            if (count + 1 > 2) {
                conflicts += 10; // Penalize if more than 2
            }
        }

        return conflicts;
    }

    async run() {
        let population = Array.from({ length: this.populationSize }, () => this.generateRandomChromosome());

        for (let generation = 0; generation < this.generations; generation++) {
            population.sort((a, b) => this.calculateFitness(a) - this.calculateFitness(b));

            const bestFitness = this.calculateFitness(population[0]);
            if (bestFitness === 0) {
                return population[0];
            }

            // Elitism: Keep top 50%
            const nextGeneration = population.slice(0, this.populationSize / 2);

            // Fill remaining with mutations of the best
            while (nextGeneration.length < this.populationSize) {
                const parent = nextGeneration[Math.floor(Math.random() * nextGeneration.length)];
                const child = JSON.parse(JSON.stringify(parent));

                // Mutate: Swap two random slots within the same classroom to resolve teacher conflicts
                const mutateIndex1 = Math.floor(Math.random() * child.length);
                const mutateIndex2 = Math.floor(Math.random() * child.length);

                // Only swap within the same classroom to preserve the "even distribution" rule per class
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
