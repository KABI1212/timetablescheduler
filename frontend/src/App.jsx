import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import CommandPalette from './components/CommandPalette';
import { normalizeRole } from './config/navigation';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AiTimetableGenerator = lazy(() => import('./pages/AiTimetableGenerator'));
const TeacherManagement = lazy(() => import('./pages/TeacherManagement'));
const ClassroomManagement = lazy(() => import('./pages/ClassroomManagement'));
const SubjectManagement = lazy(() => import('./pages/SubjectManagement'));
const TimetableView = lazy(() => import('./pages/TimetableView'));
const TeacherAvailability = lazy(() => import('./pages/TeacherAvailability'));
const AbsenceManager = lazy(() => import('./pages/AbsenceManager'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TimetableEditor = lazy(() => import('./pages/TimetableEditor'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const TimetableVersions = lazy(() => import('./pages/TimetableVersions'));
const ConflictReport = lazy(() => import('./pages/ConflictReport'));
const AdminBackup = lazy(() => import('./pages/AdminBackup'));

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
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('chrono_token');
    const user = getStoredUser();
    const role = normalizeRole(user?.role || 'admin');

    if (!token || role !== 'admin') {
        localStorage.removeItem('chrono_token');
        localStorage.removeItem('chrono_user');
        return <Navigate to="/login" replace />;
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
    const role = normalizeRole(user?.role || 'admin');
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
                <Route
                    path="/forgot-password"
                    element={(
                        <Suspense fallback={<div className="min-h-screen bg-shell p-6"><RouteFallback /></div>}>
                            <ForgotPassword />
                        </Suspense>
                    )}
                />
                <Route path="/*" element={
                    <ProtectedRoute>
                        <Layout>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/timetable-ai" element={<AiTimetableGenerator />} />
                                <Route path="/timetable-view" element={<TimetableView />} />
                                <Route path="/timetable-editor" element={<TimetableEditor />} />
                                <Route path="/timetable-versions" element={<TimetableVersions />} />
                                <Route path="/conflict-report" element={<ConflictReport />} />
                                <Route path="/teachers" element={<TeacherManagement />} />
                                <Route path="/classrooms" element={<ClassroomManagement />} />
                                <Route path="/subjects" element={<SubjectManagement />} />
                                <Route path="/availability" element={<TeacherAvailability />} />
                                <Route path="/absences" element={<AbsenceManager />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/admin-backup" element={<AdminBackup />} />
                                <Route path="/profile" element={<Profile />} />
                            </Routes>
                        </Layout>
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App;
