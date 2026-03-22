import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AiTimetableGenerator from './pages/AiTimetableGenerator';
import TeacherManagement from './pages/TeacherManagement';
import ClassroomManagement from './pages/ClassroomManagement';
import SubjectManagement from './pages/SubjectManagement';
import TimetableView from './pages/TimetableView';
import TeacherAvailability from './pages/TeacherAvailability';
import AbsenceManager from './pages/AbsenceManager';
import Analytics from './pages/Analytics';
import StudentTimetable from './pages/StudentTimetable';
import TimetableEditor from './pages/TimetableEditor';

import Login from './pages/Login';

const getStoredUser = () => {
    const raw = localStorage.getItem('chrono_user');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const normalizeRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'developer') return 'admin';
    return normalized;
};

const defaultPathForRole = (role) => {
    switch (normalizeRole(role)) {
        case 'teacher':
            return '/availability';
        case 'student':
            return '/student-timetable';
        default:
            return '/';
    }
};

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
const PrivateRoute = ({ children }) => {
    return localStorage.getItem('chrono_token') ? children : <Navigate to="/login" />;
};

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} props.roles
 */
const RoleRoute = ({ children, roles = [] }) => {
    const user = getStoredUser();
    const role = normalizeRole(user?.role || 'student');
    if (!localStorage.getItem('chrono_token')) return <Navigate to="/login" />;
    if (roles.length > 0 && !roles.map(normalizeRole).includes(role)) {
        return <Navigate to={defaultPathForRole(role)} replace />;
    }
    return children;
};

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
const Layout = ({ children }) => (
    <div className="flex h-screen bg-shell text-white overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute top-20 right-0 w-80 h-80 rounded-full bg-danger/15 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-success/10 blur-3xl" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-56 rounded-full bg-primaryGlow/10 blur-3xl" />
        </div>
        <Sidebar className="z-20" />
        <div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden">
            <Navbar />
            <main className="flex-1 p-6 overflow-y-auto">
                {children}
            </main>
        </div>
    </div>
);

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                    <PrivateRoute>
                        <Layout>
                            <Routes>
                                <Route path="/" element={
                                    <RoleRoute roles={['admin']}>
                                        <Dashboard />
                                    </RoleRoute>
                                } />
                                <Route path="/timetable-ai" element={
                                    <RoleRoute roles={['admin']}>
                                        <AiTimetableGenerator />
                                    </RoleRoute>
                                } />
                                <Route path="/timetable-view" element={
                                    <RoleRoute roles={['admin', 'teacher']}>
                                        <TimetableView />
                                    </RoleRoute>
                                } />
                                <Route path="/timetable-editor" element={
                                    <RoleRoute roles={['admin']}>
                                        <TimetableEditor />
                                    </RoleRoute>
                                } />
                                <Route path="/teachers" element={
                                    <RoleRoute roles={['admin']}>
                                        <TeacherManagement />
                                    </RoleRoute>
                                } />
                                <Route path="/classrooms" element={
                                    <RoleRoute roles={['admin']}>
                                        <ClassroomManagement />
                                    </RoleRoute>
                                } />
                                <Route path="/subjects" element={
                                    <RoleRoute roles={['admin']}>
                                        <SubjectManagement />
                                    </RoleRoute>
                                } />
                                <Route path="/availability" element={
                                    <RoleRoute roles={['admin', 'teacher']}>
                                        <TeacherAvailability />
                                    </RoleRoute>
                                } />
                                <Route path="/absences" element={
                                    <RoleRoute roles={['admin']}>
                                        <AbsenceManager />
                                    </RoleRoute>
                                } />
                                <Route path="/analytics" element={
                                    <RoleRoute roles={['admin']}>
                                        <Analytics />
                                    </RoleRoute>
                                } />
                                <Route path="/student-timetable" element={
                                    <RoleRoute roles={['student']}>
                                        <StudentTimetable />
                                    </RoleRoute>
                                } />

                            </Routes>
                        </Layout>
                    </PrivateRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App;
