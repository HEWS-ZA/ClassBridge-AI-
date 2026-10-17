/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Bus, 
  Sparkles, 
  RefreshCw, 
  HelpCircle, 
  ChevronRight, 
  Play, 
  ArrowRight,
  Home,
  CheckCircle,
  Menu,
  GraduationCap,
  Mail,
  CreditCard,
  Bell
} from 'lucide-react';

import { 
  Student, 
  Teacher, 
  LessonPlan, 
  Mark, 
  Attendance, 
  BehaviourLog, 
  GeneratedLesson, 
  Message, 
  SchoolStats,
  FeePayment,
  TutoringBooking,
  TransitAlert
} from './types';

import AdminPortal from './components/AdminPortal';
import StudentPortal from './components/StudentPortal';
import ParentPortal from './components/ParentPortal';
import DriverPortal from './components/DriverPortal';

type PortalRole = 'admin' | 'student' | 'parent' | 'driver';

interface RealtimeToast {
  id: string;
  type: 'transit' | 'teacher' | 'lesson' | 'warning' | 'mark' | 'payment' | 'general';
  title: string;
  message: string;
  timestamp: string;
}

export default function App() {
  const [role, setRole] = useState<PortalRole>('admin');
  const [state, setState] = useState<{
    students: Student[];
    teachers: Teacher[];
    lessonPlans: LessonPlan[];
    marks: Mark[];
    attendanceLogs: Attendance[];
    behaviourLogs: BehaviourLog[];
    generatedLessons: GeneratedLesson[];
    messages: Message[];
    feePayments?: FeePayment[];
    tutoringBookings?: TutoringBooking[];
    transitAlerts?: TransitAlert[];
    stats: SchoolStats;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time Toast Alert Notification
  const [activeToast, setActiveToast] = useState<RealtimeToast | null>(null);

  // Pitch Assistant Guide steps
  const [showGuide, setShowGuide] = useState(true);
  const [guideStep, setGuideStep] = useState(0);

  // Default select student for Student view demo
  const [selectedStudentId, setSelectedStudentId] = useState<string>('stud-1'); // Default Thabo Mokoena

  // Fetch full state from server
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to retrieve school state records');
      const data = await res.json();
      setState(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error syncing with backend database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();

    // Establish Server-Sent Events (SSE) stream for real-time instant push notifications
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      const triggerToast = (toast: RealtimeToast) => {
        setActiveToast(toast);
        setTimeout(() => {
          setActiveToast(curr => curr?.id === toast.id ? null : curr);
        }, 7000);
      };

      eventSource.addEventListener('transit_delay', (e) => {
        try {
          const data = JSON.parse(e.data);
          fetchState();
          triggerToast({
            id: `toast-${Date.now()}`,
            type: 'transit',
            title: `Transit Delay Alert • ${data.driverName}`,
            message: `${data.reason} (${data.route}). Expected delay of ~${data.estimatedDelayMinutes} mins.`,
            timestamp: data.timestamp || 'Just now'
          });
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('teacher_toggle', (e) => {
        try {
          const data = JSON.parse(e.data);
          fetchState();
          triggerToast({
            id: `toast-${Date.now()}`,
            type: 'teacher',
            title: `Faculty Status Changed: ${data.name}`,
            message: `Educator presence set to ${data.status} for ${data.subject} (${data.grade}).`,
            timestamp: 'Just now'
          });
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('lesson_generated', (e) => {
        try {
          const data = JSON.parse(e.data);
          fetchState();
          triggerToast({
            id: `toast-${Date.now()}`,
            type: 'lesson',
            title: 'AI Substitute Lesson Ready',
            message: `Continuity lesson compiled: "${data.title}" for ${data.subject}.`,
            timestamp: 'Just now'
          });
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('message_saved', (e) => {
        try {
          const data = JSON.parse(e.data);
          fetchState();
          triggerToast({
            id: `toast-${Date.now()}`,
            type: 'warning',
            title: data.status === 'Sent' ? 'Official Advisory Dispatched' : 'Advisory Draft Saved',
            message: `Parent advisory alert for ${data.studentName}: "${data.title}"`,
            timestamp: 'Just now'
          });
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('fee_paid', (e) => {
        try {
          const data = JSON.parse(e.data);
          fetchState();
          triggerToast({
            id: `toast-${Date.now()}`,
            type: 'payment',
            title: 'Levy Fee Payment Settled',
            message: `R${data.amount} received from ${data.cardholder} for ${data.feeTitle}.`,
            timestamp: 'Just now'
          });
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('tutoring_booked', (e) => {
        try {
          const data = JSON.parse(e.data);
          fetchState();
          triggerToast({
            id: `toast-${Date.now()}`,
            type: 'general',
            title: 'Tutoring Remediation Confirmed',
            message: `${data.studentName} enrolled into afternoon CAPS revision session.`,
            timestamp: 'Just now'
          });
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('mark_added', () => {
        fetchState();
      });

      eventSource.addEventListener('attendance_logged', () => {
        fetchState();
      });

      eventSource.addEventListener('behaviour_logged', () => {
        fetchState();
      });

      eventSource.addEventListener('state_reset', () => {
        fetchState();
      });
    } catch (err) {
      console.warn('Real-time SSE event source setup notice:', err);
    }

    return () => {
      eventSource?.close();
    };
  }, []);

  // API Call: Toggle Teacher Attendance
  const handleToggleTeacher = async (teacherId: string, status: 'Active' | 'Absent') => {
    try {
      const res = await fetch('/api/teachers/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, status })
      });
      if (!res.ok) throw new Error('Failed to update teacher presence status');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Continuity Mode Lesson Plan Generator
  const handleGenerateLesson = async (teacherId: string, lessonPlanId: string) => {
    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, lessonPlanId })
      });
      if (!res.ok) throw new Error('Failed to compile substitute lesson structure');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Early Warning Parent Email Generator
  const handleGenerateWarning = async (studentId: string) => {
    try {
      const res = await fetch('/api/generate-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      if (!res.ok) throw new Error('Failed to invoke diagnostic draft generator');
      const data = await res.json();
      await fetchState();
      return data.message;
    } catch (err: any) {
      alert(err.message);
      return null;
    }
  };

  // API Call: Save message / Edit draft / Send message
  const handleSaveMessage = async (studentId: string, title: string, body: string, status: 'Draft' | 'Sent') => {
    try {
      const res = await fetch('/api/messages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, title, body, status })
      });
      if (!res.ok) throw new Error('Failed to sync advisory draft message');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Add Mark
  const handleAddMark = async (studentId: string, subject: string, testName: string, markValue: number, maxMark: number) => {
    try {
      const res = await fetch('/api/logs/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, subject, testName, markValue, maxMark })
      });
      if (!res.ok) throw new Error('Failed to record continuous assessment mark');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Add Attendance log
  const handleAddAttendance = async (studentId: string, status: 'Present' | 'Absent', reason?: string) => {
    try {
      const res = await fetch('/api/logs/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status, reason })
      });
      if (!res.ok) throw new Error('Failed to capture morning register registration');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Add Behaviour log
  const handleAddBehaviour = async (studentId: string, category: 'Positive' | 'Concern', description: string, points: number) => {
    try {
      const res = await fetch('/api/logs/behaviour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, category, description, points })
      });
      if (!res.ok) throw new Error('Failed to log behavioral modifier points');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Reset state to default seeds
  const handleResetState = async () => {
    try {
      const res = await fetch('/api/state/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset school databases');
      await fetchState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // API Call: Pay School Fee with persistent storage
  const handlePayFee = async (studentId: string, feeTitle: string, amount: number, cardholderName: string) => {
    try {
      const res = await fetch('/api/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, feeTitle, amount, cardholderName })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to process fee settlement');
      }
      await fetchState();
      return true;
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
      return false;
    }
  };

  // API Call: Book Compulsory Tutoring with persistent storage
  const handleBookTutoring = async (studentId: string, messageId: string) => {
    try {
      const res = await fetch('/api/tutoring/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, messageId })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to confirm remediation tutoring booking');
      }
      await fetchState();
      return true;
    } catch (err: any) {
      alert(err.message || 'Tutoring booking failed');
      return false;
    }
  };

  // API Call: Broadcast Transit Delay (Scholar Transport Driver)
  const handleNotifyDelay = async (driverName: string, route: string, reason: string, estimatedDelayMinutes: number) => {
    try {
      const res = await fetch('/api/driver/delay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverName, route, reason, estimatedDelayMinutes })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to broadcast transit delay notice');
      }
      await fetchState();
      return true;
    } catch (err: any) {
      alert(err.message || 'Transit delay broadcast failed');
      return false;
    }
  };

  const pitchGuideSteps = [
    {
      title: "Step 1: Set Educator Absent (Continuity Mode)",
      instruction: "Currently on the School / Admin Portal. Scroll to 'Faculty Attendance Status' on the left. Find 'Mrs. Thandi Ngubane' (Mathematics Grade 12) and toggle her status to 'Mark Absent'. Notice the absentee metric increment in real-time.",
      actionLabel: "Next Step",
      onAction: () => setGuideStep(1)
    },
    {
      title: "Step 2: Generate AI Lesson Plan",
      instruction: "Now on the right-hand panel, Mrs. Ngubane should be selected. Select 'Grade 12 Mathematics topic' (Calculus Limits & Derivatives) and click the glowing button: 'Compile AI Substitute Lesson Plan'. Gemini will assemble custom blackboard slides, transcripts, and voice walkthroughs live into PostgreSQL!",
      actionLabel: "Verify on Student Portal",
      onAction: () => {
        setRole('student');
        setGuideStep(2);
      }
    },
    {
      title: "Step 3: Run catch-up as a Learner",
      instruction: "Welcome to the Student Portal! A red alert card signals Mrs. Ngubane's absence. Click 'Start Lesson' on the Calculus course block. Click 'Play Walkthrough' to hear the narrated guide, step through the whiteboard slides, and try the Calculus self-check quiz!",
      actionLabel: "Proceed to Early-Warning",
      onAction: () => {
        setRole('admin');
        setGuideStep(3);
      }
    },
    {
      title: "Step 4: Real-time Diagnostics (Early-Warning)",
      instruction: "Back to School / Admin. Click the 'Early-Warning (Diagnostic AI)' tab. Look at the calculated risk indicators. Select Thabo Mokoena (High Risk: 82%) and click 'Draft Parent Alert'. Gemini will construct a supportive, collaborative letter addressing Thabo's parents.",
      actionLabel: "Check Parent Portal Inbox",
      onAction: () => {
        setRole('parent');
        setSelectedStudentId('stud-1'); // Joyce Mokoena
        setGuideStep(4);
      }
    },
    {
      title: "Step 5: Coordinated Support & WhatsApp Preview",
      instruction: "Welcome to the Parent Portal of Joyce Mokoena. Click 'Inbox Alerts'. Use the new Format Switcher to toggle between the Formal School Letterhead and the authentic WhatsApp/SMS Chat Preview with double-blue delivery checkmarks!",
      actionLabel: "Finish Walkthrough",
      onAction: () => {
        setShowGuide(false);
        setGuideStep(0);
      }
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center p-4">
        <div className="bg-[#0c0e14] p-8 rounded-xl border border-white/5 flex flex-col items-center space-y-4 max-w-sm w-full text-center shadow-2xl">
          <RefreshCw className="w-10 h-10 text-sky-400 animate-spin" />
          <div>
            <h1 className="font-serif italic text-white text-2xl">ClassBridge AI</h1>
            <p className="text-slate-500 font-mono text-[11px] uppercase tracking-wider mt-2">Connecting PostgreSQL & CAPS resources...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center p-4">
        <div className="bg-[#0c0e14] p-8 rounded-xl border border-red-500/20 flex flex-col items-center space-y-4 max-w-md w-full text-center shadow-2xl">
          <div className="bg-red-500/10 text-red-400 p-3 rounded-full border border-red-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-serif italic text-white text-2xl">Database Sync Failure</h1>
            <p className="text-red-400 text-xs mt-1.5 font-medium font-mono">{error || 'Could not fetch data state'}</p>
          </div>
          <button 
            onClick={fetchState}
            className="w-full bg-white hover:bg-slate-200 text-black font-extrabold py-2.5 rounded text-xs uppercase tracking-wider transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050608] text-slate-300 flex flex-col justify-between font-sans border-4 sm:border-8 border-[#0c0e12] overflow-x-hidden" id="app-workspace">
      
      {/* Top Universal Navbar & Portal Role Switcher */}
      <nav className="bg-[#080a0f] border-b border-white/5 sticky top-0 z-40" id="universal-navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Branding Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white flex items-center justify-center rounded-sm">
                <div className="w-6 h-6 border-2 border-black rotate-45 flex items-center justify-center">
                  <div className="w-2 h-2 bg-black rounded-full"></div>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold tracking-tighter text-xl uppercase leading-none">ClassBridge <span className="text-sky-500">AI</span></span>
                <span className="text-[10px] text-sky-500 font-mono tracking-widest uppercase opacity-80 leading-none mt-1">Impact Dashboard — S.A. EdTech Track</span>
              </div>
            </div>

            {/* Role Switching Selector Pill */}
            <div className="hidden md:flex items-center gap-1 bg-[#0c0e14] border border-white/5 p-1 rounded-sm" id="nav-role-picker">
              <button
                onClick={() => setRole('admin')}
                className={`px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                  role === 'admin' 
                    ? 'bg-white text-black shadow-sm font-black' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" /> School Admin
              </button>
              <button
                onClick={() => setRole('student')}
                className={`px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                  role === 'student' 
                    ? 'bg-white text-black shadow-sm font-black' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> Student Portal
              </button>
              <button
                onClick={() => setRole('parent')}
                className={`px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                  role === 'parent' 
                    ? 'bg-white text-black shadow-sm font-black' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Parent Portal
              </button>
              <button
                onClick={() => setRole('driver')}
                className={`px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                  role === 'driver' 
                    ? 'bg-white text-black shadow-sm font-black' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bus className="w-3.5 h-3.5" /> Bus Driver
              </button>
            </div>

            {/* Real-time SSE indicator & Quick Helper Button */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live SSE Sync</span>
              </div>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-sm bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition flex items-center gap-1"
                id="btn-toggle-guide"
              >
                <HelpCircle className="w-4 h-4" />
                {showGuide ? "Hide Guide" : "Pitch Guide"}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Portal Navigation Bar */}
        <div className="md:hidden border-t border-white/5 flex items-center justify-around py-3 bg-[#080a0f] text-xs text-slate-400" id="mobile-role-picker">
          <button 
            onClick={() => setRole('admin')} 
            className={`flex flex-col items-center gap-1 font-bold ${role === 'admin' ? 'text-sky-400' : ''}`}
          >
            <ShieldAlert className="w-4 h-4" /> Admin
          </button>
          <button 
            onClick={() => setRole('student')} 
            className={`flex flex-col items-center gap-1 font-bold ${role === 'student' ? 'text-sky-400' : ''}`}
          >
            <GraduationCap className="w-4 h-4" /> Student
          </button>
          <button 
            onClick={() => setRole('parent')} 
            className={`flex flex-col items-center gap-1 font-bold ${role === 'parent' ? 'text-sky-400' : ''}`}
          >
            <Users className="w-4 h-4" /> Parent
          </button>
          <button 
            onClick={() => setRole('driver')} 
            className={`flex flex-col items-center gap-1 font-bold ${role === 'driver' ? 'text-sky-400' : ''}`}
          >
            <Bus className="w-4 h-4" /> Driver
          </button>
        </div>
      </nav>

      {/* Floating Real-Time SSE Toast Alert */}
      {activeToast && (
        <div className="fixed top-24 right-4 sm:right-8 z-50 max-w-md w-full animate-slide-up shadow-2xl rounded-sm border overflow-hidden bg-[#0c0e14] border-white/15">
          <div className={`p-4 flex items-start gap-3 ${
            activeToast.type === 'transit' ? 'bg-amber-500/10 border-l-4 border-amber-500' :
            activeToast.type === 'teacher' ? 'bg-red-500/10 border-l-4 border-red-500' :
            activeToast.type === 'lesson' ? 'bg-sky-500/10 border-l-4 border-sky-400' :
            activeToast.type === 'payment' ? 'bg-emerald-500/10 border-l-4 border-emerald-400' :
            'bg-slate-800/40 border-l-4 border-sky-500'
          }`}>
            <div className="shrink-0 mt-0.5">
              {activeToast.type === 'transit' && <Bus className="w-5 h-5 text-amber-400 animate-pulse" />}
              {activeToast.type === 'teacher' && <ShieldAlert className="w-5 h-5 text-red-400" />}
              {activeToast.type === 'lesson' && <Sparkles className="w-5 h-5 text-sky-400" />}
              {activeToast.type === 'warning' && <Mail className="w-5 h-5 text-sky-400" />}
              {activeToast.type === 'payment' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {activeToast.type === 'general' && <CheckCircle className="w-5 h-5 text-sky-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider truncate">
                  {activeToast.title}
                </h4>
                <span className="text-[9px] font-mono text-slate-500 shrink-0">{activeToast.timestamp}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-normal font-sans">
                {activeToast.message}
              </p>
            </div>
            <button 
              onClick={() => setActiveToast(null)}
              className="text-slate-500 hover:text-white text-xs px-1 hover:bg-white/5 rounded transition shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container Portal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full" id="portal-content-panel">
        {role === 'admin' && (
          <AdminPortal
            state={state}
            onToggleTeacher={handleToggleTeacher}
            onGenerateLesson={handleGenerateLesson}
            onGenerateWarning={handleGenerateWarning}
            onSaveMessage={handleSaveMessage}
            onAddMark={handleAddMark}
            onAddAttendance={handleAddAttendance}
            onAddBehaviour={handleAddBehaviour}
            onResetState={handleResetState}
          />
        )}
        
        {role === 'student' && (
          <StudentPortal
            state={state}
            selectedStudentId={selectedStudentId}
            onSelectStudent={setSelectedStudentId}
          />
        )}

        {role === 'parent' && (
          <ParentPortal
            state={state}
            onSaveMessage={handleSaveMessage}
            onPayFee={handlePayFee}
            onBookTutoring={handleBookTutoring}
          />
        )}

        {role === 'driver' && (
          <DriverPortal
            state={state}
            onNotifyDelay={handleNotifyDelay}
          />
        )}
      </main>

      {/* Floating Pitch Assistant Board */}
      {showGuide && (
        <div className="fixed bottom-4 right-4 max-w-sm w-full bg-[#0c0e14] border border-white/15 text-slate-300 rounded shadow-2xl p-5 z-50 animate-slide-up" id="pitch-assistant-card">
          <div className="flex justify-between items-start pb-2 border-b border-white/5 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sky-400">
              <Sparkles className="w-4 h-4" /> Pitch Assistant
            </div>
            <button 
              onClick={() => setShowGuide(false)} 
              className="text-white/40 hover:text-white text-xs font-bold px-1.5 py-0.5 bg-white/5 rounded-sm transition"
            >
              Hide
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="font-serif italic text-white text-sm">{pitchGuideSteps[guideStep].title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">{pitchGuideSteps[guideStep].instruction}</p>
            
            <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-2">
              <span className="text-[10px] text-slate-500 font-mono">
                Step {guideStep + 1} of {pitchGuideSteps.length}
              </span>
              <button
                onClick={pitchGuideSteps[guideStep].onAction}
                className="bg-white hover:bg-slate-200 text-black font-extrabold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-sm flex items-center gap-1 transition"
                id="btn-pitch-next"
              >
                {pitchGuideSteps[guideStep].actionLabel} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sophisticated Dark Footer */}
      <footer className="border-t border-white/5 px-4 sm:px-10 py-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between bg-[#050608] text-[10px] uppercase tracking-[0.15em] font-bold gap-4 text-center sm:text-left" id="universal-footer">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-10">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-white/30">Instructional Hours Saved:</span>
            <span className="text-sky-400">142.5 hrs</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-white/30">Successful Interventions:</span>
            <span className="text-green-400">28</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-white/30">Persistence:</span>
            <span className="text-emerald-400">PostgreSQL (Drizzle ORM)</span>
          </div>
        </div>
        <div className="text-white/20">ClassBridge AI • South African EdTech Track © 2026</div>
      </footer>
    </div>
  );
}
