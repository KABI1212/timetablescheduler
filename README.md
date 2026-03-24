# ChronoCampus - Smart Classroom & Autonomous Timetable Scheduler

## System Architecture Explanation
ChronoCampus is built on a modern, highly scalable 3-Tier Architecture designed to process constraint satisfaction problems effectively:

1. **Frontend Layer (React + Vite + TailwindCSS)**
   - Acts as the presentation layer. It communicates with the backend via REST APIs.
   - Features a custom Quantum Blue CSS design system using glassmorphism effects and Framer Motion for structural animations.
   
2. **Backend API Layer (Node.js + Express.js)**
   - Handles the core business logic, routing, and Role-Based Access Control using JWT.
   - All REST API endpoints (`/api/auth`, `/api/timetable`, etc.) reside here.

3. **Database Layer (PostgreSQL)**
   - Normalized relational schema ensuring ACID compliance.
   - Indexed efficiently for fast lookup during schedule constraints checking.

4. **AI Scheduling Engine (Genetic Algorithm)**
   - Lives as a dedicated service within the Node.js backend.
   - Uses a Genetic Algorithm population-based heuristic to resolve NP-Hard timetabling scenarios.
   - Flow: **Initialize Random Population -> Evaluate Fitness (Hard/Soft constraints) -> Crossover -> Mutate -> Return Optimal Schedule**.

## ER Diagram Explanation
The PostgreSQL schema enforces strict referential integrity:
- **`users`** (Authentication & RBAC). Includes Admins, Teachers, Students.
- **`departments`** (Academic branches).
- **`subjects`** and **`classrooms`**.
- **`teachers`** (Linked 1-to-1 with users).
- **`teacher_subjects`** (Many-to-Many resolution table mapping who can teach what).
- **`timetable`** (The core junction mapping a `teacher_id`, `subject_id`, `classroom_id` to a `day_of_week` and `timeslot`).

## Complete Project Folder Structure
- `/backend/`: Node.js, Express, Postgres logic, AI Engine.
  - `/src/config/`: DB connections.
  - `/src/controllers/`: API route implementations.
  - `/src/middleware/`: JWT verification.
  - `/src/models/`: SQL schema.
  - `/src/routes/`: Express routers.
  - `/src/services/`: the Genetic Algorithm `aiScheduling.service.js`.
- `/frontend/`: React Vite SPA.
  - `/src/components/`: Reusable UI elements (`Sidebar.jsx`, `Navbar.jsx`).
  - `/src/pages/`: Views (`Dashboard.jsx`, `AiTimetableGenerator.jsx`, etc.).
  - `tailwind.config.js`: Quantum Blue UI theming.

## Instructions to Run the Project Locally

1. **Database Setup**
   - Ensure PostgreSQL is running.
   - Create a database called `risingai`.
   - Update `backend/.env` with your Postgres credentials.

2. **Backend Setup**
   - Navigate to `/backend`.
   - Run `npm install` to install dependencies (express, pg, bcrypt, jsonwebtoken, etc.).
   - Run `npm run dev` to start the Node.js server. The `schema.sql` will auto-run to initialize tables.

3. **Frontend Setup**
   - Navigate to `/frontend`.
   - Run `npm install` to install React, Tailwind, and Framer Motion dependencies.
   - Run `npm run dev` to start the Vite UI server.
   - Open your browser to the URL provided by Vite (usually `http://localhost:5173`).
   - Enjoy the Quantum Blue control center!
