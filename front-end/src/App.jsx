// ============================================================
// AIVES — Application Router Configuration
// ============================================================
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ui';
import { Role } from './types';
import { useAuthStore } from './store/authStore';

// Pages
import ExamList from './pages/ExamList';
import ExamCreate from './pages/ExamCreate';
import ExamDetail from './pages/ExamDetail';
import MySchedules from './pages/MySchedules';
import VivaRoom from './pages/VivaRoom';
import GradingQueue from './pages/GradingQueue';
import GradingReview from './pages/GradingReview';
import StudentResults from './pages/StudentResults';
import Analytics from './pages/Analytics';
import NotFound from './pages/NotFound';

// Smart root redirect according to user role
function RootRedirect() {
    const { currentUser } = useAuthStore();
    if (currentUser?.role === Role.STUDENT) {
        return <Navigate to="/my-schedules" replace />;
    }
    return <Navigate to="/exams" replace />;
}

function App() {
    return (
        <Routes>
            {/* Dynamic root route based on identity */}
            <Route path="/" element={<RootRedirect />} />

            <Route element={<Layout />}>
                {/* LECTURER & ADMIN ROUTES */}
                <Route 
                    path="/exams" 
                    element={
                        <ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
                            <ExamList />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/exams/new" 
                    element={
                        <ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
                            <ExamCreate />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/exams/:id" 
                    element={
                        <ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
                            <ExamDetail />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/exams/:examId/grading" 
                    element={
                        <ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
                            <GradingQueue />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/exams/:examId/grading/:scheduleId" 
                    element={
                        <ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
                            <GradingReview />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/analytics/:examId" 
                    element={
                        <ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
                            <Analytics />
                        </ProtectedRoute>
                    } 
                />

                {/* STUDENT ROUTES */}
                <Route 
                    path="/my-schedules" 
                    element={
                        <ProtectedRoute roles={[Role.STUDENT]}>
                            <MySchedules />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/results/:scheduleId" 
                    element={
                        <ProtectedRoute roles={[Role.STUDENT, Role.LECTURER, Role.ADMIN]}>
                            <StudentResults />
                        </ProtectedRoute>
                    } 
                />

                {/* 404 CATCH-ALL ROUTE (Within Layout) */}
                <Route path="*" element={<NotFound />} />
            </Route>

            {/* FULL SCREEN INTERVIEW ROOM (No Layout) */}
            <Route 
                path="/viva/:scheduleId" 
                element={
                    <ProtectedRoute roles={[Role.STUDENT]}>
                        <VivaRoom />
                    </ProtectedRoute>
                } 
            />
        </Routes>
    );
}

export default App;
