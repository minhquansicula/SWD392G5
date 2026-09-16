import React, { useState } from 'react';
import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  Search,
  Upload,
  Send,
  Plus,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Mail,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Exam, StudentAssignment } from '../../types';
import { Badge } from '../common/Badge';

interface StudentAssignmentPageProps {
  exam: Exam;
  assignments: StudentAssignment[];
  onBack: () => void;
  onLaunchVivaForStudent: (student: StudentAssignment) => void;
  onUpdateAssignments: (updated: StudentAssignment[]) => void;
}

export const StudentAssignmentPage: React.FC<StudentAssignmentPageProps> = ({
  exam,
  assignments,
  onBack,
  onLaunchVivaForStudent,
  onUpdateAssignments,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [noticeSent, setNoticeSent] = useState(false);

  // New student form state
  const [newStudentName, setNewStudentName] = useState('');
  const [newMatricNo, setNewMatricNo] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSlot, setNewSlot] = useState('2026-09-18 11:00 AM');

  const filtered = assignments.filter(
    (a) =>
      a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.matriculationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: StudentAssignment['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="warning" size="sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping mr-1" />
            Live Oral
          </Badge>
        );
      case 'ready':
        return (
          <Badge variant="purple" size="sm">
            <UserCheck className="h-3 w-3 mr-1" /> In Waiting Room
          </Badge>
        );
      case 'absent':
        return (
          <Badge variant="danger" size="sm">
            <AlertCircle className="h-3 w-3 mr-1" /> Absent
          </Badge>
        );
      case 'scheduled':
      default:
        return (
          <Badge variant="default" size="sm">
            <Clock className="h-3 w-3 mr-1" /> Scheduled
          </Badge>
        );
    }
  };

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newMatricNo) return;
    const newEntry: StudentAssignment = {
      id: `assign-${Date.now()}`,
      examId: exam.id,
      studentId: `stu-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: newStudentName,
      matriculationNo: newMatricNo,
      email: newEmail || `${newStudentName.toLowerCase().replace(/\s+/g, '.')}@university.edu`,
      assignedSlot: newSlot,
      status: 'scheduled',
      durationMinutes: 0,
      proctorFlags: 0,
    };
    onUpdateAssignments([...assignments, newEntry]);
    setShowAddModal(false);
    setNewStudentName('');
    setNewMatricNo('');
    setNewEmail('');
  };

  const handleSendInvitations = () => {
    setNoticeSent(true);
    setTimeout(() => setNoticeSent(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {exam.code}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display">
                Candidate Viva Slot Allocation
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {exam.title} • {exam.vivaDurationMin} mins per candidate oral slot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSendInvitations}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Mail className="h-3.5 w-3.5 text-indigo-500" />
            <span>{noticeSent ? 'Invitations Dispatched!' : 'Send Calendar Invites'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Assign Candidate</span>
          </button>
        </div>
      </div>

      {/* Roster & Slot Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Search bar inside container */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, matriculation ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span> assigned candidates
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Candidate</th>
                <th className="px-4 py-3">Matric No.</th>
                <th className="px-4 py-3">Assigned Oral Slot</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score / Result</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filtered.map((assignment) => (
                <tr
                  key={assignment.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {assignment.studentName}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {assignment.email}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-xs font-medium">
                    {assignment.matriculationNo}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      {assignment.assignedSlot}
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    {getStatusBadge(assignment.status)}
                  </td>

                  <td className="px-4 py-3.5 font-mono">
                    {assignment.score !== undefined ? (
                      <span className="font-bold text-slate-900 dark:text-white">
                        {assignment.score}/{exam.totalMarks} pts (
                        {Math.round((assignment.score / exam.totalMarks) * 100)}%)
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Pending Oral</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onLaunchVivaForStudent(assignment)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 transition-colors"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      <span>{assignment.status === 'completed' ? 'Retest / Preview' : 'Start Viva'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Assign Candidate to Viva Schedule
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add student to slot for {exam.code}.
            </p>

            <form onSubmit={handleAddCandidate} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Matriculation / Student ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS2023-9901"
                  value={newMatricNo}
                  onChange={(e) => setNewMatricNo(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  University Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. maya.lin@university.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Viva Time Slot
                </label>
                <input
                  type="text"
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
