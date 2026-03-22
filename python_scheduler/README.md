# Smart Classroom Timetable Scheduler (Python)

This is a clean, production‑quality scheduler that:
- Schedules labs first (continuous 2 periods, lab rooms only)
- Schedules theory after labs
- Avoids teacher/classroom/section conflicts
- Balances subject distribution across the week
- Includes AI optimization (simulated annealing)
- Generates utilization and workload reports

## Setup

```bash
pip install fastapi uvicorn
```

## Run API

```bash
cd python_scheduler
uvicorn app:app --reload
```

## Generate Timetable

Send a POST request to:
```
http://127.0.0.1:8000/generate
```

with JSON payload from [sample_data.json](sample_data.json).

Example (curl):
```bash
curl -X POST http://127.0.0.1:8000/generate \
  -H "Content-Type: application/json" \
  -d @sample_data.json
```

The response includes:
- Timetable rows in the requested format
- Grid structure for visualization
- Classroom utilization report
- Teacher workload analysis

## Optional Excel Export

Install:
```bash
pip install openpyxl
```

Then use `scheduler.export_excel(...)` if needed.
