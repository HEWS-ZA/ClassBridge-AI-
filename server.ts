/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
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
  LessonSlide
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

// Initialize state
let students = JSON.parse(JSON.stringify(SEED_STUDENTS)) as Student[];
let teachers = JSON.parse(JSON.stringify(SEED_TEACHERS)) as Teacher[];
let lessonPlans = JSON.parse(JSON.stringify(SEED_LESSON_PLANS)) as LessonPlan[];
let marks = JSON.parse(JSON.stringify(SEED_MARKS)) as Mark[];
let attendanceLogs = JSON.parse(JSON.stringify(SEED_ATTENDANCE)) as Attendance[];
let behaviourLogs = JSON.parse(JSON.stringify(SEED_BEHAVIOUR_LOGS)) as BehaviourLog[];
let generatedLessons = [] as GeneratedLesson[];
let messages = JSON.parse(JSON.stringify(SEED_MESSAGES)) as Message[];
let schoolRules = JSON.parse(JSON.stringify(SEED_RULES));

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
      
      // Check for declining trend in tests sorted by date
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
    const baseDays = 20; // assumed base school days for seeding
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
    // Marks metric: low marks or declining marks
    let marksRiskScore = 0;
    if (avgMark >= 80) marksRiskScore = 0;
    else if (avgMark >= 50) marksRiskScore = ((80 - avgMark) / 30) * 100;
    else marksRiskScore = 100;
    
    if (decliningTrend) {
      marksRiskScore = Math.min(100, marksRiskScore + 15);
    }

    // Attendance metric: low attendance
    let attRiskScore = 0;
    if (student.attendancePercent >= 95) attRiskScore = 0;
    else if (student.attendancePercent >= 75) attRiskScore = ((95 - student.attendancePercent) / 20) * 100;
    else attRiskScore = 100;

    // Behaviour metric: concerns
    let conductRiskScore = 0;
    if (student.conductScore >= 100) conductRiskScore = 0;
    else if (student.conductScore >= 60) conductRiskScore = ((100 - student.conductScore) / 40) * 100;
    else conductRiskScore = 100;

    // Combined Risk Score: 40% marks, 30% attendance, 30% behaviour
    const riskScore = Math.round((marksRiskScore * 0.40) + (attRiskScore * 0.30) + (conductRiskScore * 0.30));
    student.riskScore = Math.max(0, Math.min(100, riskScore));

    // Classify Level
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

  // GET State
  app.get('/api/state', (req, res) => {
    updateStudentRiskMetrics();
    
    // Calculate global stats
    const absentTeachersCount = teachers.filter(t => t.status === 'Absent').length;
    updateStudentRiskMetrics();
    const atRiskStudentsCount = students.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Medium').length;
    const avgAttendance = Math.round(students.reduce((acc, s) => acc + s.attendancePercent, 0) / students.length);

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
      stats
    });
  });

  // RESET State
  app.post('/api/state/reset', (req, res) => {
    students = JSON.parse(JSON.stringify(SEED_STUDENTS));
    teachers = JSON.parse(JSON.stringify(SEED_TEACHERS));
    lessonPlans = JSON.parse(JSON.stringify(SEED_LESSON_PLANS));
    marks = JSON.parse(JSON.stringify(SEED_MARKS));
    attendanceLogs = JSON.parse(JSON.stringify(SEED_ATTENDANCE));
    behaviourLogs = JSON.parse(JSON.stringify(SEED_BEHAVIOUR_LOGS));
    generatedLessons = [];
    messages = JSON.parse(JSON.stringify(SEED_MESSAGES));
    schoolRules = JSON.parse(JSON.stringify(SEED_RULES));
    res.json({ success: true, message: 'State successfully reset to seed defaults' });
  });

  // Toggle teacher attendance
  app.post('/api/teachers/toggle', (req, res) => {
    const { teacherId, status } = req.body;
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    teacher.status = status;
    teacher.absentSince = status === 'Absent' ? new Date().toLocaleDateString('en-ZA') : undefined;
    res.json({ success: true, teacher });
  });

  // Add marks log
  app.post('/api/logs/mark', (req, res) => {
    const { studentId, subject, testName, markValue, maxMark } = req.body;
    const newMark: Mark = {
      id: `mark-${Date.now()}`,
      studentId,
      subject,
      testName,
      markValue: Number(markValue),
      maxMark: Number(maxMark),
      date: new Date().toISOString().split('T')[0],
      term: 2
    };
    marks.push(newMark);
    updateStudentRiskMetrics();
    res.json({ success: true, mark: newMark });
  });

  // Add attendance log
  app.post('/api/logs/attendance', (req, res) => {
    const { studentId, status, reason } = req.body;
    const newAtt: Attendance = {
      id: `att-${Date.now()}`,
      studentId,
      date: new Date().toISOString().split('T')[0],
      status,
      reason: reason || undefined
    };
    attendanceLogs.push(newAtt);
    updateStudentRiskMetrics();
    res.json({ success: true, attendance: newAtt });
  });

  // Add behaviour log
  app.post('/api/logs/behaviour', (req, res) => {
    const { studentId, category, description, points } = req.body;
    const newLog: BehaviourLog = {
      id: `log-${Date.now()}`,
      studentId,
      category,
      description,
      date: new Date().toISOString().split('T')[0],
      points: Number(points)
    };
    behaviourLogs.push(newLog);
    updateStudentRiskMetrics();
    res.json({ success: true, log: newLog });
  });

  // Save draft message or send message
  app.post('/api/messages/save', (req, res) => {
    const { studentId, title, body, status } = req.body;
    
    // Check if there is already a draft for this student
    const existingIdx = messages.findIndex(m => m.studentId === studentId && m.status === 'Draft');
    
    const messageData: Message = {
      id: existingIdx >= 0 ? messages[existingIdx].id : `msg-${Date.now()}`,
      studentId,
      title,
      body,
      status: status || 'Draft',
      dateDrafted: existingIdx >= 0 ? messages[existingIdx].dateDrafted : new Date().toISOString().split('T')[0],
      dateSent: status === 'Sent' ? new Date().toISOString().split('T')[0] : undefined
    };

    if (existingIdx >= 0) {
      messages[existingIdx] = messageData;
    } else {
      messages.push(messageData);
    }

    res.json({ success: true, message: messageData });
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
      "bulletPoints": ["Bullet point 1 detailing concepts", "Bullet point 2 with formulas or examples"],
      "visualDescription": "A concise instruction of what visual representation or diagrams should be displayed (e.g. 'A clean diagram of a plant chloroplast highlighting thylakoids in light green')"
    }
  ],
  "narratedWalkthrough": "An encouraging, narrative audio-narration script (approx 150 words) that walk the student through the slides sequentially."
}

Generate exactly 4 to 5 high-quality interactive slides. Ensure the response contains ONLY the valid JSON, with no markdown wrappers or text before/after.
`;

    try {
      const ai = getAiClient();
      const apiKey = process.env.GEMINI_API_KEY;
      
      let generatedData;

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        // Run Gemini API
        console.log(`Calling Gemini API for Lesson Generation on topic: ${plan.topic}`);
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
        // Fallback simulated generation if API Key is not set, to ensure hackathon prototype robustness
        console.log('Using simulated high-quality fallback generator (No API key set)');
        await new Promise(resolve => setTimeout(resolve, 1500)); // simulate latency
        
        if (plan.topic.includes('Calculus')) {
          generatedData = {
            title: "Calculus Mastery: Understanding Limits & First Principles",
            keyPoints: [
              "A limit is the value that a function approaches as the input approaches some value.",
              "Differentiation from first principles allows us to find the gradient of a curve at any point.",
              "The power rule is a quick, proven shortcut derived directly from first principles."
            ],
            script: "Good day, Grade 12s! Today we are looking at Calculus, which makes up a substantial portion of your CAPS Paper 1 final examinations. I know limits and first principles can look intimidating with all the algebra, but remember: it is just about looking at what happens as our interval 'h' gets infinitely close to zero. When we write f'(x) = lim [h -> 0] (f(x+h) - f(x))/h, we are simply finding the rise over run for a tiny, tiny gap. Let us practice expanding f(x+h) carefully and cancelling out the h. Keep your focus, grab your CASIO calculators, and let's work through this step-by-step. You've got this!",
            slides: [
              {
                slideNumber: 1,
                title: "Introduction to Calculus & Limits",
                bulletPoints: [
                  "Calculus is the mathematical study of continuous change.",
                  "A limit describes the behavior of a function near a specific input value.",
                  "Notation: lim [x -> c] f(x) = L means as x gets closer to c, f(x) gets closer to L."
                ],
                visualDescription: "A Cartesian plane graph showing a curve y = f(x) with a point x approaching c, highlighted with green arrows on the x-axis."
              },
              {
                slideNumber: 2,
                title: "Differentiation from First Principles",
                bulletPoints: [
                  "Formula: f'(x) = lim [h -> 0] [f(x+h) - f(x)] / h",
                  "Geometrically, this is the limit of the secant line gradient as h approaches 0.",
                  "Always expand the numerator f(x+h) first, then factor out and divide by h."
                ],
                visualDescription: "A curve with two points P(x, f(x)) and Q(x+h, f(x+h)) with a secant line connecting them that gradually rotates to become a tangent line at P."
              },
              {
                slideNumber: 3,
                title: "Step-by-Step Example: f(x) = x^2",
                bulletPoints: [
                  "Step 1: f(x+h) = (x+h)^2 = x^2 + 2xh + h^2",
                  "Step 2: f(x+h) - f(x) = 2xh + h^2",
                  "Step 3: Divide by h: (2xh + h^2)/h = 2x + h",
                  "Step 4: Take limit h->0: f'(x) = 2x"
                ],
                visualDescription: "A clear algebraic expansion layout styled with chalk-board font, with cancellation lines on the x^2 terms."
              },
              {
                slideNumber: 4,
                title: "The Shortcut: The Power Rule",
                bulletPoints: [
                  "Rule: d/dx (x^n) = n * x^(n-1)",
                  "This holds true for any real number exponent n.",
                  "Example: For f(x) = x^3, f'(x) = 3x^2. For f(x) = 5x^2, f'(x) = 10x."
                ],
                visualDescription: "A comparative table comparing First Principles vs. Power Rule derivations side-by-side, proving they yield identical results."
              }
            ],
            narratedWalkthrough: "Welcome to this AI-narrated walkthrough for Grade 12 Calculus. In the first slide, we define limits which are the foundational building block of calculus. In slide two, we inspect the formula for first principles—remember to show your working steps as this is worth five marks in your final paper! Slide three takes you through a concrete algebraic example using f(x) equals x squared, showing how the 'h' term beautifully cancels out. Finally, slide four introduces the power rule shortcut, which you should use to check your first principles answers!"
          };
        } else {
          generatedData = {
            title: `${plan.topic} - Substitute Lesson Session`,
            keyPoints: [
              "Understanding core biological and chemical structures is essential.",
              "The CAPS curriculum emphasizes diagram labeling and experimental setups.",
              "Continuous revisions are key to achieving your potential in tests."
            ],
            script: `Good day, learners! Today Ms. Nomvula Sithole is away, but our learning does not stop. We are proceeding with our planned topic of ${plan.topic}. Let's take out our notebooks and pay close attention to this structured session. We will cover the main mechanisms, step through the interactive slides, and complete the short check-for-understanding exercises at the end. Stay focused!`,
            slides: [
              {
                slideNumber: 1,
                title: `Introduction to ${plan.topic}`,
                bulletPoints: [
                  "This topic is core to the National Senior Certificate CAPS curriculum.",
                  "Key terminologies must be memorized and spelled correctly.",
                  "Practical assignments frequently test this section."
                ],
                visualDescription: "A clean, high-contrast illustration representing the core topic elements labeled with CAPS terminology."
              },
              {
                slideNumber: 2,
                title: "Core Mechanics and Theories",
                bulletPoints: [
                  "First phase requires energy input or active transport.",
                  "Second phase releases primary outputs and biological products.",
                  "Environmental conditions (temperature, pressure, pH) act as limiting factors."
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

    // Gather specific details to feed the AI
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
        // Fallback simulation
        console.log('Using simulated high-quality fallback warning generator');
        await new Promise(resolve => setTimeout(resolve, 1200)); // simulate latency
        
        generatedData = {
          title: `Supportive Academic & Attendance Review: ${student.name} (${student.grade})`,
          body: `Dear ${student.parentName},\n\nI hope this message finds you well. I am writing to you on behalf of the Academic Continuity Committee at Phakamani Secondary School regarding your child, ${student.name}.\n\nAt Phakamani, we believe deeply in ${student.name}'s potential and want to ensure they receive all the support required to succeed, particularly as they navigate the rigorous demands of ${student.grade.split(' ')[0]}. Currently, our continuous assessment diagnostic system has flagged a few areas of concern that we believe would benefit from our joint intervention:\n\n- Academic Trend: ${student.name}'s current average mark is standing at ${student.averageMark}%. We have noticed a drop in critical subject test scores.\n- Attendance: Their attendance rate has declined to ${student.attendancePercent}%, meaning they have missed essential learning and continuous assessment (CASS) periods.\n- Classroom Conduct: Their conduct score is ${student.conductScore}/120. They have been logged for minor concerns regarding focus and engagement.\n\nWe know that with timely intervention, ${student.name} can get back on track. To support them, we would like to enroll them in our afternoon CAPS revision sessions, which run from Monday to Thursday, 14:30 - 15:30. Additionally, we would like to invite you to meet with their Grade Head this coming Friday at 14:00 to discuss a collaborative study plan.\n\nPlease reply directly to this message or contact our administration office at your earliest convenience to confirm if you can attend or if you'd like to discuss alternative arrangements.\n\nWarm regards,\n\nGrade Head & Support Team\nPhakamani Secondary School`
        };
      }

      // Automatically save as Draft in our state
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
