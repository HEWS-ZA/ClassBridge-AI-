import { relations } from 'drizzle-orm';
import { pgTable, text, integer, timestamp, serial } from 'drizzle-orm/pg-core';

// Faculty / Educators table
export const teachers = pgTable('teachers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  grade: text('grade').notNull(),
  status: text('status').notNull(), // 'Active' | 'Absent'
  replacementTeacher: text('replacement_teacher'),
  absentReason: text('absent_reason'),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Learners / Students table with dynamic risk scores
export const students = pgTable('students', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  grade: text('grade').notNull(),
  riskLevel: text('risk_level').notNull(), // 'Low' | 'Medium' | 'High'
  riskScore: integer('risk_score').notNull().default(0),
  averageMark: integer('average_mark').notNull().default(0),
  attendancePercent: integer('attendance_percent').notNull().default(100),
  conductScore: integer('conduct_score').notNull().default(100),
  parentName: text('parent_name').notNull(),
  parentPhone: text('parent_phone').notNull(),
  parentEmail: text('parent_email').notNull(),
  profilePhoto: text('profile_photo').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// CAPS Curriculum Lesson Plans
export const lessonPlans = pgTable('lesson_plans', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id').references(() => teachers.id).notNull(),
  subject: text('subject').notNull(),
  grade: text('grade').notNull(),
  topic: text('topic').notNull(),
  term: integer('term').notNull(),
  week: integer('week').notNull(),
  capsReference: text('caps_reference').notNull(),
  objectives: text('objectives').notNull(), // JSON array
  createdAt: timestamp('created_at').defaultNow()
});

// AI Generated Continuity Substitute Lessons
export const generatedLessons = pgTable('generated_lessons', {
  id: text('id').primaryKey(),
  lessonPlanId: text('lesson_plan_id').references(() => lessonPlans.id).notNull(),
  teacherId: text('teacher_id').references(() => teachers.id).notNull(),
  dateGenerated: text('date_generated').notNull(),
  title: text('title').notNull(),
  script: text('script').notNull(),
  keyPoints: text('key_points').notNull(), // JSON array
  slides: text('slides').notNull(), // JSON array of LessonSlide
  narratedWalkthrough: text('narrated_walkthrough').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Continuous Assessment (CASS) Marks
export const marks = pgTable('marks', {
  id: text('id').primaryKey(),
  studentId: text('student_id').references(() => students.id).notNull(),
  subject: text('subject').notNull(),
  testName: text('test_name').notNull(),
  markValue: integer('mark_value').notNull(),
  maxMark: integer('max_mark').notNull(),
  term: integer('term').notNull(),
  date: text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Attendance Records
export const attendanceRecords = pgTable('attendance_records', {
  id: text('id').primaryKey(),
  studentId: text('student_id').references(() => students.id).notNull(),
  date: text('date').notNull(),
  status: text('status').notNull(), // 'Present' | 'Absent'
  period: text('period').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow()
});

// Behaviour & Conduct Logs
export const behaviourLogs = pgTable('behaviour_logs', {
  id: text('id').primaryKey(),
  studentId: text('student_id').references(() => students.id).notNull(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // 'Positive' | 'Concern'
  points: integer('points').notNull(),
  loggedBy: text('logged_by').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Early-Warning Advisory Messages
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  studentId: text('student_id').references(() => students.id).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull(), // 'Draft' | 'Sent'
  dateDrafted: text('date_drafted').notNull(),
  dateSent: text('date_sent'),
  createdAt: timestamp('created_at').defaultNow()
});

// School Fee Payments
export const feePayments = pgTable('fee_payments', {
  id: text('id').primaryKey(),
  studentId: text('student_id').references(() => students.id).notNull(),
  feeTitle: text('fee_title').notNull(),
  amount: integer('amount').notNull(),
  cardholderName: text('cardholder_name').notNull(),
  paymentDate: text('payment_date').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Remediation Tutoring Bookings
export const tutoringBookings = pgTable('tutoring_bookings', {
  id: text('id').primaryKey(),
  studentId: text('student_id').references(() => students.id).notNull(),
  messageId: text('message_id').notNull(),
  bookingDate: text('booking_date').notNull(),
  status: text('status').notNull(),
  sessionTime: text('session_time').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Real-time Transit Delay Alerts
export const transitAlerts = pgTable('transit_alerts', {
  id: text('id').primaryKey(),
  driverName: text('driver_name').notNull(),
  route: text('route').notNull(),
  reason: text('reason').notNull(),
  estimatedDelayMinutes: integer('estimated_delay_minutes').notNull().default(15),
  timestamp: text('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Relational Definitions
export const teachersRelations = relations(teachers, ({ many }) => ({
  lessonPlans: many(lessonPlans),
  generatedLessons: many(generatedLessons)
}));

export const studentsRelations = relations(students, ({ many }) => ({
  marks: many(marks),
  attendanceRecords: many(attendanceRecords),
  behaviourLogs: many(behaviourLogs),
  messages: many(messages),
  feePayments: many(feePayments),
  tutoringBookings: many(tutoringBookings)
}));

export const lessonPlansRelations = relations(lessonPlans, ({ one, many }) => ({
  teacher: one(teachers, {
    fields: [lessonPlans.teacherId],
    references: [teachers.id]
  }),
  generatedLessons: many(generatedLessons)
}));

export const generatedLessonsRelations = relations(generatedLessons, ({ one }) => ({
  lessonPlan: one(lessonPlans, {
    fields: [generatedLessons.lessonPlanId],
    references: [lessonPlans.id]
  }),
  teacher: one(teachers, {
    fields: [generatedLessons.teacherId],
    references: [teachers.id]
  })
}));

export const marksRelations = relations(marks, ({ one }) => ({
  student: one(students, {
    fields: [marks.studentId],
    references: [students.id]
  })
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  student: one(students, {
    fields: [attendanceRecords.studentId],
    references: [students.id]
  })
}));

export const behaviourLogsRelations = relations(behaviourLogs, ({ one }) => ({
  student: one(students, {
    fields: [behaviourLogs.studentId],
    references: [students.id]
  })
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  student: one(students, {
    fields: [messages.studentId],
    references: [students.id]
  })
}));

export const feePaymentsRelations = relations(feePayments, ({ one }) => ({
  student: one(students, {
    fields: [feePayments.studentId],
    references: [students.id]
  })
}));

export const tutoringBookingsRelations = relations(tutoringBookings, ({ one }) => ({
  student: one(students, {
    fields: [tutoringBookings.studentId],
    references: [students.id]
  })
}));
