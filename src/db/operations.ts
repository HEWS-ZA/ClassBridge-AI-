import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { 
  teachers, 
  students, 
  lessonPlans, 
  generatedLessons, 
  marks, 
  attendanceRecords, 
  behaviourLogs, 
  messages, 
  feePayments, 
  tutoringBookings, 
  transitAlerts 
} from './schema.ts';
import { 
  Student, 
  Teacher, 
  LessonPlan, 
  GeneratedLesson, 
  Mark, 
  Attendance, 
  BehaviourLog, 
  Message, 
  FeePayment, 
  TutoringBooking 
} from '../types';
import { 
  SEED_STUDENTS, 
  SEED_TEACHERS, 
  SEED_LESSON_PLANS, 
  SEED_MARKS, 
  SEED_ATTENDANCE, 
  SEED_BEHAVIOUR_LOGS, 
  SEED_MESSAGES 
} from '../data/seedData';

// Seed Database if empty
export async function seedDatabaseIfEmpty() {
  try {
    const existingStudents = await db.select().from(students).limit(1);
    if (existingStudents.length > 0) {
      console.log('PostgreSQL database already initialized with data.');
      return;
    }

    console.log('Seeding PostgreSQL database with authentic South African high school data...');

    // 1. Seed Educators
    for (const t of SEED_TEACHERS) {
      await db.insert(teachers).values({
        id: t.id,
        name: t.name,
        subject: t.subject,
        grade: t.grade,
        status: t.status,
        replacementTeacher: t.replacementTeacher || null,
        absentReason: t.absentReason || null,
        phone: t.phone || '+27 11 938 1200',
        email: t.email || 'faculty@phakamani.edu.za'
      }).onConflictDoNothing();
    }

    // 2. Seed Students
    for (const s of SEED_STUDENTS) {
      await db.insert(students).values({
        id: s.id,
        name: s.name,
        grade: s.grade,
        riskLevel: s.riskLevel,
        riskScore: s.riskScore,
        averageMark: s.averageMark,
        attendancePercent: s.attendancePercent,
        conductScore: s.conductScore,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        parentEmail: s.parentEmail,
        profilePhoto: s.profilePhoto
      }).onConflictDoNothing();
    }

    // 3. Seed Lesson Plans
    for (const lp of SEED_LESSON_PLANS) {
      await db.insert(lessonPlans).values({
        id: lp.id,
        teacherId: lp.teacherId || (lp.subject === 'Mathematics' ? 'teach-1' : lp.subject === 'Life Sciences' ? 'teach-3' : 'teach-2'),
        subject: lp.subject,
        grade: lp.grade,
        topic: lp.topic,
        term: lp.term || 2,
        week: lp.week || 4,
        capsReference: lp.capsReference || lp.curriculumReference,
        objectives: JSON.stringify(lp.objectives || [lp.topic, lp.standardNotes])
      }).onConflictDoNothing();
    }

    // 4. Seed Assessment Marks
    for (const m of SEED_MARKS) {
      await db.insert(marks).values({
        id: m.id,
        studentId: m.studentId,
        subject: m.subject,
        testName: m.testName,
        markValue: m.markValue,
        maxMark: m.maxMark,
        term: m.term,
        date: m.date
      }).onConflictDoNothing();
    }

    // 5. Seed Attendance Logs
    for (const a of SEED_ATTENDANCE) {
      await db.insert(attendanceRecords).values({
        id: a.id,
        studentId: a.studentId,
        date: a.date,
        status: a.status,
        period: a.period || 'Period 1 (Morning Register)',
        reason: a.reason || null
      }).onConflictDoNothing();
    }

    // 6. Seed Behaviour Logs
    for (const b of SEED_BEHAVIOUR_LOGS) {
      await db.insert(behaviourLogs).values({
        id: b.id,
        studentId: b.studentId,
        date: b.date,
        description: b.description,
        category: b.category,
        points: b.points,
        loggedBy: b.loggedBy || 'Grade Head / Educator'
      }).onConflictDoNothing();
    }

    // 7. Seed Messages
    for (const msg of SEED_MESSAGES) {
      await db.insert(messages).values({
        id: msg.id,
        studentId: msg.studentId,
        title: msg.title,
        body: msg.body,
        status: msg.status,
        dateDrafted: msg.dateDrafted,
        dateSent: msg.dateSent || null
      }).onConflictDoNothing();
    }

    console.log('PostgreSQL database seeding complete.');
  } catch (err) {
    console.error('Error during database seeding:', err);
    throw new Error('Database seeding failed', { cause: err });
  }
}

// Fetch Complete School State from PostgreSQL
export async function getFullSchoolState() {
  try {
    const [
      rawTeachers,
      rawStudents,
      rawLessonPlans,
      rawGeneratedLessons,
      rawMarks,
      rawAttendance,
      rawBehaviour,
      rawMessages,
      rawPayments,
      rawBookings,
      rawAlerts
    ] = await Promise.all([
      db.select().from(teachers),
      db.select().from(students),
      db.select().from(lessonPlans),
      db.select().from(generatedLessons).orderBy(desc(generatedLessons.createdAt)),
      db.select().from(marks),
      db.select().from(attendanceRecords),
      db.select().from(behaviourLogs),
      db.select().from(messages),
      db.select().from(feePayments),
      db.select().from(tutoringBookings),
      db.select().from(transitAlerts).orderBy(desc(transitAlerts.createdAt)).limit(10)
    ]);

    // Map DB entities to application interface models
    const parsedStudents: Student[] = rawStudents.map(s => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      riskLevel: s.riskLevel as 'Low' | 'Medium' | 'High',
      riskScore: s.riskScore,
      averageMark: s.averageMark,
      attendancePercent: s.attendancePercent,
      conductScore: s.conductScore,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      parentEmail: s.parentEmail,
      profilePhoto: s.profilePhoto
    }));

    const parsedTeachers: Teacher[] = rawTeachers.map(t => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      grade: t.grade,
      status: t.status as 'Active' | 'Absent',
      replacementTeacher: t.replacementTeacher || undefined,
      absentReason: t.absentReason || undefined,
      phone: t.phone,
      email: t.email
    }));

    const parsedLessonPlans: LessonPlan[] = rawLessonPlans.map(lp => {
      let objectives: string[] = [];
      try {
        objectives = JSON.parse(lp.objectives);
      } catch {
        objectives = [lp.objectives];
      }
      return {
        id: lp.id,
        teacherId: lp.teacherId,
        subject: lp.subject,
        grade: lp.grade,
        topic: lp.topic,
        term: lp.term,
        week: lp.week,
        capsReference: lp.capsReference,
        curriculumReference: lp.capsReference,
        standardNotes: `Standard CAPS curriculum pacing guideline for ${lp.topic} (${lp.capsReference}).`,
        objectives
      };
    });

    const parsedGeneratedLessons: GeneratedLesson[] = rawGeneratedLessons.map(gl => {
      let keyPoints: string[] = [];
      let slides: any[] = [];
      try {
        keyPoints = JSON.parse(gl.keyPoints);
      } catch {
        keyPoints = [];
      }
      try {
        slides = JSON.parse(gl.slides);
      } catch {
        slides = [];
      }
      return {
        id: gl.id,
        lessonPlanId: gl.lessonPlanId,
        teacherId: gl.teacherId,
        dateGenerated: gl.dateGenerated,
        title: gl.title,
        script: gl.script,
        keyPoints,
        slides,
        narratedWalkthrough: gl.narratedWalkthrough
      };
    });

    const parsedMarks: Mark[] = rawMarks.map(m => ({
      id: m.id,
      studentId: m.studentId,
      subject: m.subject,
      testName: m.testName,
      markValue: m.markValue,
      maxMark: m.maxMark,
      term: m.term,
      date: m.date
    }));

    const parsedAttendance: Attendance[] = rawAttendance.map(a => ({
      id: a.id,
      studentId: a.studentId,
      date: a.date,
      status: a.status as 'Present' | 'Absent',
      period: a.period,
      reason: a.reason || undefined
    }));

    const parsedBehaviour: BehaviourLog[] = rawBehaviour.map(b => ({
      id: b.id,
      studentId: b.studentId,
      date: b.date,
      description: b.description,
      category: b.category as 'Positive' | 'Concern',
      points: b.points,
      loggedBy: b.loggedBy
    }));

    const parsedMessages: Message[] = rawMessages.map(msg => ({
      id: msg.id,
      studentId: msg.studentId,
      title: msg.title,
      body: msg.body,
      status: msg.status as 'Draft' | 'Sent',
      dateDrafted: msg.dateDrafted,
      dateSent: msg.dateSent || undefined
    }));

    const parsedPayments: FeePayment[] = rawPayments.map(p => ({
      id: p.id,
      studentId: p.studentId,
      feeTitle: p.feeTitle,
      amount: p.amount,
      cardholderName: p.cardholderName,
      paymentDate: p.paymentDate,
      status: p.status as 'Settled' | 'Pending'
    }));

    const parsedBookings: TutoringBooking[] = rawBookings.map(tb => ({
      id: tb.id,
      studentId: tb.studentId,
      messageId: tb.messageId,
      bookingDate: tb.bookingDate,
      status: tb.status as 'Confirmed' | 'Pending',
      sessionTime: tb.sessionTime
    }));

    return {
      students: parsedStudents,
      teachers: parsedTeachers,
      lessonPlans: parsedLessonPlans,
      generatedLessons: parsedGeneratedLessons,
      marks: parsedMarks,
      attendanceLogs: parsedAttendance,
      behaviourLogs: parsedBehaviour,
      messages: parsedMessages,
      feePayments: parsedPayments,
      tutoringBookings: parsedBookings,
      transitAlerts: rawAlerts
    };
  } catch (err) {
    console.error('Error fetching full school state from PostgreSQL:', err);
    throw new Error('Database retrieval error', { cause: err });
  }
}

// Teacher status toggle
export async function updateTeacherStatus(teacherId: string, status: 'Active' | 'Absent') {
  try {
    const updated = await db
      .update(teachers)
      .set({ 
        status, 
        replacementTeacher: status === 'Absent' ? 'Assigned to ClassBridge AI' : null,
        absentReason: status === 'Absent' ? 'Reported Unscheduled Sick Leave' : null
      })
      .where(eq(teachers.id, teacherId))
      .returning();
    return updated[0];
  } catch (err) {
    console.error('Failed to update educator status:', err);
    throw new Error('Failed to update educator status', { cause: err });
  }
}

// Save or Update Message
export async function saveMessage(studentId: string, title: string, body: string, status: 'Draft' | 'Sent') {
  try {
    const existing = await db
      .select()
      .from(messages)
      .where(eq(messages.studentId, studentId))
      .limit(1);

    const now = new Date().toISOString().split('T')[0];

    if (existing.length > 0) {
      const updated = await db
        .update(messages)
        .set({
          title,
          body,
          status,
          dateSent: status === 'Sent' ? now : existing[0].dateSent
        })
        .where(eq(messages.id, existing[0].id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(messages)
        .values({
          id: `msg-${Date.now()}`,
          studentId,
          title,
          body,
          status,
          dateDrafted: now,
          dateSent: status === 'Sent' ? now : null
        })
        .returning();
      return inserted[0];
    }
  } catch (err) {
    console.error('Failed to save message:', err);
    throw new Error('Failed to save message', { cause: err });
  }
}

// Insert Mark and recalculate student
export async function addStudentMark(studentId: string, subject: string, testName: string, markValue: number, maxMark: number) {
  try {
    const now = new Date().toISOString().split('T')[0];
    const newMark = await db
      .insert(marks)
      .values({
        id: `mark-${Date.now()}`,
        studentId,
        subject,
        testName,
        markValue,
        maxMark,
        term: 1,
        date: now
      })
      .returning();

    await syncStudentRiskMetrics(studentId);
    return newMark[0];
  } catch (err) {
    console.error('Failed to insert assessment mark:', err);
    throw new Error('Failed to insert assessment mark', { cause: err });
  }
}

// Insert Attendance
export async function addAttendanceLog(studentId: string, status: 'Present' | 'Absent', reason?: string) {
  try {
    const now = new Date().toISOString().split('T')[0];
    const newAtt = await db
      .insert(attendanceRecords)
      .values({
        id: `att-${Date.now()}`,
        studentId,
        date: now,
        status,
        period: 'Period 1 (Morning Register)',
        reason: reason || null
      })
      .returning();

    await syncStudentRiskMetrics(studentId);
    return newAtt[0];
  } catch (err) {
    console.error('Failed to insert attendance record:', err);
    throw new Error('Failed to insert attendance record', { cause: err });
  }
}

// Insert Behaviour Log
export async function addBehaviourLog(studentId: string, category: 'Positive' | 'Concern', description: string, points: number) {
  try {
    const now = new Date().toISOString().split('T')[0];
    const newLog = await db
      .insert(behaviourLogs)
      .values({
        id: `beh-${Date.now()}`,
        studentId,
        date: now,
        description,
        category,
        points,
        loggedBy: 'Grade Head / Educator'
      })
      .returning();

    await syncStudentRiskMetrics(studentId);
    return newLog[0];
  } catch (err) {
    console.error('Failed to insert conduct log:', err);
    throw new Error('Failed to insert conduct log', { cause: err });
  }
}

// Save Generated Lesson
export async function saveGeneratedLesson(lesson: GeneratedLesson) {
  try {
    const saved = await db
      .insert(generatedLessons)
      .values({
        id: lesson.id,
        lessonPlanId: lesson.lessonPlanId,
        teacherId: lesson.teacherId,
        dateGenerated: lesson.dateGenerated,
        title: lesson.title,
        script: lesson.script,
        keyPoints: JSON.stringify(lesson.keyPoints),
        slides: JSON.stringify(lesson.slides),
        narratedWalkthrough: lesson.narratedWalkthrough
      })
      .returning();
    return saved[0];
  } catch (err) {
    console.error('Failed to save generated lesson:', err);
    throw new Error('Failed to save generated lesson', { cause: err });
  }
}

// Record Fee Payment
export async function recordFeePayment(studentId: string, feeTitle: string, amount: number, cardholderName: string) {
  try {
    const now = new Date().toISOString().split('T')[0];
    const payment = await db
      .insert(feePayments)
      .values({
        id: `pay-${Date.now()}`,
        studentId,
        feeTitle,
        amount,
        cardholderName,
        paymentDate: now,
        status: 'Settled'
      })
      .returning();
    return payment[0];
  } catch (err) {
    console.error('Failed to record fee payment:', err);
    throw new Error('Failed to record fee payment', { cause: err });
  }
}

// Record Tutoring Booking
export async function recordTutoringBooking(studentId: string, messageId: string) {
  try {
    const now = new Date().toISOString().split('T')[0];
    const booking = await db
      .insert(tutoringBookings)
      .values({
        id: `book-${Date.now()}`,
        studentId,
        messageId,
        bookingDate: now,
        status: 'Confirmed',
        sessionTime: 'Monday - Thursday (14:30 - 15:30) • Room 14'
      })
      .returning();
    return booking[0];
  } catch (err) {
    console.error('Failed to record tutoring booking:', err);
    throw new Error('Failed to record tutoring booking', { cause: err });
  }
}

// Create Transit Delay Alert
export async function createTransitAlert(driverName: string, route: string, reason: string, estimatedDelayMinutes: number = 15) {
  try {
    const now = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const alert = await db
      .insert(transitAlerts)
      .values({
        id: `alert-${Date.now()}`,
        driverName,
        route,
        reason,
        estimatedDelayMinutes,
        timestamp: `${now} SAST`
      })
      .returning();
    return alert[0];
  } catch (err) {
    console.error('Failed to record transit alert:', err);
    throw new Error('Failed to record transit alert', { cause: err });
  }
}

// Recalculate and update risk metrics in PostgreSQL for a student
export async function syncStudentRiskMetrics(studentId: string) {
  try {
    const [studentRecords, studentMarks, studentAtt, studentLogs] = await Promise.all([
      db.select().from(students).where(eq(students.id, studentId)),
      db.select().from(marks).where(eq(marks.studentId, studentId)),
      db.select().from(attendanceRecords).where(eq(attendanceRecords.studentId, studentId)),
      db.select().from(behaviourLogs).where(eq(behaviourLogs.studentId, studentId))
    ]);

    if (studentRecords.length === 0) return;
    const student = studentRecords[0];

    // 1. Average Mark
    let avgMark = student.averageMark;
    let decliningTrend = false;
    if (studentMarks.length > 0) {
      const sum = studentMarks.reduce((acc, m) => acc + m.markValue, 0);
      avgMark = Math.round(sum / studentMarks.length);

      const sorted = [...studentMarks].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (sorted.length >= 2 && sorted[sorted.length - 1].markValue < sorted[sorted.length - 2].markValue) {
        decliningTrend = true;
      }
    }

    // 2. Attendance %
    const baseDays = 20;
    const basePresent = Math.round(baseDays * (student.id === 'stud-1' ? 0.78 : student.id === 'stud-4' ? 0.70 : student.id === 'stud-3' ? 0.92 : 0.98));
    const addedPresent = studentAtt.filter(a => a.status === 'Present').length;
    const addedAbsent = studentAtt.filter(a => a.status === 'Absent').length;
    const totalPresent = basePresent + addedPresent;
    const totalDays = baseDays + addedPresent + addedAbsent;
    const attendancePercent = Math.round((totalPresent / totalDays) * 100);

    // 3. Conduct Score
    let conduct = 100;
    studentLogs.forEach(l => {
      conduct += l.points;
    });
    const conductScore = Math.max(0, Math.min(120, conduct));

    // 4. Algorithmic Risk Score
    let marksRiskScore = 0;
    if (avgMark >= 80) marksRiskScore = 0;
    else if (avgMark >= 50) marksRiskScore = ((80 - avgMark) / 30) * 100;
    else marksRiskScore = 100;

    if (decliningTrend) {
      marksRiskScore = Math.min(100, marksRiskScore + 15);
    }

    let attRiskScore = 0;
    if (attendancePercent >= 95) attRiskScore = 0;
    else if (attendancePercent >= 75) attRiskScore = ((95 - attendancePercent) / 20) * 100;
    else attRiskScore = 100;

    let conductRiskScore = 0;
    if (conductScore >= 100) conductRiskScore = 0;
    else if (conductScore >= 60) conductRiskScore = ((100 - conductScore) / 40) * 100;
    else conductRiskScore = 100;

    const riskScore = Math.round((marksRiskScore * 0.40) + (attRiskScore * 0.30) + (conductRiskScore * 0.30));
    const clampedRisk = Math.max(0, Math.min(100, riskScore));

    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (clampedRisk >= 70) riskLevel = 'High';
    else if (clampedRisk >= 40) riskLevel = 'Medium';

    await db
      .update(students)
      .set({
        averageMark: avgMark,
        attendancePercent,
        conductScore,
        riskScore: clampedRisk,
        riskLevel
      })
      .where(eq(students.id, studentId));
  } catch (err) {
    console.error(`Failed to sync risk metrics for student ${studentId}:`, err);
  }
}
