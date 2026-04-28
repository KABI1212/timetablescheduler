# ChronoCampus - Smart Classroom Timetable Scheduler

ChronoCampus is a full-stack timetable management app for classrooms, teachers, students, substitutions, and AI-assisted schedule generation.

## Stack

- Frontend: React, Vite, TailwindCSS, Framer Motion
- Backend: Node.js, Express.js, JWT role-based access control
- Database: `backend/database.json`
- Node AI engine: Genetic algorithm in `backend/src/services/aiScheduling.service.js`
- Python scheduler: FastAPI + simulated annealing in `python_scheduler/`

## Database

This project currently uses a portable JSON database file:

```text
backend/database.json
```

It does not require PostgreSQL for the current implementation. The SQL-like calls in `backend/src/config/db.js` are handled by a JSON-backed adapter.

To reseed the JSON database:

```powershell
cd "D:\Smart Classroom & Timetable Scheduler\backend"
node setup.js
```

The seed script creates a default admin account:

```text
Email: admin@chronocampus.local
Password: value of SEED_ADMIN_PASSWORD, or Admin@12345 by default
```

## Environment Setup

Create `backend/.env` from the example file:

```powershell
cd "D:\Smart Classroom & Timetable Scheduler\backend"
copy ".env.example" ".env"
```

Then edit `backend/.env`:

```env
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
SEED_ADMIN_PASSWORD=Admin@12345
```

## Run On Windows

Use quotes because the project path contains spaces and `&`.

Backend:

```powershell
cd "D:\Smart Classroom & Timetable Scheduler\backend"
npm install
npm.cmd run dev
```

Frontend:

```powershell
cd "D:\Smart Classroom & Timetable Scheduler\frontend"
npm install
npm.cmd run dev
```

The Vite app usually runs at:

```text
http://localhost:5173
```

## Python Scheduler

Install dependencies:

```powershell
cd "D:\Smart Classroom & Timetable Scheduler\python_scheduler"
py -m pip install -r requirements.txt
```

Run the FastAPI scheduler:

```powershell
cd "D:\Smart Classroom & Timetable Scheduler\python_scheduler"
py -m uvicorn app:app --reload
```

Generate a timetable from the sample payload:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/generate" -H "Content-Type: application/json" --data-binary "@sample_data.json"
```

## Main Folders

- `backend/src/controllers/`: Express route logic
- `backend/src/routes/`: API routes
- `backend/src/services/`: scheduling and substitution services
- `frontend/src/components/`: shared UI components
- `frontend/src/pages/`: app screens
- `python_scheduler/`: optional FastAPI scheduler service
