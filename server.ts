/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

// Load environment variables
dotenv.config();

import { 
  Student, 
  Teacher, 
  Mark, 
  Attendance, 
  BehaviourLog, 
  LessonPlan, 
  GeneratedLesson, 
  Message, 
  SchoolStats,
  FeePayment,
  TutoringBooking,
  SchoolRules,
  TransitAlert
} from './src/types';

import { 
  SEED_STUDENTS, 
  SEED_TEACHERS, 
  SEED_LESSON_PLANS, 
  SEED_MARKS, 
  SEED_ATTENDANCE, 
  SEED_BEHAVIOUR_LOGS, 
  SEED_MESSAGES,
  SEED_RULES
} from './src/data/seedData';

import { 
  seedDatabaseIfEmpty, 
  getFullSchoolState, 
  updateTeacherStatus, 
  saveMessage as saveMessageDb, 
  addStudentMark, 
  addAttendanceLog as addAttendanceDb, 
  addBehaviourLog as addBehaviourDb, 
  saveGeneratedLesson as saveGeneratedLessonDb, 
  recordFeePayment, 
  recordTutoringBooking, 
  createTransitAlert 
} from './src/db/operations.ts';

// Persistent Local JSON Storage Configuration (as secondary cache / local fallback)
const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'school_state.json');

interface PersistedData {
  students: Student[];
  teachers: Teacher[];
  lessonPlans: LessonPlan[];
  marks: Mark[];
  attendanceLogs: Attendance[];
  behaviourLogs: BehaviourLog[];
  generatedLessons: GeneratedLesson[];
  messages: Message[];
  schoolRules: SchoolRules;
  feePayments: FeePayment[];
  tutoringBookings: TutoringBooking[];
  transitAlerts?: TransitAlert[];
}

function getDefaultState(): PersistedData {
  return {
    students: JSON.parse(JSON.stringify(SEED_STUDENTS)),
    teachers: JSON.parse(JSON.stringify(SEED_TEACHERS)),
    lessonPlans: JSON.parse(JSON.stringify(SEED_LESSON_PLANS)),
    marks: JSON.parse(JSON.stringify(SEED_MARKS)),
    attendanceLogs: JSON.parse(JSON.stringify(SEED_ATTENDANCE)),
    behaviourLogs: JSON.parse(JSON.stringify(SEED_BEHAVIOUR_LOGS)),
    generatedLessons: [],
    messages: JSON.parse(JSON.stringify(SEED_MESSAGES)),
    schoolRules: JSON.parse(JSON.stringify(SEED_RULES)),
    feePayments: [],
    tutoringBookings: [],
    transitAlerts: []
  };
}

function loadPersistedState(): PersistedData {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.teachers)) {
        return {
          students: parsed.students,
          teachers: parsed.teachers,
          lessonPlans: Array.isArray(parsed.lessonPlans) ? parsed.lessonPlans : JSON.parse(JSON.stringify(SEED_LESSON_PLANS)),
          marks: Array.isArray(parsed.marks) ? parsed.marks : JSON.parse(JSON.stringify(SEED_MARKS)),
          attendanceLogs: Array.isArray(parsed.attendanceLogs) ? parsed.attendanceLogs : JSON.parse(JSON.stringify(SEED_ATTENDANCE)),
          behaviourLogs: Array.isArray(parsed.behaviourLogs) ? parsed.behaviourLogs : JSON.parse(JSON.stringify(SEED_BEHAVIOUR_LOGS)),
          generatedLessons: Array.isArray(parsed.generatedLessons) ? parsed.generatedLessons : [],
          messages: Array.isArray(parsed.messages) ? parsed.messages : JSON.parse(JSON.stringify(SEED_MESSAGES)),
          schoolRules: parsed.schoolRules || JSON.parse(JSON.stringify(SEED_RULES)),
          feePayments: Array.isArray(parsed.feePayments) ? parsed.feePayments : [],
          tutoringBookings: Array.isArray(parsed.tutoringBookings) ? parsed.tutoringBookings : [],
          transitAlerts: Array.isArray(parsed.transitAlerts) ? parsed.transitAlerts : []
        };
      }
    }
  } catch (err) {
    console.warn('Could not read existing state file, initializing from seed defaults:', err);
  }

  const def = getDefaultState();
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(def, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to initialize persistent state file:', err);
  }
  return def;
}

// Active in-memory cache synchronized with PostgreSQL
const initialData = loadPersistedState();
let students = initialData.students;
let teachers = initialData.teachers;
let lessonPlans = initialData.lessonPlans;
let marks = initialData.marks;
let attendanceLogs = initialData.attendanceLogs;
let behaviourLogs = initialData.behaviourLogs;
let generatedLessons = initialData.generatedLessons;
let messages = initialData.messages;
let schoolRules = initialData.schoolRules;
let feePayments = initialData.feePayments;
let tutoringBookings = initialData.tutoringBookings;
let transitAlertsList: TransitAlert[] = initialData.transitAlerts || [];

function savePersistedState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const dataToSave: PersistedData = {
      students,
      teachers,
      lessonPlans,
      marks,
      attendanceLogs,
      behaviourLogs,
      generatedLessons,
      messages,
      schoolRules,
      feePayments,
      tutoringBookings,
      transitAlerts: transitAlertsList
    };
    const tmpFile = `${STORAGE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STORAGE_FILE);
  } catch (err) {
    console.error('Error saving persistent state to disk:', err);
  }
}

// Server-Sent Events (SSE) Client Registry
const sseClients = new Set<Response>();

function broadcastSSE(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  });
}

// Help lazy-load Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      console.warn('GEMINI_API_KEY is not configured or using default placeholder. AI features will run with high-quality simulated fallbacks.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Recalculate Risk Scores dynamically based on marks, attendance, and behaviour logs
function updateStudentRiskMetrics() {
  students.forEach(student => {
    // 1. Calculate dynamic average mark
    const studentMarks = marks.filter(m => m.studentId === student.id);
    let avgMark = student.averageMark;
    let decliningTrend = false;
    
    if (studentMarks.length > 0) {
      const sum = studentMarks.reduce((acc, m) => acc + m.markValue, 0);
      avgMark = Math.round(sum / studentMarks.length);
      
      const sortedMaths = studentMarks
        .filter(m => m.subject === 'Mathematics')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
      if (sortedMaths.length >= 2) {
        if (sortedMaths[sortedMaths.length - 1].markValue < sortedMaths[sortedMaths.length - 2].markValue) {
          decliningTrend = true;
        }
      }
    }
    student.averageMark = avgMark;

    // 2. Calculate dynamic attendance percent
    const studentAtt = attendanceLogs.filter(a => a.studentId === student.id);
    const baseDays = 20;
    const basePresent = Math.round(baseDays * (student.id === 'stud-1' ? 0.78 : student.id === 'stud-4' ? 0.70 : student.id === 'stud-3' ? 0.92 : 0.98));
    
    const addedPresent = studentAtt.filter(a => a.status === 'Present').length;
    const addedAbsent = studentAtt.filter(a => a.status === 'Absent').length;
    
    const totalPresent = basePresent + addedPresent;
    const totalDays = baseDays + addedPresent + addedAbsent;
    student.attendancePercent = Math.round((totalPresent / totalDays) * 100);

    // 3. Calculate dynamic conduct score
    const studentLogs = behaviourLogs.filter(b => b.studentId === student.id);
    let conduct = 100;
    studentLogs.forEach(log => {
      conduct += log.points;
    });
    student.conductScore = Math.max(0, Math.min(120, conduct));

    // 4. Score risk metrics
    let marksRiskScore = 0;
    if (avgMark >= 80) marksRiskScore = 0;
    else if (avgMark >= 50) marksRiskScore = ((80 - avgMark) / 30) * 100;
    else marksRiskScore = 100;
    
    if (decliningTrend) {
      marksRiskScore = Math.min(100, marksRiskScore + 15);
    }

    let attRiskScore = 0;
    if (student.attendancePercent >= 95) attRiskScore = 0;
    else if (student.attendancePercent >= 75) attRiskScore = ((95 - student.attendancePercent) / 20) * 100;
    else attRiskScore = 100;

    let conductRiskScore = 0;
    if (student.conductScore >= 100) conductRiskScore = 0;
    else if (student.conductScore >= 60) conductRiskScore = ((100 - student.conductScore) / 40) * 100;
    else conductRiskScore = 100;

    const riskScore = Math.round((marksRiskScore * 0.40) + (attRiskScore * 0.30) + (conductRiskScore * 0.30));
    student.riskScore = Math.max(0, Math.min(100, riskScore));

    if (student.riskScore >= 70) {
      student.riskLevel = 'High';
    } else if (student.riskScore >= 40) {
      student.riskLevel = 'Medium';
    } else {
      student.riskLevel = 'Low';
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Bootstrap PostgreSQL Database using Drizzle ORM
  try {
    await seedDatabaseIfEmpty();
    const pgState = await getFullSchoolState();
    if (pgState.students.length > 0) {
      students = pgState.students;
      teachers = pgState.teachers;
      lessonPlans = pgState.lessonPlans;
      generatedLessons = pgState.generatedLessons;
      marks = pgState.marks;
      attendanceLogs = pgState.attendanceLogs;
      behaviourLogs = pgState.behaviourLogs;
      messages = pgState.messages;
      feePayments = pgState.feePayments;
      tutoringBookings = pgState.tutoringBookings;
      transitAlertsList = pgState.transitAlerts.map(ta => ({
        id: ta.id,
        driverName: ta.driverName,
        route: ta.route,
        reason: ta.reason,
        estimatedDelayMinutes: ta.estimatedDelayMinutes,
        timestamp: ta.timestamp
      }));
      updateStudentRiskMetrics();
      savePersistedState();
      console.log('ClassBridge AI synchronized with PostgreSQL database via Drizzle ORM.');
    }
  } catch (err) {
    console.warn('Initial PostgreSQL synchronization notice (running with resilient local state fallback):', err);
  }

  // Server-Sent Events (SSE) Route for Real-time Notifications & Transit Alerts
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.add(res);

    // Initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clients: sseClients.size })}\n\n`);

    // Keepalive ping every 25 seconds
    const interval = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(interval);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(interval);
      sseClients.delete(res);
    });
  });

  // GET State
  app.get('/api/state', (req, res) => {
    updateStudentRiskMetrics();
    
    // Calculate global stats
    const absentTeachersCount = teachers.filter(t => t.status === 'Absent').length;
    const atRiskStudentsCount = students.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Medium').length;
    const avgAttendance = Math.round(students.reduce((acc, s) => acc + s.attendancePercent, 0) / (students.length || 1));

    const stats: SchoolStats = {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      absentTeachersCount,
      atRiskStudentsCount,
      averageAttendance: avgAttendance
    };

    res.json({
      students,
      teachers,
      lessonPlans,
      marks,
      attendanceLogs,
      behaviourLogs,
      generatedLessons,
      messages,
      schoolRules,
      feePayments,
      tutoringBookings,
      transitAlerts: transitAlertsList,
      stats
    });
  });

  // RESET State to seed defaults
  app.post('/api/state/reset', (req, res) => {
    const def = getDefaultState();
    students = def.students;
    teachers = def.teachers;
    lessonPlans = def.lessonPlans;
    marks = def.marks;
    attendanceLogs = def.attendanceLogs;
    behaviourLogs = def.behaviourLogs;
    generatedLessons = def.generatedLessons;
    messages = def.messages;
    schoolRules = def.schoolRules;
    feePayments = def.feePayments;
    tutoringBookings = def.tutoringBookings;
    transitAlertsList = [];
    updateStudentRiskMetrics();
    savePersistedState();

    broadcastSSE('state_reset', { message: 'School database reset to initial seeds' });
    res.json({ success: true, message: 'State successfully reset to seed defaults' });
  });

  // Toggle teacher attendance
  app.post('/api/teachers/toggle', async (req, res) => {
    const { teacherId, status } = req.body;
    if (!teacherId || typeof teacherId !== 'string') {
      return res.status(400).json({ error: 'Valid teacherId is required.' });
    }
    if (status !== 'Active' && status !== 'Absent') {
      return res.status(400).json({ error: "Teacher status must be strictly 'Active' or 'Absent'." });
    }
    const teacher = teachers.find(t => t.id === teacherId.trim());
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found in faculty directory.' });
    }

    teacher.status = status;
    teacher.absentSince = status === 'Absent' ? new Date().toLocaleDateString('en-ZA') : undefined;
    savePersistedState();

    // Async sync to PostgreSQL via Drizzle ORM
    updateTeacherStatus(teacher.id, status).catch(err => {
      console.warn('PostgreSQL educator status sync notice:', err.message);
    });

    // Real-time broadcast
    broadcastSSE('teacher_toggle', {
      teacherId: teacher.id,
      name: teacher.name,
      status: teacher.status,
      subject: teacher.subject,
      grade: teacher.grade
    });

    res.json({ success: true, teacher });
  });

  // Add marks log with strict boundary sanitization (0 - 100)
  app.post('/api/logs/mark', async (req, res) => {
    const { studentId, subject, testName, markValue, maxMark } = req.body;

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ error: 'Valid studentId is required.' });
    }
    const student = students.find(s => s.id === studentId.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found in school records.' });
    }

    const cleanSubject = typeof subject === 'string' ? subject.trim().slice(0, 100) : '';
    if (!cleanSubject) {
      return res.status(400).json({ error: 'Assessment subject is required.' });
    }

    const cleanTestName = typeof testName === 'string' ? testName.trim().slice(0, 150) : '';
    if (!cleanTestName) {
      return res.status(400).json({ error: 'Assessment test name is required.' });
    }

    const parsedMax = Number(maxMark);
    if (isNaN(parsedMax) || !isFinite(parsedMax) || parsedMax <= 0 || parsedMax > 100) {
      return res.status(400).json({ error: 'Maximum mark must be a valid number between 1 and 100.' });
    }

    const parsedVal = Number(markValue);
    if (isNaN(parsedVal) || !isFinite(parsedVal) || parsedVal < 0 || parsedVal > parsedMax) {
      return res.status(400).json({ 
        error: `Assessment mark must be a valid number between 0 and the maximum mark of ${parsedMax} (and within standard 0-100% threshold).` 
      });
    }

    const newMark: Mark = {
      id: `mark-${Date.now()}`,
      studentId: student.id,
      subject: cleanSubject,
      testName: cleanTestName,
      markValue: Math.round(parsedVal * 10) / 10,
      maxMark: Math.round(parsedMax),
      date: new Date().toISOString().split('T')[0],
      term: 2
    };

    marks.push(newMark);
    updateStudentRiskMetrics();
    savePersistedState();

    // Async sync to PostgreSQL via Drizzle ORM
    addStudentMark(student.id, cleanSubject, cleanTestName, newMark.markValue, newMark.maxMark).catch(err => {
      console.warn('PostgreSQL assessment mark sync notice:', err.message);
    });

    // Real-time broadcast
    broadcastSSE('mark_added', {
      studentId: student.id,
      studentName: student.name,
      subject: cleanSubject,
      markValue: newMark.markValue,
      maxMark: newMark.maxMark,
      riskScore: student.riskScore,
      riskLevel: student.riskLevel
    });

    res.json({ success: true, mark: newMark });
  });

  // Add attendance log with boundary check and reason sanitization
  app.post('/api/logs/attendance', async (req, res) => {
    const { studentId, status, reason } = req.body;

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ error: 'Valid studentId is required.' });
    }
    const student = students.find(s => s.id === studentId.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found in school records.' });
    }

    if (status !== 'Present' && status !== 'Absent') {
      return res.status(400).json({ error: "Attendance status must be strictly 'Present' or 'Absent'." });
    }

    let cleanReason: string | undefined = undefined;
    if (typeof reason === 'string' && reason.trim()) {
      cleanReason = reason
        .trim()
        .replace(/<[^>]*>?/gm, '')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .slice(0, 200);
    }

    const newAtt: Attendance = {
      id: `att-${Date.now()}`,
      studentId: student.id,
      date: new Date().toISOString().split('T')[0],
      status,
      reason: cleanReason
    };

    attendanceLogs.push(newAtt);
    updateStudentRiskMetrics();
    savePersistedState();

    // Async sync to PostgreSQL via Drizzle ORM
    addAttendanceDb(student.id, status, cleanReason).catch(err => {
      console.warn('PostgreSQL attendance sync notice:', err.message);
    });

    // Real-time broadcast
    broadcastSSE('attendance_logged', {
      studentId: student.id,
      studentName: student.name,
      status,
      attendancePercent: student.attendancePercent,
      riskScore: student.riskScore
    });

    res.json({ success: true, attendance: newAtt });
  });

  // Add behaviour log with sanitization
  app.post('/api/logs/behaviour', async (req, res) => {
    const { studentId, category, description, points } = req.body;

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ error: 'Valid studentId is required.' });
    }
    const student = students.find(s => s.id === studentId.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found in school records.' });
    }

    if (category !== 'Positive' && category !== 'Concern') {
      return res.status(400).json({ error: "Behaviour category must be strictly 'Positive' or 'Concern'." });
    }

    const cleanDesc = typeof description === 'string' 
      ? description.trim().replace(/<[^>]*>?/gm, '').slice(0, 300) 
      : '';
    if (!cleanDesc) {
      return res.status(400).json({ error: 'Behaviour description is required.' });
    }

    const parsedPoints = Number(points);
    if (isNaN(parsedPoints) || !isFinite(parsedPoints)) {
      return res.status(400).json({ error: 'Points modifier must be a valid numeric value.' });
    }
    const clampedPoints = Math.max(-100, Math.min(100, Math.round(parsedPoints)));

    const newLog: BehaviourLog = {
      id: `log-${Date.now()}`,
      studentId: student.id,
      category,
      description: cleanDesc,
      date: new Date().toISOString().split('T')[0],
      points: clampedPoints
    };

    behaviourLogs.push(newLog);
    updateStudentRiskMetrics();
    savePersistedState();

    // Async sync to PostgreSQL via Drizzle ORM
    addBehaviourDb(student.id, category, cleanDesc, clampedPoints).catch(err => {
      console.warn('PostgreSQL conduct log sync notice:', err.message);
    });

    // Real-time broadcast
    broadcastSSE('behaviour_logged', {
      studentId: student.id,
      studentName: student.name,
      category,
      points: clampedPoints,
      conductScore: student.conductScore
    });

    res.json({ success: true, log: newLog });
  });

  // Save draft message or send message with persistence
  app.post('/api/messages/save', async (req, res) => {
    const { studentId, title, body, status } = req.body;

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ error: 'Valid studentId is required.' });
    }
    const student = students.find(s => s.id === studentId.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found in school records.' });
    }

    const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 200) : 'Advisory Alert';
    const cleanBody = typeof body === 'string' ? body.trim().slice(0, 5000) : '';
    const cleanStatus: 'Draft' | 'Sent' = status === 'Sent' ? 'Sent' : 'Draft';
    
    const existingIdx = messages.findIndex(m => m.studentId === student.id && m.status === 'Draft');
    
    const messageData: Message = {
      id: existingIdx >= 0 ? messages[existingIdx].id : `msg-${Date.now()}`,
      studentId: student.id,
      title: cleanTitle,
      body: cleanBody,
      status: cleanStatus,
      dateDrafted: existingIdx >= 0 ? messages[existingIdx].dateDrafted : new Date().toISOString().split('T')[0],
      dateSent: cleanStatus === 'Sent' ? new Date().toISOString().split('T')[0] : undefined
    };

    if (existingIdx >= 0) {
      messages[existingIdx] = messageData;
    } else {
      messages.push(messageData);
    }

    savePersistedState();

    // Async sync to PostgreSQL via Drizzle ORM
    saveMessageDb(student.id, cleanTitle, cleanBody, cleanStatus).catch(err => {
      console.warn('PostgreSQL message sync notice:', err.message);
    });

    // Real-time broadcast
    broadcastSSE('message_saved', {
      studentId: student.id,
      studentName: student.name,
      title: cleanTitle,
      status: cleanStatus
    });

    res.json({ success: true, message: messageData });
  });

  // Record parent fee payment with persistent storage
  app.post('/api/fees/pay', async (req, res) => {
    const { studentId, feeTitle, amount, cardholderName } = req.body;
    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ error: 'Valid studentId is required.' });
    }
    const student = students.find(s => s.id === studentId.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found in school records.' });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid fee payment amount is required.' });
    }

    const cleanFeeTitle = typeof feeTitle === 'string' && feeTitle.trim() 
      ? feeTitle.trim().slice(0, 150) 
      : 'Phakamani High School Fee';
    const cleanCardholder = typeof cardholderName === 'string' && cardholderName.trim()
      ? cardholderName.trim().slice(0, 100)
      : student.parentName;

    const payment: FeePayment = {
      id: `pay-${Date.now()}`,
      studentId: student.id,
      cardholderName: cleanCardholder,
      parentName: cleanCardholder,
      feeTitle: cleanFeeTitle,
      amount: Math.round(parsedAmount * 100) / 100,
      paymentDate: new Date().toISOString().split('T')[0],
      date: new Date().toISOString().split('T')[0],
      reference: `PHK-${Date.now().toString().slice(-6)}`,
      status: 'Settled'
    };

    feePayments.push(payment);
    savePersistedState();

    // Async sync to PostgreSQL via Drizzle ORM
    recordFeePayment(student.id, cleanFeeTitle, payment.amount, cleanCardholder).catch(err => {
      console.warn('PostgreSQL fee payment sync notice:', err.message);
    });

    // Real-time broadcast
    broadcastSSE('fee_paid', {
      studentId: student.id,
      studentName: student.name,
      feeTitle: cleanFeeTitle,
      amount: payment.amount,
      cardholder: cleanCardholder
    });

    res.json({ success: true, payment });
  });

  // Record compulsory tutoring booking with persistent storage
  app.post('/api/tutoring/book', async (req, res) => {
    const { studentId, messageId } = req.body;
    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ error: 'Valid studentId is required.' });
    }
    const student = students.find(s => s.id === studentId.trim());
    if (!student) {
      return res.status(404).json({ error: 'Student not found in school records.' });
    }

    const cleanMsgId = typeof messageId === 'string' ? messageId.trim() : `msg-${Date.now()}`;
    const booking: TutoringBooking = {
      id: `book-${Date.now()}`,
      studentId: student.id,
      messageId: cleanMsgId,
      bookingDate: new Date().toISOString().split('T')[0],
      dateBooked: new Date().toISOString().split('T')[0],
      status: 'Confirmed',
      sessionTime: 'Monday - Thursday (14:30 - 15:30) • Room 14'
    };

    if (!tutoringBookings.some(b => b.studentId === student.id && b.messageId === cleanMsgId)) {
      tutoringBookings.push(booking);
      savePersistedState();

      // Async sync to PostgreSQL via Drizzle ORM
      recordTutoringBooking(student.id, cleanMsgId).catch(err => {
        console.warn('PostgreSQL tutoring booking sync notice:', err.message);
      });

      // Real-time broadcast
      broadcastSSE('tutoring_booked', {
        studentId: student.id,
        studentName: student.name,
        messageId: cleanMsgId
      });
    }

    res.json({ success: true, booking });
  });

  // Real-Time Transit Delay Notification (Transport Driver Terminal)
  app.post('/api/driver/delay', async (req, res) => {
    const { driverName, route, reason, estimatedDelayMinutes } = req.body;

    const cleanDriver = typeof driverName === 'string' && driverName.trim() ? driverName.trim() : 'Baba Sipho';
    const cleanRoute = typeof route === 'string' && route.trim() ? route.trim() : 'Soweto Route A • Phakamani High Bus #4';
    const cleanReason = typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 200) : 'Traffic congestion on transit route';
    const delayMins = Math.max(5, Math.min(120, Number(estimatedDelayMinutes) || 15));

    const now = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const alert: TransitAlert = {
      id: `alert-${Date.now()}`,
      driverName: cleanDriver,
      route: cleanRoute,
      reason: cleanReason,
      estimatedDelayMinutes: delayMins,
      timestamp: `${now} SAST`
    };

    transitAlertsList.unshift(alert);
    if (transitAlertsList.length > 20) {
      transitAlertsList.pop();
    }
    savePersistedState();

    // Async sync to PostgreSQL via Drizzle ORM
    createTransitAlert(cleanDriver, cleanRoute, cleanReason, delayMins).catch(err => {
      console.warn('PostgreSQL transit alert sync notice:', err.message);
    });

    // Broadcast instantaneously to all portals (Admin, Student, Parent, Driver)
    broadcastSSE('transit_delay', alert);

    res.json({ success: true, alert });
  });

  // Continuity Mode: Generate substitute lesson via Gemini API
  app.post('/api/generate-lesson', async (req, res) => {
    const { teacherId, lessonPlanId } = req.body;
    
    const teacher = teachers.find(t => t.id === teacherId);
    const plan = lessonPlans.find(p => p.id === lessonPlanId);
    
    if (!teacher || !plan) {
      return res.status(404).json({ error: 'Teacher or Lesson Plan not found' });
    }

    const promptText = `
You are a highly experienced South African High School substitute teaching assistant powered by ClassBridge AI.
Generate a structured, highly engaging substitute lesson based on the following CAPS curriculum topic:

Grade: ${plan.grade}
Subject: ${plan.subject}
Topic: ${plan.topic}
Curriculum Guidelines: ${plan.standardNotes}
Curriculum Reference: ${plan.curriculumReference}
Original Teacher: ${teacher.name}

You must respond with a clean, parsed JSON object matching this schema:
{
  "title": "A captivating, South African context-oriented title for the substitute lesson",
  "keyPoints": [
    "A list of 3 to 4 clear, essential conceptual takeaways for the learners"
  ],
  "script": "A detailed, written substitute teacher lecture script (approx 400 words) speaking directly to the learners in an encouraging, friendly South African tone (using words like 'Good day Grade 12s', 'Let us dive in', 'Remember, this is crucial for your trials/matric exams'). Include simple checks for understanding.",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "visualDescription": "Actionable description of the diagram or chart displayed on blackboard/projector"
    }
  ],
  "narratedWalkthrough": "A concise, engaging 150-word audio walkthrough summarizing the key conceptual mechanics that can be read aloud using text-to-speech."
}

Ensure the response contains ONLY the valid JSON, with no markdown wrappers or text before/after.
`;

    try {
      const ai = getAiClient();
      const apiKey = process.env.GEMINI_API_KEY;
      
      let generatedData;

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        console.log(`Calling Gemini API for Lesson Plan: ${plan.topic}`);
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                keyPoints: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                script: { type: Type.STRING },
                slides: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      slideNumber: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      bulletPoints: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      visualDescription: { type: Type.STRING }
                    },
                    required: ['slideNumber', 'title', 'bulletPoints', 'visualDescription']
                  }
                },
                narratedWalkthrough: { type: Type.STRING }
              },
              required: ['title', 'keyPoints', 'script', 'slides', 'narratedWalkthrough']
            }
          }
        });

        const jsonStr = response.text || '';
        generatedData = JSON.parse(jsonStr.trim());
      } else {
        console.log('Using simulated high-quality fallback lesson generator');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (plan.topic.includes('Calculus')) {
          generatedData = {
            title: "Calculus Limits & Differential Principles (CAPS Grade 12)",
            keyPoints: [
              "Definition of a derivative from first principles: f'(x) = lim h->0 [f(x+h) - f(x)] / h",
              "Understanding average gradient versus instantaneous rate of change",
              "Standard power rule differentiation: d/dx [a*x^n] = n*a*x^(n-1)",
              "Examination tip: Watch out for negative and fractional exponents in NSC Papers"
            ],
            script: "Good morning Grade 12s. While Mrs. Ngubane is indisposed today, our syllabus pace at Phakamani cannot falter, especially with Preliminary and Trial examinations around the corner. Today we explore Calculus limits. Remember, differential calculus is nothing more than calculating the exact speed of change at a singular instant. When evaluating limits from first principles, always maintain algebraic rigor—expand f(x+h) completely, group like terms, factorize h from the numerator, and only let h tend to zero in the final step. Let us inspect the slides and work through Example 1 in your CAPS study guides.",
            slides: [
              {
                slideNumber: 1,
                title: "Core Mechanics: First Principles Definition",
                bulletPoints: [
                  "Secant line joins points (x, f(x)) and (x+h, f(x+h))",
                  "As h approaches zero, secant line rotates into the tangent line",
                  "The limit gives the exact gradient at any point on the curve"
                ],
                visualDescription: "A Cartesian plane illustrating a parabola y = x^2 with two points connected by a dotted secant line converging toward a solid red tangent line as h -> 0."
              },
              {
                slideNumber: 2,
                title: "Common Pitfalls & Algebraic Pitstops",
                bulletPoints: [
                  "Do NOT drop the 'lim h->0' symbol before substituting h = 0",
                  "Watch bracket expansions: -(x+h)^2 = -(x^2 + 2xh + h^2)",
                  "All non-h terms must cancel out before factorizing"
                ],
                visualDescription: "An algebraic breakdown highlighting canceled terms in green and common bracket distribution errors in highlighted red."
              },
              {
                slideNumber: 3,
                title: "Quick Power Rule Shortcuts",
                bulletPoints: [
                  "f(x) = k -> f'(x) = 0 (constant derivative is zero)",
                  "f(x) = x^n -> f'(x) = n*x^(n-1)",
                  "Always write surds as exponents before differentiating (e.g. sqrt(x) = x^(1/2))"
                ],
                visualDescription: "A side-by-side comparative table showing algebraic functions and their corresponding derivatives with highlighted exponent steps."
              },
              {
                slideNumber: 4,
                title: "Matric Exam Practice Problem",
                bulletPoints: [
                  "Determine f'(x) from first principles if f(x) = 3x^2 - 5x",
                  "Step 1: Calculate and simplify f(x+h)",
                  "Step 2: Subtract f(x) and divide by h",
                  "Expected solution: f'(x) = 6x - 5"
                ],
                visualDescription: "Step-by-step whiteboard solution box with green checkmarks marking the awarding of marks as per NSC grading rubric."
              }
            ],
            narratedWalkthrough: "Welcome learners. In this substitute session on Grade 12 Calculus, we focus on the foundation of differentiation: limits from first principles. When finding the gradient of a curve, we compute the limit as h approaches zero of f of x plus h minus f of x, all divided by h. Ensure you expand brackets carefully and factor out h before evaluating. Slide two highlights the common bracket sign errors that cost learners marks in the November trials. Work through the practice problem on slide four now."
          };
        } else {
          generatedData = {
            title: `Curriculum Masterclass: ${plan.topic}`,
            keyPoints: [
              `Core CAPS competencies for ${plan.subject} (${plan.grade})`,
              "Methodological breakdown of foundational concepts and terminology",
              "Standard exam question structuring and high-frequency traps",
              "Applied summary and practical contextual applications"
            ],
            script: `Greetings class. Today we proceed with our scheduled CAPS syllabus topic on ${plan.topic}. It is essential that we maintain continuity in our academic progress. Please open your class notebooks and follow the structured slide progression carefully.`,
            slides: [
              {
                slideNumber: 1,
                title: "Topic Foundation & Definitions",
                bulletPoints: [
                  "Curriculum context: " + (plan.capsReference || plan.curriculumReference),
                  "Core definitions and initial conceptual framework",
                  "Why this topic forms a cornerstone of your final assessment"
                ],
                visualDescription: "A structured conceptual diagram illustrating key terminology and their interrelations on a clean blackboard layout."
              },
              {
                slideNumber: 2,
                title: "Deep Dive: Mechanics & Applications",
                bulletPoints: [
                  "Step-by-step process flow and governing principles",
                  "Case studies and real-world South African applications",
                  "Key formulas, equations, or analytical frameworks"
                ],
                visualDescription: "A conceptual flow diagram showing inputs entering a box labeled 'Core Processes' and outputs exiting in highlighted colors."
              }
            ],
            narratedWalkthrough: `This narrated slideshow will guide you through the essentials of ${plan.topic}. Slide one introduces the main themes and syllabus guidelines. Slide two outlines the mechanics and environmental limiting factors. Listen closely and make notes in your study files.`
          };
        }
      }

      const newLesson: GeneratedLesson = {
        id: `lesson-${Date.now()}`,
        lessonPlanId,
        teacherId,
        dateGenerated: new Date().toLocaleDateString('en-ZA'),
        title: generatedData.title,
        script: generatedData.script,
        keyPoints: generatedData.keyPoints,
        slides: generatedData.slides,
        narratedWalkthrough: generatedData.narratedWalkthrough
      };

      generatedLessons.push(newLesson);
      savePersistedState();

      // Async sync to PostgreSQL via Drizzle ORM
      saveGeneratedLessonDb(newLesson).catch(err => {
        console.warn('PostgreSQL generated lesson sync notice:', err.message);
      });

      // Real-time broadcast
      broadcastSSE('lesson_generated', {
        lessonId: newLesson.id,
        title: newLesson.title,
        teacherName: teacher.name,
        subject: teacher.subject,
        grade: teacher.grade
      });

      res.json({ success: true, lesson: newLesson });

    } catch (err: any) {
      console.error('Error generating substitute lesson:', err);
      res.status(500).json({ 
        error: 'Failed to generate substitute lesson via Gemini AI', 
        details: err.message 
      });
    }
  });

  // Early Warning Mode: Generate draft email to parent via Gemini API
  app.post('/api/generate-warning', async (req, res) => {
    const { studentId } = req.body;
    updateStudentRiskMetrics();
    
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentMarks = marks.filter(m => m.studentId === student.id);
    const studentAtt = attendanceLogs.filter(a => a.studentId === student.id && a.status === 'Absent');
    const studentLogs = behaviourLogs.filter(b => b.studentId === student.id && b.category === 'Concern');

    const marksStr = studentMarks.map(m => `- ${m.subject}: ${m.testName} (${m.markValue}/${m.maxMark})`).join('\n');
    const absencesStr = studentAtt.map(a => `- ${a.date}: Reason: ${a.reason || 'Unexcused'}`).join('\n');
    const behaviourStr = studentLogs.map(b => `- ${b.date}: ${b.description}`).join('\n');

    const promptText = `
You are the compassionate, highly professional Principal and Grade Head of Phakamani Secondary School in South Africa.
Draft an empathetic, collaborative, yet firm and supportive Early-Warning email to a parent whose child is showing signs of academic or attendance risk. 

Here is the student's dynamic diagnostic record:
Student Name: ${student.name}
Grade: ${student.grade}
Parent Name: ${student.parentName}
Parent Email: ${student.parentEmail}
Parent Phone: ${student.parentPhone}

Academic Performance History:
Average Mark this Term: ${student.averageMark}%
Individual Assessments:
${marksStr || 'No recent individual assessments logged.'}

Attendance Record:
Attendance Rate: ${student.attendancePercent}%
Absence incidents logged:
${absencesStr || 'No specific unexcused absences logged.'}

Conduct & Behaviour Logs:
Conduct Score: ${student.conductScore}/120
Conduct concerns:
${behaviourStr || 'No conduct concerns logged.'}

You must respond with a clean, parsed JSON object matching this schema:
{
  "title": "A highly professional, clear, and supportive email subject line",
  "body": "The complete plain-text email body (approx 300 words). It must be written in a warm, welcoming South African administrative tone. It should: 1) Greet the parent by name; 2) Highlight the positive traits or our belief in the student's potential; 3) Outline the exact flagging concerns transparently (declining marks, absences, behaviour) in a constructive way; 4) Offer concrete, practical support options offered by our school (e.g., compulsory afternoon CAPS tutoring classes, student counselor sessions, parent-teacher consulting); 5) Provide a clear call to action to meet or reply, signing off from Phakamani Academic Continuity Support."
}

Ensure the response contains ONLY the valid JSON, with no markdown wrappers or text before/after.
`;

    try {
      const ai = getAiClient();
      const apiKey = process.env.GEMINI_API_KEY;
      
      let generatedData;

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        console.log(`Calling Gemini API for Early-Warning Draft for student: ${student.name}`);
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                body: { type: Type.STRING }
              },
              required: ['title', 'body']
            }
          }
        });

        const jsonStr = response.text || '';
        generatedData = JSON.parse(jsonStr.trim());
      } else {
        console.log('Using simulated high-quality fallback warning generator');
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        generatedData = {
          title: `Supportive Academic & Attendance Review: ${student.name} (${student.grade})`,
          body: `Dear ${student.parentName},\n\nI hope this message finds you well. I am writing to you on behalf of the Academic Continuity Committee at Phakamani Secondary School regarding your child, ${student.name}.\n\nAt Phakamani, we believe deeply in ${student.name}'s potential and want to ensure they receive all the support required to succeed, particularly as they navigate the rigorous demands of ${student.grade.split(' ')[0]}. Currently, our continuous assessment diagnostic system has flagged a few areas of concern that we believe would benefit from our joint intervention:\n\n- Academic Trend: ${student.name}'s current average mark is standing at ${student.averageMark}%. We have noticed a drop in critical subject test scores.\n- Attendance: Their attendance rate has declined to ${student.attendancePercent}%, meaning they have missed essential learning and continuous assessment (CASS) periods.\n- Classroom Conduct: Their conduct score is ${student.conductScore}/120. They have been logged for minor concerns regarding focus and engagement.\n\nWe know that with timely intervention, ${student.name} can get back on track. To support them, we would like to enroll them in our afternoon CAPS revision sessions, which run from Monday to Thursday, 14:30 - 15:30. Additionally, we would like to invite you to meet with their Grade Head this coming Friday at 14:00 to discuss a collaborative study plan.\n\nPlease reply directly to this message or contact our administration office at your earliest convenience to confirm if you can attend or if you'd like to discuss alternative arrangements.\n\nWarm regards,\n\nGrade Head & Support Team\nPhakamani Secondary School`
        };
      }

      const existingIdx = messages.findIndex(m => m.studentId === student.id && m.status === 'Draft');
      const messageData: Message = {
        id: existingIdx >= 0 ? messages[existingIdx].id : `msg-${Date.now()}`,
        studentId: student.id,
        title: generatedData.title,
        body: generatedData.body,
        status: 'Draft',
        dateDrafted: new Date().toISOString().split('T')[0]
      };

      if (existingIdx >= 0) {
        messages[existingIdx] = messageData;
      } else {
        messages.push(messageData);
      }

      savePersistedState();

      // Async sync to PostgreSQL via Drizzle ORM
      saveMessageDb(student.id, generatedData.title, generatedData.body, 'Draft').catch(err => {
        console.warn('PostgreSQL warning draft sync notice:', err.message);
      });

      // Real-time broadcast
      broadcastSSE('warning_drafted', {
        studentId: student.id,
        studentName: student.name,
        title: generatedData.title
      });

      res.json({ success: true, message: messageData });

    } catch (err: any) {
      console.error('Error generating early-warning draft:', err);
      res.status(500).json({ 
        error: 'Failed to generate early-warning draft via Gemini AI', 
        details: err.message 
      });
    }
  });

  // Setup Vite development server or static file hosting for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClassBridge AI Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
