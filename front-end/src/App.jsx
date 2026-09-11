import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ui';
import { Role } from './types';
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
function App() {
    return (<Routes>
      {/* Root redirect based on role is handled by ProtectedRoute below, but we'll default to exams */}
      <Route path="/" element={<Navigate to="/exams" replace/>}/>

      <Route element={<Layout />}>
        {/* LECTURER ROUTES */}
        <Route path="/exams" element={<ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
              <ExamList />
            </ProtectedRoute>}/>
        <Route path="/exams/new" element={<ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
              <ExamCreate />
            </ProtectedRoute>}/>
        <Route path="/exams/:id" element={<ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
              <ExamDetail />
            </ProtectedRoute>}/>
        <Route path="/exams/:examId/grading" element={<ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
              <GradingQueue />
            </ProtectedRoute>}/>
        <Route path="/exams/:examId/grading/:scheduleId" element={<ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
              <GradingReview />
            </ProtectedRoute>}/>
        <Route path="/analytics/:examId" element={<ProtectedRoute roles={[Role.LECTURER, Role.ADMIN]}>
              <Analytics />
            </ProtectedRoute>}/>

        {/* STUDENT ROUTES */}
        <Route path="/my-schedules" element={<ProtectedRoute roles={[Role.STUDENT]}>
              <MySchedules />
            </ProtectedRoute>}/>
        <Route path="/results/:scheduleId" element={<ProtectedRoute roles={[Role.STUDENT, Role.LECTURER]}>
              <StudentResults />
            </ProtectedRoute>}/>
      </Route>

      {/* FULL SCREEN ROUTES (No Layout) */}
      <Route path="/viva/:scheduleId" element={<ProtectedRoute roles={[Role.STUDENT]}>
            <VivaRoom />
          </ProtectedRoute>}/>
    </Routes>);
}
export default App;
