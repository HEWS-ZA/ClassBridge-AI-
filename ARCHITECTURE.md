# ClassBridge AI — System Architecture (ARCHITECTURE.md)

This document describes the software architecture, runtime topology, data flow, algorithmic models, and external integrations of **ClassBridge AI**.

---

## 1. High-Level Architectural Overview

ClassBridge AI is structured as a full-stack Node.js + Express application driving a React 19 Single Page Application (SPA). The backend acts as both an API service and a development server host (via Vite middleware), consolidating persistence, business logic, algorithmic scoring, and LLM orchestration into a single deployable unit.

```
                           +---------------------------------------------+
                           |             User Web Browser                |
                           |  (Admin, Student, Parent, Driver Portals)   |
                           +----------------------+----------------------+
                                                  |
                                                  | HTTP / JSON REST
                                                  v
                           +---------------------------------------------+
                           |             Express 4 Application           |
                           |                 (server.ts)                 |
                           +----------------------+----------------------+
                                                  |
                   +------------------------------+-------------------------------+
                   |                              |                               |
                   v                              v                               v
    +------------------------------+  +------------------------+   +------------------------------+
    |   In-Memory State Store      |  |  Multi-Factor Risk     |   |   Gemini 3.5 Flash Engine    |
    | (Students, Teachers, Marks,  |  |  Calculation Engine    |   |  (@google/genai SDK Proxy)   |
    | Attendance, Behaviour, etc.) |  |  (updateStudentRisk)   |   |                              |
    +------------------------------+  +------------------------+   +--------------+---------------+
                                                                                  |
                                                                                  v
                                                                   +------------------------------+
                                                                   |  Google AI Studio / Gemini   |
                                                                   |  (Lesson Plans & Warnings)   |
                                                                   +------------------------------+
```

---

## 2. Backend Architecture (`server.ts`)

The backend server is implemented in TypeScript using Express, executed directly via `tsx` during development and bundled via `esbuild` for production deployment.

### 2.1 Dual-Mode Server Lifecycle
- **Development Mode (`NODE_ENV !== 'production'`):**
  - Creates a programmatic Vite server instance (`createViteServer({ server: { middlewareMode: true }, appType: 'spa' })`).
  - Attaches `vite.middlewares` directly to Express, providing instant TypeScript compilation and asset serving on port `3000`.
- **Production Mode:**
  - Serves compiled static assets from the `/dist` directory.
  - Implements wildcard SPA fallback (`app.get('*', ...)`) routing all unmatched requests to `dist/index.html`.
  - Bundled as a standalone CommonJS file (`dist/server.cjs`) with externalized dependencies.

### 2.2 In-Memory State Model
To ensure zero external database configuration overhead while guaranteeing atomic interactions, the server maintains an in-memory database seeded from `src/data/seedData.ts`:
- `students: Student[]`
- `teachers: Teacher[]`
- `lessonPlans: LessonPlan[]`
- `marks: Mark[]`
- `attendanceLogs: Attendance[]`
- `behaviourLogs: BehaviourLog[]`
- `generatedLessons: GeneratedLesson[]`
- `messages: Message[]`
- `schoolRules: SchoolRules`

A dedicated endpoint `POST /api/state/reset` allows demonstration resets back to default seeds at any time.

---

## 3. The Algorithmic Risk Engine (`updateStudentRiskMetrics`)

At the core of ClassBridge AI’s Early-Warning Mode is a continuous diagnostic model executed on every state mutation:

$$\text{Composite Risk} = (0.40 \times \text{Marks Risk}) + (0.30 \times \text{Attendance Risk}) + (0.30 \times \text{Conduct Risk})$$

### 3.1 Marks Metric Calculation (40% Weight)
- Dynamically computes the learner's arithmetic mean across all logged CASS assessments.
- Inspects longitudinal progression in Mathematics: if the most recent test score is lower than the preceding test, a **declining trend penalty (+15%)** is automatically applied.
- Normalized score:
  - $\ge 80\% \rightarrow 0$ risk
  - $50\% \text{ to } 79\% \rightarrow \frac{80 - \text{average}}{30} \times 100$
  - $< 50\% \rightarrow 100$ risk (capped at 100)

### 3.2 Attendance Metric Calculation (30% Weight)
- Combines foundational school days with real-time student absence/presence records.
- Normalized score:
  - $\ge 95\% \rightarrow 0$ risk
  - $75\% \text{ to } 94\% \rightarrow \frac{95 - \text{attendanceRate}}{20} \times 100$
  - $< 75\% \rightarrow 100$ risk

### 3.3 Conduct & Behaviour Metric (30% Weight)
- Starts at a baseline of 100 points.
- Modifies score based on teacher logs (+ points for positive merits, - points for infractions).
- Clamped between $[0, 120]$.
- Normalized score:
  - $\ge 100 \rightarrow 0$ risk
  - $60 \text{ to } 99 \rightarrow \frac{100 - \text{conduct}}{40} \times 100$
  - $< 60 \rightarrow 100$ risk

### 3.4 Risk Classification Tiers
- **High Risk:** Risk Score $\ge 70$
- **Medium Risk:** Risk Score $40 - 69$
- **Low Risk:** Risk Score $< 40$

---

## 4. Google Gemini AI Integration

All generative AI workflows use the official `@google/genai` TypeScript SDK server-side.

### 4.1 Client Initialization
```typescript
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return aiClient;
}
```

### 4.2 Schema-Enforced Structured Generation
Calls use `config.responseMimeType = 'application/json'` paired with strict `responseSchema` definitions:
- **`POST /api/generate-lesson`**: Takes `{ teacherId, lessonPlanId }`, queries `gemini-3.5-flash`, and returns title, keyPoints array, classroom lecture script, structured slide objects (slideNumber, title, bulletPoints, visualDescription), and a narrated walkthrough script.
- **`POST /api/generate-warning`**: Ingests all diagnostic metrics (marks, absences, behaviour incidents) and outputs an empathetic, culturally authentic email draft ready for review.

### 4.3 Deterministic Offline Fallbacks
If `GEMINI_API_KEY` is not present or set to a placeholder, the system activates an internal fallback generator that yields contextual responses for Calculus and Life Sciences topics. This ensures zero demo crashes regardless of environment state.

---

## 5. Frontend Architecture & Portals

The frontend is organized into modular functional components under `src/components/`:

### 5.1 Portal Hierarchy
```
src/App.tsx (Root Shell, Global Pitch Guide & Role Navigation)
 ├── AdminPortal.tsx (Institutional Oversight, Teacher Absenteeism, Early-Warning Desk)
 ├── StudentPortal.tsx (Learner Desk, Lesson Slides, Audio Teleprompter, CASS Scores)
 ├── ParentPortal.tsx (Advisory Inbox, Tutoring Enrollment, Fee Payments, Sick Note Uploads)
 └── DriverPortal.tsx (Scholar Transport, Real-Time Boarding, Delay Broadcasts)
```

### 5.2 Browser Capabilities & Integrations
1. **Web Speech Synthesis API (`window.speechSynthesis`):**
   - Implemented in `StudentPortal.tsx`.
   - Allows learners to listen to the AI-generated narrated lesson walkthrough.
   - Provides play, pause, resume, and voice pitch/rate tuning.
2. **HTML5 Drag-and-Drop API:**
   - Implemented in `ParentPortal.tsx`.
   - Enables parents to drag and drop doctor's medical certificates (PDF, JPG, PNG) to prevent automated zero-mark CASS penalties.
3. **Interactive Pitch Assistant Guide:**
   - Global interactive walkthrough banner in `App.tsx` guiding stakeholders through the 4-step demonstration lifecycle.

---

## 6. API Endpoints Reference

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/state` | Returns full school state, logs, and aggregated statistics | _None_ | Full JSON State Object |
| `POST` | `/api/state/reset` | Resets state to default seed data | `{}` | `{ success: true, message: string }` |
| `POST` | `/api/teachers/toggle` | Toggles teacher status (`Active` / `Absent`) | `{ teacherId, status }` | `{ success: true, teacher }` |
| `POST` | `/api/logs/mark` | Appends a student assessment score | `{ studentId, subject, testName, markValue, maxMark }` | `{ success: true, mark }` |
| `POST` | `/api/logs/attendance` | Logs attendance event | `{ studentId, status, reason? }` | `{ success: true, attendance }` |
| `POST` | `/api/logs/behaviour` | Logs conduct incident or merit | `{ studentId, category, description, points }` | `{ success: true, log }` |
| `POST` | `/api/messages/save` | Updates message draft or marks as Sent | `{ studentId, title, body, status }` | `{ success: true, message }` |
| `POST` | `/api/generate-lesson` | Invokes Gemini to compile substitute lesson | `{ teacherId, lessonPlanId }` | `{ success: true, lesson }` |
| `POST` | `/api/generate-warning` | Invokes Gemini to draft early-warning email | `{ studentId }` | `{ success: true, message }` |
