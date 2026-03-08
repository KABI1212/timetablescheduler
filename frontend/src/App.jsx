import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AiTimetableGenerator from './pages/AiTimetableGenerator';
import TeacherManagement from './pages/TeacherManagement';
import ClassroomManagement from './pages/ClassroomManagement';
import SubjectManagement from './pages/SubjectManagement';
import Login from './pages/Login';

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
 */
const Layout = ({ children }) => (
    <div className="flex h-screen bg-cyberBlack text-white overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none z-0 before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTM5IDM5VjFIMXYzOGgzOHoiIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+')] before:opacity-20 before:animate-[spin_400s_linear_infinite]" />
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
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/timetable-ai" element={<AiTimetableGenerator />} />
                                <Route path="/teachers" element={<TeacherManagement />} />
                                <Route path="/classrooms" element={<ClassroomManagement />} />
                                <Route path="/subjects" element={<SubjectManagement />} />
                            </Routes>
                        </Layout>
                    </PrivateRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App;
