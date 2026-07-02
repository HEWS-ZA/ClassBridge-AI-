/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string;
  name: string;
  grade: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  riskScore: number; // 0 to 100
  riskLevel: 'Low' | 'Medium' | 'High';
  attendancePercent: number; // e.g. 85
  averageMark: number; // e.g. 62
  conductScore: number; // starts at 100, drops with Concerns, increases with Positives
  profilePhoto: string;
  bio?: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  grade: string;
  status: 'Active' | 'Absent';
  absentSince?: string;
}

export interface Mark {
  id: string;
  studentId: string;
  subject: string;
  testName: string;
  markValue: number; // e.g. 45
  maxMark: number; // e.g. 100
  date: string;
  term: number;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'Present' | 'Absent';
  reason?: string;
}

export interface BehaviourLog {
  id: string;
  studentId: string;
  category: 'Positive' | 'Concern';
  description: string;
  date: string;
  points: number; // positive or negative modifier
}

export interface LessonPlan {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  standardNotes: string;
  curriculumReference: string; // e.g. CAPS Section 3.2
}

export interface LessonSlide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  visualDescription: string;
}

export interface GeneratedLesson {
  id: string;
  lessonPlanId: string;
  teacherId: string;
  dateGenerated: string;
  title: string;
  script: string;
  keyPoints: string[];
  slides: LessonSlide[];
  narratedWalkthrough: string; // script for voice playback
}

export interface Message {
  id: string;
  studentId: string;
  title: string;
  body: string;
  status: 'Draft' | 'Sent';
  dateDrafted: string;
  dateSent?: string;
}

export interface SchoolStats {
  totalStudents: number;
  totalTeachers: number;
  absentTeachersCount: number;
  atRiskStudentsCount: number;
  averageAttendance: number;
}

export interface SchoolRules {
  conductPolicy: string;
  stationeryList: string[];
  importantDates: { event: string; date: string }[];
}
