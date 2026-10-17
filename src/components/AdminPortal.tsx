/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  UserX, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  RefreshCw, 
  Calendar, 
  FileText, 
  Send, 
  PlusCircle, 
  TrendingDown, 
  ShieldAlert, 
  Clock, 
  UserCheck, 
  BookOpen, 
  AlertCircle,
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles,
  Edit,
  Mail,
  Sliders,
  Check
} from 'lucide-react';
import { Student, Teacher, LessonPlan, Mark, Attendance, BehaviourLog, GeneratedLesson, Message, SchoolStats, SchoolRules } from '../types';

interface AdminPortalProps {
  state: {
    students: Student[];
    teachers: Teacher[];
    lessonPlans: LessonPlan[];
    marks: Mark[];
    attendanceLogs: Attendance[];
    behaviourLogs: BehaviourLog[];
    generatedLessons: GeneratedLesson[];
    messages: Message[];
    schoolRules: SchoolRules;
    stats: SchoolStats;
  };
  onToggleTeacher: (id: string, status: 'Active' | 'Absent') => Promise<void>;
  onGenerateLesson: (teacherId: string, planId: string) => Promise<void>;
  onGenerateWarning: (studentId: string) => Promise<GeneratedMessageOutput | null>;
  onSaveMessage: (studentId: string, title: string, body: string, status: 'Draft' | 'Sent') => Promise<void>;
  onAddMark: (studentId: string, subject: string, testName: string, markValue: number, maxMark: number) => Promise<void>;
  onAddAttendance: (studentId: string, status: 'Present' | 'Absent', reason?: string) => Promise<void>;
  onAddBehaviour: (studentId: string, category: 'Positive' | 'Concern', description: string, points: number) => Promise<void>;
  onResetState: () => Promise<void>;
}

interface GeneratedMessageOutput {
  title: string;
  body: string;
}

export default function AdminPortal({
  state,
  onToggleTeacher,
  onGenerateLesson,
  onGenerateWarning,
  onSaveMessage,
  onAddMark,
  onAddAttendance,
  onAddBehaviour,
  onResetState
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'continuity' | 'warning' | 'capture' | 'rules'>('continuity');
  
  // States for Continuity trigger
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState(false);

  // States for Early Warning
  const [selectedStudentForWarning, setSelectedStudentForWarning] = useState<Student | null>(null);
  const [isGeneratingWarning, setIsGeneratingWarning] = useState(false);
  const [warningDraftTitle, setWarningDraftTitle] = useState('');
  const [warningDraftBody, setWarningDraftBody] = useState('');
  const [warningSendSuccess, setWarningSendSuccess] = useState(false);

  // States for Logging Capture
  const [logStudentId, setLogStudentId] = useState<string>('');
  const [logType, setLogType] = useState<'mark' | 'attendance' | 'behaviour'>('mark');
  
  const [markSubject, setMarkSubject] = useState('Mathematics');
  const [markName, setMarkName] = useState('Standard Classroom Test');
  const [markValue, setMarkValue] = useState(50);
  const [markMax, setMarkMax] = useState(100);

  const [attStatus, setAttStatus] = useState<'Present' | 'Absent'>('Present');
  const [attReason, setAttReason] = useState('');

  const [behCategory, setBehCategory] = useState<'Positive' | 'Concern'>('Positive');
  const [behDesc, setBehDesc] = useState('');
  const [behPoints, setBehPoints] = useState(10);

  const [recordLogSuccess, setRecordLogSuccess] = useState(false);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleTeacherToggle = async (teacherId: string, currentStatus: 'Active' | 'Absent') => {
    const nextStatus = currentStatus === 'Active' ? 'Absent' : 'Active';
    await onToggleTeacher(teacherId, nextStatus);
  };

  const triggerLessonGeneration = async () => {
    if (!selectedTeacherId || !selectedPlanId) return;
    setIsGeneratingLesson(true);
    setGeneratedSuccess(false);
    try {
      await onGenerateLesson(selectedTeacherId, selectedPlanId);
      setGeneratedSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  const triggerWarningGeneration = async (student: Student) => {
    setSelectedStudentForWarning(student);
    setIsGeneratingWarning(true);
    setWarningSendSuccess(false);
    try {
      const res = await onGenerateWarning(student.id);
      if (res) {
        setWarningDraftTitle(res.title);
        setWarningDraftBody(res.body);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingWarning(false);
    }
  };

  const handleSendWarning = async () => {
    if (!selectedStudentForWarning) return;
    try {
      await onSaveMessage(
        selectedStudentForWarning.id,
        warningDraftTitle,
        warningDraftBody,
        'Sent'
      );
      setWarningSendSuccess(true);
      setTimeout(() => {
        setSelectedStudentForWarning(null);
        setWarningSendSuccess(false);
      }, 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);

    if (!logStudentId) {
      setFormValidationError('Please select a learner from the student registry.');
      return;
    }

    try {
      if (logType === 'mark') {
        if (!markSubject.trim()) {
          setFormValidationError('Subject selection is required.');
          return;
        }
        if (!markName.trim()) {
          setFormValidationError('Assessment test name is required.');
          return;
        }
        if (isNaN(markMax) || markMax <= 0 || markMax > 100) {
          setFormValidationError('Max potential score must be between 1 and 100.');
          return;
        }
        if (isNaN(markValue) || markValue < 0 || markValue > markMax) {
          setFormValidationError(`Learner score must be between 0 and the max score of ${markMax} (within 0-100%).`);
          return;
        }
        await onAddMark(logStudentId, markSubject, markName, markValue, markMax);
      } else if (logType === 'attendance') {
        if (attStatus !== 'Present' && attStatus !== 'Absent') {
          setFormValidationError("Attendance status must be 'Present' or 'Absent'.");
          return;
        }
        if (attReason.length > 200) {
          setFormValidationError('Absence explanation must not exceed 200 characters.');
          return;
        }
        await onAddAttendance(logStudentId, attStatus, attReason);
      } else {
        if (!behDesc.trim()) {
          setFormValidationError('Behavior/incident description is required.');
          return;
        }
        if (isNaN(behPoints) || behPoints < 1 || behPoints > 100) {
          setFormValidationError('Modifier points must be between 1 and 100.');
          return;
        }
        // points negative if concern, positive if positive
        const finalPoints = behCategory === 'Concern' ? -Math.abs(behPoints) : Math.abs(behPoints);
        await onAddBehaviour(logStudentId, behCategory, behDesc, finalPoints);
      }

      setRecordLogSuccess(true);
      setFormValidationError(null);
      setTimeout(() => setRecordLogSuccess(false), 3000);
      
      // clear fields
      setBehDesc('');
      setAttReason('');
    } catch (err: any) {
      console.error(err);
      setFormValidationError(err.message || 'Failed to submit diagnostic log.');
    }
  };

  const resetAllState = async () => {
    setIsResetting(true);
    try {
      await onResetState();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="admin-portal-root">
      {/* Top Welcome / Quick Stats */}
      <div className="bg-[#0c0e14] text-slate-300 rounded-sm p-6 border border-white/10 relative overflow-hidden" id="admin-header">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-sky-500/5 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-mono text-[11px] tracking-widest uppercase opacity-90">
              <Sparkles className="w-4 h-4 text-sky-400" /> EdTech Track — AI for Impact
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif italic text-white tracking-tight mt-1">Phakamani Secondary School</h1>
            <p className="text-slate-400 text-xs mt-1.5 font-sans">Gauteng, South Africa | School Administration Portal</p>
          </div>
          <button 
            onClick={resetAllState}
            disabled={isResetting}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 transition text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-sm border border-white/5 disabled:opacity-50"
            id="btn-reset-state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Resetting State...' : 'Reset Demo Seeds'}
          </button>
        </div>

        {/* Diagnostic KPI Ribbons */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-6 border-t border-white/5" id="school-kpi-ribbon">
          <div className="bg-[#050608]/50 p-3.5 rounded-sm border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Users className="w-4 h-4 text-sky-400" /> Total Learners
            </div>
            <div className="text-2xl font-mono font-bold mt-1 text-white">{state.stats.totalStudents}</div>
          </div>
          <div className="bg-[#050608]/50 p-3.5 rounded-sm border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <BookOpen className="w-4 h-4 text-emerald-400" /> Subject Educators
            </div>
            <div className="text-2xl font-mono font-bold mt-1 text-white">{state.stats.totalTeachers}</div>
          </div>
          <div className="bg-[#050608]/50 p-3.5 rounded-sm border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <UserX className="w-4 h-4 text-red-400" /> Educators Absent
            </div>
            <div className="text-2xl font-mono font-bold mt-1 text-red-400">{state.stats.absentTeachersCount}</div>
          </div>
          <div className="bg-[#050608]/50 p-3.5 rounded-sm border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Learners At Risk
            </div>
            <div className="text-2xl font-mono font-bold mt-1 text-amber-500">{state.stats.atRiskStudentsCount}</div>
          </div>
          <div className="bg-[#050608]/50 p-3.5 rounded-sm border border-white/5 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <UserCheck className="w-4 h-4 text-sky-400" /> School Attendance
            </div>
            <div className="text-2xl font-mono font-bold mt-1 text-emerald-400">{state.stats.averageAttendance}%</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border border-white/5 bg-[#080a0f] p-1 rounded-sm" id="admin-tabs">
        <button
          onClick={() => { setActiveTab('continuity'); setGeneratedSuccess(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-sm text-xs font-bold uppercase tracking-wider transition ${
            activeTab === 'continuity' 
              ? 'bg-sky-500 text-black shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-continuity"
        >
          <Clock className="w-4 h-4" />
          Continuity Mode <span className="hidden sm:inline">(Substitute AI)</span>
        </button>
        <button
          onClick={() => setActiveTab('warning')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-sm text-xs font-bold uppercase tracking-wider transition ${
            activeTab === 'warning' 
              ? 'bg-sky-500 text-black shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-warning"
        >
          <AlertCircle className="w-4 h-4" />
          Early-Warning <span className="hidden sm:inline">(Diagnostic AI)</span>
        </button>
        <button
          onClick={() => setActiveTab('capture')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-sm text-xs font-bold uppercase tracking-wider transition ${
            activeTab === 'capture' 
              ? 'bg-sky-500 text-black shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-capture"
        >
          <PlusCircle className="w-4 h-4" />
          Marks & Logs Capture
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-sm text-xs font-bold uppercase tracking-wider transition ${
            activeTab === 'rules' 
              ? 'bg-sky-500 text-black shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          id="tab-rules"
        >
          <FileText className="w-4 h-4" />
          School Manuals
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'continuity' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="panel-continuity">
          {/* Left Column: Teachers List */}
          <div className="lg:col-span-5 bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl">
            <h2 className="text-lg font-serif italic text-white mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" /> Faculty Attendance Status
            </h2>
            <p className="text-slate-400 text-xs mb-4">Toggle an educator's status as 'Absent' to trigger our CAPS AI Continuity lesson compiler.</p>
            
            <div className="space-y-3">
              {state.teachers.map((teacher) => (
                <div 
                  key={teacher.id} 
                  className={`p-4 rounded-sm border transition flex items-center justify-between ${
                    teacher.status === 'Absent' 
                      ? 'border-red-900/40 bg-red-950/10' 
                      : 'border-white/5 bg-[#050608] hover:border-white/10'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm">{teacher.name}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">{teacher.subject} • {teacher.grade}</div>
                    {teacher.status === 'Absent' && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-red-500/10 border border-red-500/25 text-red-400 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm mt-2">
                        <AlertTriangle className="w-2.5 h-2.5" /> Absent since {teacher.absentSince || 'today'}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleTeacherToggle(teacher.id, teacher.status)}
                    className={`text-[10px] uppercase font-bold tracking-wider px-3 py-2 rounded-sm transition ${
                      teacher.status === 'Absent'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {teacher.status === 'Absent' ? 'Mark Present' : 'Mark Absent'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: AI Generation Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl">
              <h2 className="text-lg font-serif italic text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" /> AI Continuity Lesson Builder
              </h2>
              <p className="text-slate-400 text-xs mb-6">Select an absent educator and their scheduled CAPS topic to draft an fully interactive substitute lesson plan immediately published to the Student Portal.</p>

              <div className="space-y-4">
                {/* Select Teacher */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">1. Absent Educator</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => {
                      setSelectedTeacherId(e.target.value);
                      const t = state.teachers.find(teacher => teacher.id === e.target.value);
                      // Auto select a logical lesson plan matching teacher's subject if available
                      if (t) {
                        const matchingPlan = state.lessonPlans.find(p => p.subject.toLowerCase().includes(t.subject.toLowerCase()) || t.subject.toLowerCase().includes(p.subject.toLowerCase()));
                        if (matchingPlan) setSelectedPlanId(matchingPlan.id);
                      }
                    }}
                    className="w-full bg-[#050608] border border-white/10 rounded-sm p-3 text-sm focus:ring-1 focus:ring-sky-500 text-slate-200 focus:outline-none"
                  >
                    <option value="" className="bg-[#0c0e14]">-- Choose Absent Teacher --</option>
                    {state.teachers.filter(t => t.status === 'Absent').map(t => (
                      <option key={t.id} value={t.id} className="bg-[#0c0e14]">{t.name} ({t.subject})</option>
                    ))}
                  </select>
                </div>

                {/* Select Lesson Plan */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">2. Curriculum Syllabus Topic (CAPS aligned)</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full bg-[#050608] border border-white/10 rounded-sm p-3 text-sm focus:ring-1 focus:ring-sky-500 text-slate-200 focus:outline-none"
                  >
                    <option value="" className="bg-[#0c0e14]">-- Choose Lesson Plan Topic --</option>
                    {state.lessonPlans.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0c0e14]">{p.grade} • {p.subject}: {p.topic}</option>
                    ))}
                  </select>
                </div>

                {/* Info summary of the topic selected */}
                {selectedPlanId && (
                  <div className="p-3.5 bg-sky-500/5 rounded-sm border border-sky-500/10 text-xs text-slate-300">
                    <span className="font-bold text-sky-400">Curriculum Note: </span>
                    {state.lessonPlans.find(p => p.id === selectedPlanId)?.standardNotes}
                    <div className="mt-1.5 text-slate-500 font-mono text-[9px] uppercase tracking-wider">
                      Reference: {state.lessonPlans.find(p => p.id === selectedPlanId)?.curriculumReference}
                    </div>
                  </div>
                )}

                {/* Trigger Button */}
                <button
                  onClick={triggerLessonGeneration}
                  disabled={isGeneratingLesson || !selectedTeacherId || !selectedPlanId}
                  className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-30 text-black font-extrabold uppercase tracking-wider text-xs p-3.5 rounded-sm shadow-lg shadow-sky-500/10 transition flex items-center justify-center gap-2 mt-4"
                  id="btn-generate-continuity"
                >
                  {isGeneratingLesson ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analyzing Curriculum & Compiling with Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Compile AI Substitute Lesson Plan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Success Screen / Review Panel */}
            {generatedSuccess && state.generatedLessons.length > 0 && (
              <div className="bg-emerald-950/10 border border-emerald-900/30 rounded-sm p-6 space-y-4 animate-fade-in" id="continuity-success-panel">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-full border border-emerald-500/20">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-serif italic text-white text-lg">Substitute Lesson Live!</h3>
                    <p className="text-emerald-400/80 text-xs mt-0.5">Students can now access this substitute structure on their portals.</p>
                  </div>
                </div>

                {/* Quick breakdown of what was made */}
                <div className="bg-[#050608] p-4 rounded-sm border border-white/5 space-y-3 text-slate-300 text-sm font-sans">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Lesson Title</span>
                    <span className="font-extrabold text-white text-base">{state.generatedLessons[state.generatedLessons.length - 1].title}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">AI Slides Formatted</span>
                    <span className="font-medium text-slate-300">{state.generatedLessons[state.generatedLessons.length - 1].slides.length} fully structured graphic slides with scripts</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Core Teacher Script Preview</span>
                    <p className="text-xs text-slate-400 italic line-clamp-3 font-mono mt-1">"{state.generatedLessons[state.generatedLessons.length - 1].script}"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Published Continuity Lessons List */}
            <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl">
              <h3 className="font-bold text-white text-sm mb-3">Published Continuity Lessons ({state.generatedLessons.length})</h3>
              {state.generatedLessons.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">
                  No lessons compiled today. Mark a teacher absent above and click generate to launch.
                </div>
              ) : (
                <div className="space-y-3">
                  {state.generatedLessons.map((lesson) => {
                    const plan = state.lessonPlans.find(p => p.id === lesson.lessonPlanId);
                    const teacher = state.teachers.find(t => t.id === lesson.teacherId);
                    return (
                      <div key={lesson.id} className="p-3 bg-[#050608] border border-white/5 rounded-sm flex items-center justify-between text-xs">
                        <div>
                          <h4 className="font-bold text-slate-200">{lesson.title}</h4>
                          <div className="text-slate-500 mt-0.5">
                            {plan?.subject} • Substitute for {teacher?.name || 'Educator'} • Generated: {lesson.dateGenerated}
                          </div>
                        </div>
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold px-2.5 py-1 rounded-sm text-[9px] uppercase tracking-wider">
                          Active
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Early-Warning Tab */}
      {activeTab === 'warning' && (
        <div className="space-y-6 animate-fade-in" id="panel-early-warning">
          {/* Main Diagnostic Dashboard Table */}
          <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
              <div>
                <h2 className="text-lg font-serif italic text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Academic & Conduct Risk Diagnostic Matrix
                </h2>
                <p className="text-slate-400 text-xs mt-1.5">Continuous risk assessment running weighted scores: Marks Drop (40%), Attendance Drop (30%), Behaviour Log Concerns (30%).</p>
              </div>
            </div>

            {/* Students Risk Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 text-[10px] font-mono uppercase font-bold tracking-wider">
                    <th className="pb-3 pl-2">Learner Name</th>
                    <th className="pb-3">Grade</th>
                    <th className="pb-3 text-center">Avg Mark</th>
                    <th className="pb-3 text-center">Attendance</th>
                    <th className="pb-3 text-center">Conduct Score</th>
                    <th className="pb-3 text-center">Calculated Risk Index</th>
                    <th className="pb-3 text-right pr-2">Intervention Drafts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {state.students.map((student) => {
                    const isHighRisk = student.riskLevel === 'High';
                    const isMedRisk = student.riskLevel === 'Medium';
                    
                    return (
                      <tr key={student.id} className="hover:bg-white/5 transition">
                        {/* Name & Photo */}
                        <td className="py-3.5 pl-2 flex items-center gap-3">
                          <img 
                            src={student.profilePhoto} 
                            alt={student.name} 
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-bold text-slate-200 block">{student.name}</span>
                            <span className="text-[10px] text-slate-500 block font-mono mt-0.5">Parent: {student.parentName}</span>
                          </div>
                        </td>

                        {/* Grade */}
                        <td className="py-3.5 text-slate-400 font-medium font-mono">{student.grade}</td>

                        {/* Marks badge */}
                        <td className="py-3.5 text-center">
                          <span className={`inline-block text-xs font-mono font-bold px-2.5 py-1 rounded-sm border ${
                            student.averageMark >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                            student.averageMark >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                            'bg-red-500/10 text-red-400 border-red-500/25'
                          }`}>
                            {student.averageMark}%
                          </span>
                        </td>

                        {/* Attendance badge */}
                        <td className="py-3.5 text-center">
                          <span className={`inline-block text-xs font-mono font-bold px-2.5 py-1 rounded-sm border ${
                            student.attendancePercent >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                            student.attendancePercent >= 80 ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                            'bg-red-500/10 text-red-400 border-red-500/25'
                          }`}>
                            {student.attendancePercent}%
                          </span>
                        </td>

                        {/* Conduct rating */}
                        <td className="py-3.5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-300 text-xs font-mono">{student.conductScore}/120</span>
                            <div className="w-16 bg-[#050608] border border-white/5 rounded-sm h-1 mt-1.5 overflow-hidden">
                              <div 
                                className={`h-full ${
                                  student.conductScore >= 100 ? 'bg-emerald-500' :
                                  student.conductScore >= 80 ? 'bg-sky-500' :
                                  student.conductScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                }`} 
                                style={{ width: `${(student.conductScore / 120) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Risk Index */}
                        <td className="py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5 pl-3">
                            <span className={`w-2 h-2 rounded-full ${
                              isHighRisk ? 'bg-red-500 animate-pulse' :
                              isMedRisk ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}></span>
                            <span className={`font-extrabold font-mono text-xs uppercase tracking-wider ${
                              isHighRisk ? 'text-red-400' :
                              isMedRisk ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {student.riskScore}% ({student.riskLevel})
                            </span>
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 text-right pr-2">
                          <button
                            onClick={() => triggerWarningGeneration(student)}
                            className="bg-white hover:bg-slate-200 text-black font-extrabold text-[10px] uppercase tracking-wider py-2 px-3.5 rounded-sm inline-flex items-center gap-1.5 transition"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Draft Parent Alert
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Drafting Modal/Panel overlay */}
          {selectedStudentForWarning && (
            <div className="bg-[#0c0e14] text-slate-300 rounded-sm p-6 border border-white/10 shadow-2xl relative overflow-hidden transition duration-300 animate-slide-up">
              <div className="flex justify-between items-start pb-4 border-b border-white/5 mb-6">
                <div>
                  <h3 className="text-lg font-serif italic text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sky-400" /> AI Parent Portal Notification Center
                  </h3>
                  <p className="text-slate-400 text-xs mt-1.5">Creating cooperative intervention letter addressing the parents of {selectedStudentForWarning.name}.</p>
                </div>
                <button 
                  onClick={() => setSelectedStudentForWarning(null)}
                  className="text-slate-400 hover:text-white font-bold text-xs px-2.5 py-1.5 bg-white/5 border border-white/5 rounded-sm transition"
                >
                  Close ×
                </button>
              </div>

              {isGeneratingWarning ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                  <p className="text-sm font-semibold text-slate-200 font-serif italic">Analyzing diagnostic risk indicators...</p>
                  <p className="text-xs text-slate-500 max-w-md text-center">Gemini is synthesizing the dynamic risk factors with school tutoring resource suggestions into an encouraging, cooperative SA administrative tone.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Warning detail tags */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-sm bg-[#050608] border border-white/10 text-xs">
                      <span className="text-slate-500 block uppercase tracking-wider font-bold text-[9px] font-mono">Recipient (Parent)</span>
                      <span className="font-bold text-slate-200 mt-1 block">{selectedStudentForWarning.parentName}</span>
                    </div>
                    <div className="p-3 rounded-sm bg-[#050608] border border-white/10 text-xs">
                      <span className="text-slate-500 block uppercase tracking-wider font-bold text-[9px] font-mono">Contact Channels</span>
                      <span className="font-bold text-slate-200 mt-1 block">{selectedStudentForWarning.parentEmail} | {selectedStudentForWarning.parentPhone}</span>
                    </div>
                    <div className="p-3 rounded-sm bg-[#050608] border border-white/10 text-xs">
                      <span className="text-slate-500 block uppercase tracking-wider font-bold text-[9px] font-mono">Dynamic Flag Factors</span>
                      <span className="font-bold text-red-400 mt-1 block">Avg Mark {selectedStudentForWarning.averageMark}% • Conduct {selectedStudentForWarning.conductScore}/120</span>
                    </div>
                  </div>

                  {/* Subject Input */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">Email / Portal Message Subject</label>
                    <input 
                      type="text" 
                      value={warningDraftTitle}
                      onChange={(e) => setWarningDraftTitle(e.target.value)}
                      className="w-full bg-[#050608] border border-white/10 text-slate-100 rounded-sm p-3 text-xs font-semibold focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* Body Textarea */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">Message Body Draft (Edit & Approve)</label>
                    <textarea 
                      rows={10}
                      value={warningDraftBody}
                      onChange={(e) => setWarningDraftBody(e.target.value)}
                      className="w-full bg-[#050608] border border-white/10 text-slate-100 rounded-sm p-3.5 text-xs leading-relaxed focus:ring-1 focus:ring-sky-500 focus:outline-none font-mono"
                    ></textarea>
                  </div>

                  {/* Submit / Cancel row */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setSelectedStudentForWarning(null)}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-sm transition"
                    >
                      Discard Draft
                    </button>
                    <button 
                      onClick={handleSendWarning}
                      disabled={warningSendSuccess}
                      className={`font-bold text-[10px] uppercase tracking-wider py-2.5 px-5 rounded-sm shadow-md transition flex items-center gap-1.5 ${
                        warningSendSuccess 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-sky-500 hover:bg-sky-400 text-black shadow-lg shadow-sky-500/10'
                      }`}
                    >
                      {warningSendSuccess ? (
                        <>
                          <Check className="w-4 h-4" /> Message Sent to Parent Portal!
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Approve & Send Alert
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages History (Logged notifications) */}
          <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl">
            <h3 className="font-serif italic text-white text-base mb-4">Parent Notification Log ({state.messages.length})</h3>
            <div className="space-y-3">
              {state.messages.map((msg) => {
                const s = state.students.find(student => student.id === msg.studentId);
                return (
                  <div key={msg.id} className="p-4 bg-[#050608] border border-white/5 rounded-sm space-y-1.5">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-200 text-xs">{msg.title}</h4>
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                        msg.status === 'Sent' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-white/5 border-white/5 text-slate-400'
                      }`}>
                        {msg.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Learner: <span className="font-semibold text-slate-300">{s?.name || 'Unknown'}</span> • Date Drafted: {msg.dateDrafted} {msg.dateSent && `• Date Sent: ${msg.dateSent}`}
                    </div>
                    <p className="text-xs text-slate-400 italic mt-2 line-clamp-2 leading-relaxed">"{msg.body}"</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Marks & Records Capture */}
      {activeTab === 'capture' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in" id="panel-capture">
          {/* Quick instructions / Help */}
          <div className="md:col-span-4 bg-[#0c0e14] text-slate-300 p-6 rounded-sm border border-white/5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="bg-sky-500/10 text-sky-400 border border-sky-500/20 p-2.5 rounded-sm w-10 h-10 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-serif italic text-white mt-4">Real-Time Ingestion Engine</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                Adding marks, capturing student absences, or logging behavioral infractions dynamically triggers our diagnostic risk-scoring loop.
              </p>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                As soon as a learner's data drops beneath critical bounds, they are immediately flagged, and personalized Parent Alert configurations appear in the Early-Warning console.
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-white/5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Phakamani Educational Intelligence Platform
            </div>
          </div>

          {/* Capture Form */}
          <form onSubmit={handleLogSubmit} className="md:col-span-8 bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl space-y-4">
            <h3 className="font-serif italic text-white text-base mb-1">Add Student Diagnostics Log</h3>
            <p className="text-slate-400 text-xs">Simulate marks capture, morning registration registers, or merit/infraction logging.</p>

            {/* Select Learner */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">1. Target Learner</label>
              <select
                required
                value={logStudentId}
                onChange={(e) => setLogStudentId(e.target.value)}
                className="w-full bg-[#050608] border border-white/10 rounded-sm p-3 text-sm focus:ring-1 focus:ring-sky-500 text-slate-200 focus:outline-none"
              >
                <option value="" className="bg-[#0c0e14]">-- Choose Learner --</option>
                {state.students.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0c0e14]">{s.name} ({s.grade})</option>
                ))}
              </select>
            </div>

            {/* Select Record Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">2. Record Classification</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input 
                    type="radio" 
                    name="logType" 
                    checked={logType === 'mark'} 
                    onChange={() => setLogType('mark')}
                    className="w-4 h-4 text-sky-500 bg-[#050608] border-white/10 focus:ring-sky-500 focus:ring-offset-0"
                  />
                  Test Mark
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input 
                    type="radio" 
                    name="logType" 
                    checked={logType === 'attendance'} 
                    onChange={() => setLogType('attendance')}
                    className="w-4 h-4 text-sky-500 bg-[#050608] border-white/10 focus:ring-sky-500 focus:ring-offset-0"
                  />
                  Daily Attendance
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input 
                    type="radio" 
                    name="logType" 
                    checked={logType === 'behaviour'} 
                    onChange={() => setLogType('behaviour')}
                    className="w-4 h-4 text-sky-500 bg-[#050608] border-white/10 focus:ring-sky-500 focus:ring-offset-0"
                  />
                  Conduct Log
                </label>
              </div>
            </div>

            {/* Mark Inputs */}
            {logType === 'mark' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#050608]/50 rounded-sm border border-white/5 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                  <select
                    value={markSubject}
                    onChange={(e) => setMarkSubject(e.target.value)}
                    className="w-full bg-[#050608] border border-white/10 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="Mathematics" className="bg-[#0c0e14]">Mathematics</option>
                    <option value="Physical Sciences" className="bg-[#0c0e14]">Physical Sciences</option>
                    <option value="Life Sciences" className="bg-[#0c0e14]">Life Sciences</option>
                    <option value="English First Additional Language" className="bg-[#0c0e14]">English FAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Test Name</label>
                  <input 
                    required
                    type="text" 
                    value={markName} 
                    onChange={(e) => setMarkName(e.target.value)}
                    placeholder="e.g. June Exam, Class Assignment"
                    className="w-full bg-[#050608] border border-white/10 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Learner Score (0 - {markMax})</label>
                  <input 
                    required
                    type="number" 
                    value={markValue} 
                    onChange={(e) => setMarkValue(Number(e.target.value))}
                    min={0}
                    max={Math.min(100, markMax)}
                    className="w-full bg-[#050608] border border-white/10 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Max Potential Score (1 - 100)</label>
                  <input 
                    required
                    type="number" 
                    value={markMax} 
                    onChange={(e) => setMarkMax(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full bg-[#050608] border border-white/10 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {/* Attendance Inputs */}
            {logType === 'attendance' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#050608]/50 rounded-sm border border-white/5 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Morning Register Status</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input 
                        type="radio" 
                        name="attStatus" 
                        checked={attStatus === 'Present'} 
                        onChange={() => setAttStatus('Present')}
                        className="w-3.5 h-3.5 text-sky-500 bg-[#050608] border-white/10 focus:ring-sky-500"
                      />
                      Present
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input 
                        type="radio" 
                        name="attStatus" 
                        checked={attStatus === 'Absent'} 
                        onChange={() => setAttStatus('Absent')}
                        className="w-3.5 h-3.5 text-sky-500 bg-[#050608] border-white/10 focus:ring-sky-500"
                      />
                      Absent
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Absence Explanation / Reason</label>
                  <input 
                    type="text" 
                    value={attReason} 
                    onChange={(e) => setAttReason(e.target.value)}
                    placeholder="e.g. Unexcused, Transport failure, Flu"
                    disabled={attStatus === 'Present'}
                    className="w-full bg-[#050608] border border-white/10 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-40"
                  />
                </div>
              </div>
            )}

            {/* Behaviour Inputs */}
            {logType === 'behaviour' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#050608]/50 rounded-sm border border-white/5 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input 
                        type="radio" 
                        name="behCategory" 
                        checked={behCategory === 'Positive'} 
                        onChange={() => setBehCategory('Positive')}
                        className="w-3.5 h-3.5 text-emerald-500 bg-[#050608] border-white/10 focus:ring-emerald-500"
                      />
                      Merit (Positive)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input 
                        type="radio" 
                        name="behCategory" 
                        checked={behCategory === 'Concern'} 
                        onChange={() => setBehCategory('Concern')}
                        className="w-3.5 h-3.5 text-red-500 bg-[#050608] border-white/10 focus:ring-red-500"
                      />
                      Infraction (Concern)
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Modifier Point Weight</label>
                  <input 
                    required
                    type="number" 
                    value={behPoints} 
                    onChange={(e) => setBehPoints(Number(e.target.value))}
                    min={1}
                    className="w-full bg-[#050608] border border-white/10 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Behavior / Incident Description</label>
                  <input 
                    required
                    type="text" 
                    value={behDesc} 
                    onChange={(e) => setBehDesc(e.target.value)}
                    placeholder="e.g. Assisted teacher organizing study files, Missed test without medical note"
                    className="w-full bg-[#050608] border border-white/10 text-slate-200 rounded-sm p-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}

            {/* Validation Error Notice */}
            {formValidationError && (
              <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-sm text-xs text-red-400 flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formValidationError}</span>
              </div>
            )}

            {/* Submit button */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-sky-400 font-mono h-4">
                {recordLogSuccess && "✓ Student diagnostic log submitted successfully!"}
              </span>
              <button
                type="submit"
                disabled={!logStudentId}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-30 text-black font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-6 rounded-sm shadow-lg shadow-sky-500/10 transition"
                id="btn-submit-log"
              >
                Log Diagnostics & Compute Risk
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manuals / Rules Mockup Tab */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in" id="panel-rules">
          <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl space-y-4">
            <h3 className="font-serif italic text-white text-base flex items-center gap-2 border-b border-white/5 pb-3">
              <ShieldAlert className="w-5 h-5 text-sky-400" /> Learner Code of Conduct
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">
              {state.schoolRules.conductPolicy}
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl space-y-4">
              <h3 className="font-serif italic text-white text-base flex items-center gap-2 border-b border-white/5 pb-3">
                <FileText className="w-5 h-5 text-sky-400" /> Mandated Grade Stationery List
              </h3>
              <ul className="space-y-2">
                {state.schoolRules.stationeryList.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-400">
                    <span className="bg-sky-500/10 border border-sky-500/25 text-sky-400 text-[9px] font-mono font-bold rounded-sm w-4 h-4 flex items-center justify-center mt-0.5">{i+1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl space-y-4">
              <h3 className="font-serif italic text-white text-base flex items-center gap-2 border-b border-white/5 pb-3">
                <Calendar className="w-5 h-5 text-sky-400" /> Upcoming Academic Term Dates
              </h3>
              <div className="space-y-3">
                {state.schoolRules.importantDates.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                    <span className="font-semibold text-slate-300">{d.event}</span>
                    <span className="bg-[#050608] border border-white/5 text-slate-400 font-bold px-2 py-0.5 rounded-sm font-mono">{d.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
