from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple
import math
import random


# ----------------------------
# Data Models
# ----------------------------

@dataclass(frozen=True)
class Subject:
    subject_name: str
    theory_hours_per_week: int
    lab_hours_per_week: int  # 0 if no lab
    teacher_assigned: str


@dataclass
class Teacher:
    teacher_name: str
    subjects_they_can_teach: Set[str]
    availability: Optional[Set[Tuple[int, int]]] = None  # (day, period)

    def is_available(self, day: int, period: int) -> bool:
        if self.availability is None:
            return True
        return (day, period) in self.availability


@dataclass(frozen=True)
class Room:
    room_id: str
    room_type: str  # "classroom" or "lab"


@dataclass(frozen=True)
class Session:
    section: str
    subject_name: str
    teacher_name: str
    length: int            # 1 theory, 2 lab
    session_type: str      # "Theory" or "Lab"
    required_room_type: str


@dataclass
class ScheduledSlot:
    day: int
    start_period: int
    length: int
    section: str
    subject_name: str
    teacher_name: str
    room_id: str
    session_type: str

    def periods(self) -> List[int]:
        return list(range(self.start_period, self.start_period + self.length))


# ----------------------------
# Scheduler Engine
# ----------------------------

class TimetableScheduler:
    def __init__(
        self,
        subjects_by_section: Dict[str, List[Subject]],
        teachers: Dict[str, Teacher],
        rooms: List[Room],
        days_per_week: int = 5,
        periods_per_day: int = 8,
    ) -> None:
        self.subjects_by_section = subjects_by_section
        self.teachers = teachers
        self.rooms = rooms
        self.days_per_week = days_per_week
        self.periods_per_day = periods_per_day

        self.rooms_by_type = {
            "classroom": [r for r in rooms if r.room_type == "classroom"],
            "lab": [r for r in rooms if r.room_type == "lab"],
        }

        self.section_occupied: Dict[Tuple[str, int, int], bool] = {}
        self.teacher_occupied: Dict[Tuple[str, int, int], bool] = {}
        self.room_occupied: Dict[Tuple[str, int, int], bool] = {}
        self.section_subject_day_count: Dict[Tuple[str, str, int], int] = {}

        self.schedule: List[ScheduledSlot] = []
        self.rejected_slots: List[Dict[str, object]] = []
        self._rejected_slot_keys: Set[Tuple[str, str, int, int, str]] = set()

    # -------------------------
    # Public API
    # -------------------------

    def generate_timetable(self) -> List[ScheduledSlot]:
        self.rejected_slots = []
        self._rejected_slot_keys = set()
        sessions = self._build_sessions()
        # Step 1: labs first, then theory
        sessions.sort(key=lambda s: (0 if s.session_type == "Lab" else 1, s.section, s.subject_name))
        if not self._backtrack_schedule(sessions, 0):
            raise RuntimeError("Unable to generate a valid timetable with given constraints.")
        return self.schedule

    def optimize_with_ai(self, iterations: int = 1200, temperature: float = 10.0) -> None:
        """
        Simulated annealing to improve balance and reduce soft penalties.
        """
        if not self.schedule:
            return

        current = list(self.schedule)
        current_cost = self._cost(current)
        best = list(current)
        best_cost = current_cost

        for step in range(iterations):
            temp = temperature * (1 - step / iterations)
            if temp <= 0:
                break

            candidate = self._neighbor_swap(current)
            if candidate is None:
                continue

            cand_cost = self._cost(candidate)
            delta = cand_cost - current_cost

            if delta < 0 or random.random() < math.exp(-delta / temp):
                current = candidate
                current_cost = cand_cost
                if cand_cost < best_cost:
                    best = candidate
                    best_cost = cand_cost

        self.schedule = best

    def classroom_utilization_report(self) -> Dict[str, float]:
        total_slots = self.days_per_week * self.periods_per_day
        usage: Dict[str, int] = {r.room_id: 0 for r in self.rooms}
        for slot in self.schedule:
            usage[slot.room_id] += slot.length
        return {room_id: round((count / total_slots) * 100, 2) for room_id, count in usage.items()}

    def teacher_workload_analysis(self) -> Dict[str, int]:
        workload: Dict[str, int] = {t: 0 for t in self.teachers}
        for slot in self.schedule:
            workload[slot.teacher_name] += slot.length
        return workload

    def to_rows(self, day_names: List[str]) -> List[Dict[str, str]]:
        rows: List[Dict[str, str]] = []
        for slot in sorted(self.schedule, key=lambda s: (s.day, s.start_period, s.section)):
            period = f"{slot.start_period + 1}" if slot.length == 1 else f"{slot.start_period + 1}-{slot.start_period + 2}"
            rows.append({
                "Day": day_names[slot.day],
                "Period": period,
                "Section": slot.section,
                "Subject": slot.subject_name,
                "Teacher": slot.teacher_name,
                "Room": slot.room_id,
                "Type": slot.session_type
            })
        return rows

    def to_grid(self) -> Dict[str, List[List[str]]]:
        grids: Dict[str, List[List[str]]] = {}
        for section in self.subjects_by_section.keys():
            grids[section] = [["" for _ in range(self.periods_per_day)] for _ in range(self.days_per_week)]
        for slot in self.schedule:
            label = f"{slot.subject_name} ({slot.teacher_name}) [{slot.room_id}]"
            for p in slot.periods():
                grids[slot.section][slot.day][p] = label
        return grids

    def get_rejected_slots(self, day_names: List[str]) -> List[Dict[str, object]]:
        rows: List[Dict[str, object]] = []
        for item in self.rejected_slots:
            day_index = int(item["day"])
            rows.append({
                "subject": item["subject"],
                "teacher": item["teacher"],
                "day": day_names[day_index] if 0 <= day_index < len(day_names) else day_index,
                "timeslot": item["timeslot"],
                "reason": item["reason"],
            })
        return rows

    # -------------------------
    # Session Construction
    # -------------------------

    def _build_sessions(self) -> List[Session]:
        sessions: List[Session] = []
        for section, subjects in self.subjects_by_section.items():
            for sub in subjects:
                teacher = self.teachers.get(sub.teacher_assigned)
                if not teacher:
                    raise ValueError(f"Teacher {sub.teacher_assigned} not found.")
                if sub.subject_name not in teacher.subjects_they_can_teach:
                    raise ValueError(f"{teacher.teacher_name} cannot teach {sub.subject_name}.")

                if sub.lab_hours_per_week < 0 or sub.lab_hours_per_week % 2 != 0:
                    raise ValueError(f"Lab hours for {sub.subject_name} must be 0 or an even number.")

                for _ in range(sub.lab_hours_per_week // 2):
                    sessions.append(Session(
                        section=section,
                        subject_name=sub.subject_name,
                        teacher_name=sub.teacher_assigned,
                        length=2,
                        session_type="Lab",
                        required_room_type="lab",
                    ))

                for _ in range(max(0, sub.theory_hours_per_week)):
                    sessions.append(Session(
                        section=section,
                        subject_name=sub.subject_name,
                        teacher_name=sub.teacher_assigned,
                        length=1,
                        session_type="Theory",
                        required_room_type="classroom",
                    ))

        return sessions

    # -------------------------
    # Backtracking Scheduler
    # -------------------------

    def _backtrack_schedule(self, sessions: List[Session], index: int) -> bool:
        if index >= len(sessions):
            return True

        session = self._select_next_session(sessions, index)
        if session is None:
            return False

        for placement in self._ordered_feasible_placements(session):
            self._place(session, placement)
            if self._backtrack_schedule(sessions, index + 1):
                return True
            self._remove(session, placement)

        return False

    def _select_next_session(self, sessions: List[Session], start_index: int) -> Optional[Session]:
        best = None
        best_count = None
        for i in range(start_index, len(sessions)):
            s = sessions[i]
            count = len(self._feasible_placements(s))
            if count == 0:
                return None
            if best is None or count < best_count:
                best, best_count = s, count
        if best is not None and sessions[start_index] is not best:
            j = sessions.index(best)
            sessions[start_index], sessions[j] = sessions[j], sessions[start_index]
        return sessions[start_index]

    def _feasible_placements(self, session: Session) -> List[Tuple[int, int, str]]:
        placements = []
        rooms = self.rooms_by_type.get(session.required_room_type, [])
        for day in range(self.days_per_week):
            for start in range(self.periods_per_day - session.length + 1):
                for room in rooms:
                    reason = self._placement_rejection_reason(session, day, start, room.room_id)
                    if reason is None:
                        placements.append((day, start, room.room_id))
                    else:
                        self._record_rejected_slot(session, day, start, reason)
        return placements

    def _ordered_feasible_placements(self, session: Session) -> List[Tuple[int, int, str]]:
        placements = self._feasible_placements(session)

        def score(p: Tuple[int, int, str]) -> int:
            day, _, _ = p
            return self.section_subject_day_count.get((session.section, session.subject_name, day), 0)

        placements.sort(key=score)
        return placements

    def _can_place(self, session: Session, day: int, start: int, room_id: str) -> bool:
        return self._placement_rejection_reason(session, day, start, room_id) is None

    def _placement_rejection_reason(self, session: Session, day: int, start: int, room_id: str) -> Optional[str]:
        teacher = self.teachers[session.teacher_name]
        for p in range(start, start + session.length):
            if p >= self.periods_per_day:
                return "timeslot outside configured day"
            if self.section_occupied.get((session.section, day, p), False):
                return "section conflict"
            if self.teacher_occupied.get((session.teacher_name, day, p), False):
                return "teacher conflict"
            if self.room_occupied.get((room_id, day, p), False):
                return "room conflict"
            if not teacher.is_available(day, p):
                return "teacher unavailable"
        return None

    def _record_rejected_slot(self, session: Session, day: int, start: int, reason: str) -> None:
        key = (session.section, session.subject_name, day, start, reason)
        if key in self._rejected_slot_keys:
            return
        self._rejected_slot_keys.add(key)
        period = f"{start + 1}" if session.length == 1 else f"{start + 1}-{start + session.length}"
        self.rejected_slots.append({
            "subject": session.subject_name,
            "teacher": session.teacher_name,
            "day": day,
            "timeslot": period,
            "reason": reason,
        })

    def _place(self, session: Session, placement: Tuple[int, int, str]) -> None:
        day, start, room_id = placement
        for p in range(start, start + session.length):
            self.section_occupied[(session.section, day, p)] = True
            self.teacher_occupied[(session.teacher_name, day, p)] = True
            self.room_occupied[(room_id, day, p)] = True

        key = (session.section, session.subject_name, day)
        self.section_subject_day_count[key] = self.section_subject_day_count.get(key, 0) + 1

        self.schedule.append(ScheduledSlot(
            day=day,
            start_period=start,
            length=session.length,
            section=session.section,
            subject_name=session.subject_name,
            teacher_name=session.teacher_name,
            room_id=room_id,
            session_type=session.session_type,
        ))

    def _remove(self, session: Session, placement: Tuple[int, int, str]) -> None:
        day, start, room_id = placement
        for p in range(start, start + session.length):
            self.section_occupied.pop((session.section, day, p), None)
            self.teacher_occupied.pop((session.teacher_name, day, p), None)
            self.room_occupied.pop((room_id, day, p), None)

        key = (session.section, session.subject_name, day)
        if key in self.section_subject_day_count:
            self.section_subject_day_count[key] -= 1
            if self.section_subject_day_count[key] <= 0:
                self.section_subject_day_count.pop(key, None)

        for i in range(len(self.schedule) - 1, -1, -1):
            s = self.schedule[i]
            if (s.section == session.section and s.subject_name == session.subject_name
                    and s.teacher_name == session.teacher_name and s.day == day and s.start_period == start):
                self.schedule.pop(i)
                break

    # -------------------------
    # AI Cost Functions
    # -------------------------

    def _cost(self, schedule: List[ScheduledSlot]) -> float:
        conflicts = self._count_conflicts(schedule)
        balance_penalty = self._balance_penalty(schedule)
        return conflicts * 1000 + balance_penalty

    def _count_conflicts(self, schedule: List[ScheduledSlot]) -> int:
        teacher_slots = set()
        room_slots = set()
        section_slots = set()
        conflicts = 0
        for slot in schedule:
            for p in slot.periods():
                key_t = (slot.teacher_name, slot.day, p)
                key_r = (slot.room_id, slot.day, p)
                key_s = (slot.section, slot.day, p)
                if key_t in teacher_slots:
                    conflicts += 1
                if key_r in room_slots:
                    conflicts += 1
                if key_s in section_slots:
                    conflicts += 1
                teacher_slots.add(key_t)
                room_slots.add(key_r)
                section_slots.add(key_s)
        return conflicts

    def _balance_penalty(self, schedule: List[ScheduledSlot]) -> float:
        counts: Dict[Tuple[str, str, int], int] = {}
        for slot in schedule:
            counts[(slot.section, slot.subject_name, slot.day)] = counts.get((slot.section, slot.subject_name, slot.day), 0) + 1
        penalty = 0.0
        for _, v in counts.items():
            if v > 1:
                penalty += (v - 1) * 5
        return penalty

    def _neighbor_swap(self, schedule: List[ScheduledSlot]) -> Optional[List[ScheduledSlot]]:
        if len(schedule) < 2:
            return None
        a, b = random.sample(schedule, 2)
        if a.length != b.length:
            return None
        candidate = list(schedule)
        idx_a = candidate.index(a)
        idx_b = candidate.index(b)
        candidate[idx_a] = ScheduledSlot(b.day, b.start_period, a.length, a.section, a.subject_name, a.teacher_name, b.room_id, a.session_type)
        candidate[idx_b] = ScheduledSlot(a.day, a.start_period, b.length, b.section, b.subject_name, b.teacher_name, a.room_id, b.session_type)
        return candidate
