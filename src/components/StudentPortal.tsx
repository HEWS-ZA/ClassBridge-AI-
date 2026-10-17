/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Award, 
  Clock, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  MapPin, 
  GraduationCap, 
  HelpCircle,
  TrendingUp,
  Sparkles,
  Volume2
} from 'lucide-react';
import { Student, Teacher, LessonPlan, Mark, Attendance, BehaviourLog, GeneratedLesson } from '../types';

interface StudentPortalProps {
  state: {
    students: Student[];
    teachers: Teacher[];
    lessonPlans: LessonPlan[];
    marks: Mark[];
    attendanceLogs: Attendance[];
    behaviourLogs: BehaviourLog[];
    generatedLessons: GeneratedLesson[];
  };
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
}

export default function StudentPortal({
  state,
  selectedStudentId,
  onSelectStudent
}: StudentPortalProps) {
  const currentStudent = state.students.find(s => s.id === selectedStudentId) || state.students[0];
  
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<'lessons' | 'grades' | 'timetable'>('lessons');

  // Interactive Lesson Player states
  const [activeLesson, setActiveLesson] = useState<GeneratedLesson | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Audio simulation timer
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 100;
          }
          return prev + 2.5; // step simulation
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio]);

  const startLesson = (lesson: GeneratedLesson) => {
    setActiveLesson(lesson);
    setCurrentSlideIndex(0);
    setIsPlayingAudio(false);
    setAudioProgress(0);
    setSelectedQuizAnswers({});
    setQuizSubmitted(false);
  };

  const handleNextSlide = () => {
    if (!activeLesson) return;
    if (currentSlideIndex < activeLesson.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
      // Reset simulated audio playback per slide
      setIsPlayingAudio(false);
      setAudioProgress(0);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
      setIsPlayingAudio(false);
      setAudioProgress(0);
    }
  };

  // Find active continuity lessons for this student's grade/subjects
  // Simpler mapping for hackathon demo:
  // If the teacher of a lesson is set to "Absent", show it as active for all matching grade students
  const activeContinuityLessons = state.generatedLessons.filter(lesson => {
    const teacher = state.teachers.find(t => t.id === lesson.teacherId);
    return teacher && teacher.status === 'Absent';
  });

  // Filter marks for this student
  const studentMarks = state.marks.filter(m => m.studentId === currentStudent.id);
  
  // Custom mock timetable for Phakamani Secondary
  const mockTimetable = [
    { period: 'Period 1 (08:00 - 09:00)', subject: 'Mathematics', educator: 'Mrs. Thandi Ngubane', venue: 'Room 12-A', activeAbsent: state.teachers.find(t => t.id === 'teach-1')?.status === 'Absent' },
    { period: 'Period 2 (09:00 - 10:00)', subject: 'Physical Sciences', educator: 'Mr. Jaco Pretorius', venue: 'Science Lab 2', activeAbsent: state.teachers.find(t => t.id === 'teach-2')?.status === 'Absent' },
    { period: 'Interval (10:00 - 10:30)', subject: 'Lunch Break & Recreation', educator: 'On-Duty Educators', venue: 'Courtyard', activeAbsent: false },
    { period: 'Period 3 (10:30 - 11:30)', subject: 'Life Sciences', educator: 'Ms. Nomvula Sithole', venue: 'Biology Lab', activeAbsent: state.teachers.find(t => t.id === 'teach-3')?.status === 'Absent' },
    { period: 'Period 4 (11:30 - 12:30)', subject: 'English FAL', educator: 'Mr. David Abrahamse', venue: 'Room 10-C', activeAbsent: state.teachers.find(t => t.id === 'teach-4')?.status === 'Absent' }
  ];

  // Mock quiz tailored to the lesson plan topics
  const getMockQuizQuestions = (topic: string) => {
    if (topic.includes('Calculus') || topic.includes('Limit')) {
      return [
        {
          q: "What is the derivative of f(x) = 3x^2 from first principles or power rule?",
          options: ["f'(x) = 6x", "f'(x) = 3x", "f'(x) = 6x^2", "f'(x) = 6"],
          correct: 0,
          explanation: "Applying the power rule: multiply by the exponent (2) and subtract 1 from it: d/dx(3x^2) = 3 * 2 * x^(2-1) = 6x."
        },
        {
          q: "Calculate lim [x -> 3] (x^2 - 9)/(x - 3) using factorization.",
          options: ["3", "0", "6", "Undefined"],
          correct: 2,
          explanation: "Factorize the numerator: (x-3)(x+3)/(x-3) = x+3. Substituting x=3 gives 3 + 3 = 6."
        }
      ];
    } else {
      return [
        {
          q: "Which phase of photosynthesis is responsible for oxygen release?",
          options: ["The Light-Independent Phase (Calvin Cycle)", "The Light-Dependent Phase", "The Citric Acid Cycle", "The Glycolysis Phase"],
          correct: 1,
          explanation: "Oxygen is produced and released during the light-dependent phase through the photolysis of water in the thylakoid membranes."
        },
        {
          q: "Where exactly does the Dark Phase (Calvin Cycle) of photosynthesis take place?",
          options: ["Grana of chloroplasts", "Mitochondria", "Stroma of chloroplasts", "Cell cytoplasm"],
          correct: 2,
          explanation: "The light-independent reactions (dark phase/Calvin Cycle) occur in the fluid-filled stroma of the chloroplasts."
        }
      ];
    }
  };

  const currentQuiz = activeLesson ? getMockQuizQuestions(activeLesson.title) : [];

  return (
    <div className="space-y-6 animate-fade-in" id="student-portal-root">
      {/* Profile Switcher & Greeting */}
      <div className="bg-[#0c0e14] text-slate-300 rounded-sm p-6 border border-white/10 relative overflow-hidden" id="student-header">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-sky-500/5 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <img 
              src={currentStudent.profilePhoto} 
              alt={currentStudent.name} 
              className="w-16 h-16 rounded-full object-cover border border-white/10"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="bg-sky-500/10 border border-sky-500/25 text-sky-400 font-mono font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm inline-block">Learner Dashboard</span>
              <h1 className="text-3xl font-serif italic text-white tracking-tight mt-1">Siyakwamukela, {currentStudent.name}</h1>
              <p className="text-slate-400 text-xs mt-1.5 flex items-center gap-1 font-sans">
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" /> Phakamani High • Grade {currentStudent.grade}
              </p>
            </div>
          </div>

          {/* Demo Switcher */}
          <div className="bg-[#050608] p-3 rounded-sm border border-white/10 text-xs space-y-1.5 w-full md:w-auto">
            <label className="block text-slate-500 text-[9px] font-bold uppercase tracking-wider font-mono">Demo Switch Learner Profile</label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                onSelectStudent(e.target.value);
                setActiveLesson(null); // Reset active lessons on switch
              }}
              className="bg-[#0c0e14] text-slate-200 border border-white/5 rounded-sm p-1.5 font-bold focus:outline-none w-full"
            >
              {state.students.map(s => (
                <option key={s.id} value={s.id} className="bg-[#0c0e14]">{s.name} ({s.grade})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex border border-white/5 bg-[#080a0f] p-1 rounded-sm" id="student-sub-tabs">
        <button
          onClick={() => setActiveSubTab('lessons')}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition ${
            activeSubTab === 'lessons' 
              ? 'bg-sky-500 text-black shadow-md rounded-sm border-0' 
              : 'text-slate-400 hover:text-white hover:bg-white/5 rounded-sm border-0'
          }`}
        >
          Active Continuity Lessons ({activeContinuityLessons.length})
        </button>
        <button
          onClick={() => setActiveSubTab('grades')}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition ${
            activeSubTab === 'grades' 
              ? 'bg-sky-500 text-black shadow-md rounded-sm border-0' 
              : 'text-slate-400 hover:text-white hover:bg-white/5 rounded-sm border-0'
          }`}
        >
          My Academic Records
        </button>
        <button
          onClick={() => setActiveSubTab('timetable')}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition ${
            activeSubTab === 'timetable' 
              ? 'bg-sky-500 text-black shadow-md rounded-sm border-0' 
              : 'text-slate-400 hover:text-white hover:bg-white/5 rounded-sm border-0'
          }`}
        >
          Today's Timetable
        </button>
      </div>

      {/* TAB: Continuity Lessons */}
      {activeSubTab === 'lessons' && (
        <div className="space-y-6">
          {/* Active absence announcements */}
          {activeContinuityLessons.length > 0 && !activeLesson && (
            <div className="bg-red-950/10 border border-red-900/30 p-5 rounded-sm space-y-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-serif italic text-white text-sm">Classroom Continuity Alerts Active</h3>
                  <p className="text-red-400 text-xs mt-0.5">One or more of your subject educators are absent today. The school admin has compiled active catch-up lesson plans. Select a topic below to complete the structured substitute lesson.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {activeContinuityLessons.map((lesson) => {
                  const teacher = state.teachers.find(t => t.id === lesson.teacherId);
                  return (
                    <div key={lesson.id} className="bg-[#050608] p-4 rounded-sm border border-white/5 flex justify-between items-center shadow-sm">
                      <div>
                        <h4 className="font-black text-slate-200 text-sm leading-tight">{lesson.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">Substitute for {teacher?.name || 'Educator'}</p>
                      </div>
                      <button
                        onClick={() => startLesson(lesson)}
                        className="bg-sky-500 hover:bg-sky-400 text-black font-extrabold uppercase tracking-wider text-[10px] px-3.5 py-2 rounded-sm flex items-center gap-1 shadow-lg shadow-sky-500/10 transition shrink-0 ml-3"
                      >
                        <Play className="w-3 h-3 fill-current" /> Start Lesson
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fallback no alerts */}
          {activeContinuityLessons.length === 0 && (
            <div className="bg-[#0c0e14] border border-emerald-500/10 p-6 rounded-sm text-center space-y-2 shadow-2xl">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="font-serif italic text-emerald-400 text-sm">Syllabus Progress Stable</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">All your assigned subject educators are active at Phakamani Secondary. No Continuity substitute plans are currently required.</p>
            </div>
          )}

          {/* Immersive Slide Player */}
          {activeLesson && (
            <div className="bg-[#0c0e14] rounded-sm overflow-hidden shadow-2xl border border-white/10 text-white flex flex-col" id="immersive-lesson-player">
              {/* Header Bar */}
              <div className="bg-[#080a0f] px-5 py-4 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-sky-500/10 text-sky-400 p-1.5 rounded-sm border border-sky-500/20">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-serif italic text-white">{activeLesson.title}</h2>
                    <span className="text-[10px] text-slate-500 font-mono">ClassBridge AI Continuity Learning Module</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveLesson(null)}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold px-3.5 py-1.5 rounded-sm border border-white/10 transition"
                >
                  Exit Lesson
                </button>
              </div>

              {/* Player Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
                {/* Slide View Container */}
                <div className="lg:col-span-8 bg-[#050608] p-6 flex flex-col justify-between relative border-r border-white/5">
                  <div className="absolute top-4 left-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    Slide {currentSlideIndex + 1} of {activeLesson.slides.length}
                  </div>

                  {/* Render chalkboard content */}
                  <div className="my-auto py-8 text-center space-y-6 max-w-lg mx-auto">
                    <h3 className="text-xl md:text-2xl font-serif italic text-sky-400 leading-tight">
                      {activeLesson.slides[currentSlideIndex].title}
                    </h3>
                    <ul className="text-left space-y-3.5 text-xs md:text-sm text-slate-300 pl-4 list-disc">
                      {activeLesson.slides[currentSlideIndex].bulletPoints.map((point, i) => (
                        <li key={i} className="leading-relaxed">{point}</li>
                      ))}
                    </ul>

                    {/* Graphic/Diagram descriptor box */}
                    <div className="p-3 bg-[#0c0e14] border border-white/5 rounded-sm text-left text-xs text-slate-400 space-y-1">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-sky-400">whiteboard visual graphic</span>
                      <p className="italic text-slate-500">"{activeLesson.slides[currentSlideIndex].visualDescription}"</p>
                    </div>
                  </div>

                  {/* Navigation Footer */}
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <button
                      onClick={handlePrevSlide}
                      disabled={currentSlideIndex === 0}
                      className="bg-[#0c0e14] hover:bg-[#080a0f] disabled:opacity-30 text-slate-300 font-bold text-xs px-3.5 py-2 rounded-sm border border-white/5 flex items-center gap-1 transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>

                    <div className="flex gap-1.5">
                      {activeLesson.slides.map((_, idx) => (
                        <span 
                          key={idx} 
                          className={`w-2 h-2 rounded-sm transition-all ${
                            idx === currentSlideIndex ? 'bg-sky-400 w-4' : 'bg-white/10'
                          }`}
                        ></span>
                      ))}
                    </div>

                    <button
                      onClick={handleNextSlide}
                      disabled={currentSlideIndex === activeLesson.slides.length - 1}
                      className="bg-sky-500 hover:bg-sky-400 disabled:opacity-30 text-black font-extrabold text-xs px-3.5 py-2 rounded-sm flex items-center gap-1 transition shadow-lg shadow-sky-500/10"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Narrated Audio Walkthrough Column */}
                <div className="lg:col-span-4 bg-[#080a0f]/60 p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                      <Volume2 className="w-4 h-4 text-sky-400" />
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">AI Narrator Audio Controller</h4>
                    </div>

                    {/* Equalizer animation wave */}
                    <div className="flex justify-center items-center h-16 gap-1 bg-[#050608] rounded-sm border border-white/5">
                      {[...Array(isPlayingAudio ? 12 : 5)].map((_, i) => (
                        <span 
                          key={i} 
                          className="w-1 bg-sky-400 rounded-full transition-all duration-300"
                          style={{ 
                            height: isPlayingAudio ? `${Math.floor(Math.random() * 40) + 10}px` : '15px',
                            animationName: isPlayingAudio ? 'wave' : 'none',
                            animationDuration: '1s',
                            animationTimingFunction: 'ease-in-out',
                            animationIterationCount: 'infinite',
                            animationDirection: 'alternate',
                            animationDelay: `${i * 0.1}s`
                          }}
                        ></span>
                      ))}
                    </div>

                    {/* Play buttons */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          className="bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-[10px] uppercase tracking-wider py-2 px-4 rounded-sm flex items-center gap-2 shadow-lg shadow-sky-500/10 transition"
                        >
                          {isPlayingAudio ? (
                            <>
                              <Pause className="w-3 h-3 fill-current" /> Pause Walkthrough
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" /> Play Walkthrough
                            </>
                          )}
                        </button>
                        <span className="text-xs text-slate-500 font-mono">
                          {Math.floor(audioProgress)}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-[#050608] rounded-sm h-1 overflow-hidden border border-white/5">
                        <div 
                          className="bg-sky-400 h-full transition-all duration-300"
                          style={{ width: `${audioProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Speech script scrolling */}
                  <div className="bg-[#050608] border border-white/5 rounded-sm p-4 flex-1 overflow-y-auto max-h-[160px] space-y-2">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-sky-400 block font-mono">Narration Script Transcripts</span>
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      {isPlayingAudio ? (
                        <>"{activeLesson.narratedWalkthrough}"</>
                      ) : (
                        "Click Play Walkthrough to listen to the AI-narrator guide you through this slide's core formulas, definitions, and curriculum reference details."
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Self-Check Mini Quiz Section (Triggered at last slide) */}
              {currentSlideIndex === activeLesson.slides.length - 1 && (
                <div className="bg-[#080a0f] border-t border-white/5 p-6 space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sky-400" />
                    <h3 className="font-serif italic text-base text-white">Continuity Check-For-Understanding Mini Quiz</h3>
                  </div>

                  <div className="space-y-4">
                    {currentQuiz.map((quiz, qIdx) => (
                      <div key={qIdx} className="bg-[#050608] p-4 rounded-sm border border-white/5 space-y-3 text-xs">
                        <p className="font-bold text-slate-200">Question {qIdx + 1}: {quiz.q}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {quiz.options.map((opt, oIdx) => {
                            const isSelected = selectedQuizAnswers[qIdx] === oIdx;
                            const isCorrect = oIdx === quiz.correct;
                            return (
                              <button
                                key={oIdx}
                                disabled={quizSubmitted}
                                onClick={() => setSelectedQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                className={`p-2.5 rounded-sm text-left font-semibold transition border ${
                                  quizSubmitted
                                    ? isCorrect 
                                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' 
                                      : isSelected 
                                        ? 'bg-red-950/40 border-red-500 text-red-300' 
                                        : 'bg-[#050608] border-white/5 text-slate-600'
                                    : isSelected 
                                      ? 'bg-sky-500 border-sky-500 text-black font-extrabold' 
                                      : 'bg-[#0c0e14] border-white/5 hover:border-white/10 text-slate-300'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && selectedQuizAnswers[qIdx] !== undefined && (
                          <p className="text-[11px] text-sky-400 mt-2 italic leading-relaxed">
                            <span className="font-bold uppercase tracking-wider not-italic text-[9px] bg-sky-950 border border-sky-500/20 px-1.5 py-0.5 rounded mr-1">Feedback</span>
                            {quiz.explanation}
                          </p>
                        )}
                      </div>
                    ))}

                    <div className="flex justify-end pt-2">
                      {!quizSubmitted ? (
                        <button
                          onClick={() => setQuizSubmitted(true)}
                          disabled={Object.keys(selectedQuizAnswers).length < currentQuiz.length}
                          className="bg-sky-500 hover:bg-sky-400 disabled:opacity-30 text-black font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-6 rounded-sm shadow-lg shadow-sky-500/10 transition"
                        >
                          Submit Quiz Answers
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedQuizAnswers({});
                            setQuizSubmitted(false);
                          }}
                          className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-[10px] uppercase tracking-wider py-2.5 px-6 rounded-sm border border-white/10 transition"
                        >
                          Try Again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Grades & Academic Records */}
      {activeSubTab === 'grades' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="panel-grades">
          {/* Diagnostic Stats Cards */}
          <div className="md:col-span-1 space-y-6">
            {/* Attendance Progress Card */}
            <div className="bg-[#0c0e14] p-5 rounded-sm border border-white/5 space-y-4">
              <h3 className="font-mono text-slate-500 text-[10px] uppercase tracking-wider">Diagnostic Attendance Rate</h3>
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-serif italic tracking-tight text-white">{currentStudent.attendancePercent}%</span>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                  currentStudent.attendancePercent >= 90 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  {currentStudent.attendancePercent >= 90 ? 'Ideal Attendance' : 'At Risk'}
                </span>
              </div>
              <div className="w-full bg-[#050608] h-1.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full ${
                    currentStudent.attendancePercent >= 90 ? 'bg-emerald-500' :
                    currentStudent.attendancePercent >= 80 ? 'bg-amber-500' : 'bg-red-500'
                  }`} 
                  style={{ width: `${currentStudent.attendancePercent}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                South African continuous assessment regulations dictate learners maintain attendance rates above 90% to avoid progress reviews.
              </p>
            </div>

            {/* Conduct / Merit Progress Card */}
            <div className="bg-[#0c0e14] p-5 rounded-sm border border-white/5 space-y-4">
              <h3 className="font-mono text-slate-500 text-[10px] uppercase tracking-wider">Classroom Conduct Registry</h3>
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-serif italic tracking-tight text-white">{currentStudent.conductScore}/120</span>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                  currentStudent.conductScore >= 100 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  {currentStudent.conductScore >= 100 ? 'Exemplary' : 'Check Log'}
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Merit points logged for leadership and community service boost conduct registries; infractions pull modifiers downward.
              </p>
            </div>
          </div>

          {/* Test scores tables */}
          <div className="md:col-span-2 bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl">
            <h3 className="font-serif italic text-white text-base mb-4">Continuous Assessment Tasks (CASS) Term 2</h3>
            
            {studentMarks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No formal continuous assessment marks have been logged in the portal yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 font-mono text-[10px] uppercase tracking-wider font-bold pb-2">
                      <th className="pb-3">Assessment Name</th>
                      <th className="pb-3">Subject</th>
                      <th className="pb-3 text-center">Score</th>
                      <th className="pb-3 text-center">Percentage</th>
                      <th className="pb-3 text-right">Date Captured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {studentMarks.map((mark) => {
                      const percent = Math.round((mark.markValue / mark.maxMark) * 100);
                      return (
                        <tr key={mark.id} className="hover:bg-white/5 transition">
                          <td className="py-3 font-bold text-slate-200">{mark.testName}</td>
                          <td className="py-3 text-slate-400 font-medium">{mark.subject}</td>
                          <td className="py-3 text-center font-semibold text-slate-300 font-mono">{mark.markValue} / {mark.maxMark}</td>
                          <td className="py-3 text-center">
                            <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded-sm border ${
                              percent >= 70 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              percent >= 50 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                              'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                              {percent}%
                            </span>
                          </td>
                          <td className="py-3 text-right text-slate-500 font-mono">{mark.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Timetable */}
      {activeSubTab === 'timetable' && (
        <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 shadow-2xl" id="panel-timetable">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-serif italic text-white text-base">Grade {currentStudent.grade} Pacing Timetable</h3>
              <p className="text-slate-400 text-xs">Standard academic day structure. Continuity catch-up blocks flash in red if the educator has been marked absent today.</p>
            </div>
            <span className="bg-[#050608] border border-white/5 text-slate-400 font-bold px-3 py-1 rounded-sm text-xs font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" /> Term 2
            </span>
          </div>

          <div className="space-y-3">
            {mockTimetable.map((slot, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-sm border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition ${
                  slot.activeAbsent 
                    ? 'border-red-900/40 bg-red-950/5 hover:border-red-900/60' 
                    : 'border-white/5 bg-[#050608] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-[#0c0e14] p-2 rounded-sm text-slate-400 border border-white/5 shrink-0 text-[10px] font-bold font-mono">
                    P{i+1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                      {slot.subject}
                      {slot.activeAbsent && (
                        <span className="bg-red-500/10 border border-red-500/25 text-red-400 font-mono text-[9px] px-2 py-0.5 rounded-sm flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Continuity Mode Active
                        </span>
                      )}
                    </h4>
                    <p className="text-slate-500 text-xs mt-0.5">{slot.period} • {slot.educator}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs font-medium flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" /> {slot.venue}
                  </span>
                  
                  {slot.activeAbsent && (
                    <button
                      onClick={() => {
                        const matchingLesson = state.generatedLessons.find(lesson => {
                          const t = state.teachers.find(teacher => teacher.id === lesson.teacherId);
                          return t && t.subject.toLowerCase().includes(slot.subject.toLowerCase());
                        });
                        if (matchingLesson) {
                          setActiveSubTab('lessons');
                          startLesson(matchingLesson);
                        } else {
                          alert(`The Continuity Lesson Plan for ${slot.subject} has not been compiled by the Admin yet. Please alert your educator or school administration.`);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white font-extrabold uppercase tracking-wider text-[10px] py-2 px-3.5 rounded-sm transition"
                    >
                      Access Catch-Up Lesson
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Wave keyframe CSS for Narrator Animation */}
      <style>{`
        @keyframes wave {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}
