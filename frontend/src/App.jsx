import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import CommandPalette from './components/CommandPalette';
import { defaultPathForRole, normalizeRole } from './config/navigation';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AiTimetableGenerator = lazy(() => import('./pages/AiTimetableGenerator'));
const TeacherManagement = lazy(() => import('./pages/TeacherManagement'));
const ClassroomManagement = lazy(() => import('./pages/ClassroomManagement'));
const SubjectManagement = lazy(() => import('./pages/SubjectManagement'));
const TimetableView = lazy(() => import('./pages/TimetableView'));
const TeacherAvailability = lazy(() => import('./pages/TeacherAvailability'));
const AbsenceManager = lazy(() => import('./pages/AbsenceManager'));
const Analytics = lazy(() => import('./pages/Analytics'));
const StudentTimetable = lazy(() => import('./pages/StudentTimetable'));
const TimetableEditor = lazy(() => import('./pages/TimetableEditor'));
const Login = lazy(() => import('./pages/Login'));

const getStoredUser = () => {
    const raw = localStorage.getItem('chrono_user');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
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

const RouteFallback = () => (
    <div className="space-y-4">
        <div className="h-16 skeleton" />
        <div className="h-40 skeleton" />
        <div className="h-64 skeleton" />
    </div>
);

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
const Layout = ({ children }) => {
    const location = useLocation();
    const user = getStoredUser();
    const role = normalizeRole(user?.role || 'student');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setCommandPaletteOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="relative min-h-screen bg-shell text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(98,230,215,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(255,180,77,0.18),transparent_26%)]" />
            <div className="relative lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-5 lg:px-4 lg:pb-4">
                <Sidebar
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]"
                />
                <div className="min-w-0">
                    <Navbar
                        className="lg:mt-4"
                        onOpenSidebar={() => setSidebarOpen(true)}
                        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                    />
                    <main className="px-4 pb-6 pt-4 md:px-6 lg:px-2">
                        <Suspense fallback={<RouteFallback />}>
                            {children}
                        </Suspense>
                    </main>
                </div>
            </div>
            <CommandPalette
                open={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                role={role}
            />
        </div>
    );
};

function App() {
    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={(
                        <Suspense fallback={<div className="min-h-screen bg-shell p-6"><RouteFallback /></div>}>
                            <Login />
                        </Suspense>
                    )}
                />
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
