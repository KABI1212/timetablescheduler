# Smart Classroom Timetable Scheduler (Python)

This is a clean, production-quality scheduler that:

- Schedules labs first as continuous 2-period blocks in lab rooms
- Schedules theory classes after lab placement
- Avoids teacher, classroom, and section conflicts
- Balances subject distribution across the week
- Uses simulated annealing optimization
- Generates utilization and workload reports

## Setup

```powershell
cd "D:\Smart Classroom & Timetable Scheduler\python_scheduler"
py -m pip install -r requirements.txt
```

## Run API

```powershell
cd "D:\Smart Classroom & Timetable Scheduler\python_scheduler"
py -m uvicorn app:app --reload
```

## Generate Timetable

Send a `POST` request to:

```text
http://127.0.0.1:8000/generate
```

Example:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/generate" -H "Content-Type: application/json" --data-binary "@sample_data.json"
```

The response includes timetable rows, grid data, classroom utilization, and teacher workload analysis.
