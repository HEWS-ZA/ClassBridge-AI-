# ClassBridge AI — Agent Operations & LLM Engineering Guide (AGENTS.md)

Welcome to the **ClassBridge AI** agent operations specification. This document guides automated coding assistants, autonomous AI agents, and LLM engineers working on or maintaining this repository.

---

## 1. System Mission & Context

**ClassBridge AI** is an EdTech operating platform built for South African public and semi-private secondary schools (grounded in the CAPS curriculum — Curriculum and Assessment Policy Statement, exemplified by Phakamani Secondary School in Gauteng).

The system addresses two critical challenges in South African education:
1. **Teacher Absenteeism / Disruptions (Continuity Mode):** Instantaneous generation of curriculum-aligned, interactive substitute lesson slides, teacher lecture scripts, and narrated audio walkthroughs via Google Gemini.
2. **Learner Disengagement & Drop-Out Risk (Early-Warning Mode):** Continuous multi-factor algorithmic risk scoring (Academic Mark trends, CASS compliance, Attendance rates, Educator Conduct logs), paired with empathetic, human-in-the-loop AI draft communication to parents and closed-loop remediation booking.

---

## 2. Agent Operational Boundaries & Safety

When interacting with or extending this codebase, all autonomous agents MUST adhere to the following hard rules:

### A. Environment & Framework Discipline
- **Runtime:** Node.js (v20+) with `express` server and `vite` middleware in dev mode (`"dev": "tsx server.ts"`).
- **Frontend:** React 19 SPA with TypeScript (`~5.8`), styled with Tailwind CSS v4 (`@tailwindcss/vite` and `@import "tailwindcss";`).
- **Port:** Dev server binds to port `3000` on host `0.0.0.0`.
- **HMR:** Hot Module Replacement may be restricted in sandboxed environments; verify build output using `npm run lint` (`tsc --noEmit`) and `npm run build`.

### B. LLM API Key & Client Discipline
- **Zero Client-Side LLM Leaks:** Never instantiate `@google/genai` on the client/browser bundle. The client MUST communicate with `/api/generate-lesson` and `/api/generate-warning`.
- **Environment Key:** `GEMINI_API_KEY` is loaded on the server via `dotenv.config()`.
- **Graceful Deterministic Fallback:** In development, CI, or demo mode where `GEMINI_API_KEY` is absent or set to the placeholder `MY_GEMINI_API_KEY`, the server provides high-fidelity simulated fallback responses without crashing.
- **Model Standard:** Always prefer `gemini-3.5-flash` or the latest active Gemini Flash alias for speed, structured JSON output (`responseMimeType: 'application/json'`), and cost efficiency.

### C. South African Educational Authenticity (Tone & Terminology)
- Keep terminology culturally and institutionally authentic to South African secondary schooling:
  - **Grades:** Grade 8 through Grade 12 (Matric).
  - **Curriculum:** CAPS (Curriculum and Assessment Policy Statement), NSC (National Senior Certificate), SACAI/IEB standards.
  - **Assessment:** CASS (Continuous Assessment), Trials / Prelims, June/November examinations.
  - **Tone:** Empathetic, respectful, community-focused ("Batho Pele" principles), encouraging Ubuntu and partnership between school and home.

---

## 3. Core AI Workflows & Prompts

### 3.1 Continuity Mode: Substitute Lesson Generator
- **Trigger Endpoint:** `POST /api/generate-lesson`
- **Payload:** `{ teacherId: string, lessonPlanId: string }`
- **Model:** `gemini-3.5-flash`
- **Output Schema:**
```json
{
  "title": "string",
  "keyPoints": ["string"],
  "script": "string",
  "slides": [
    {
      "slideNumber": 1,
      "title": "string",
      "bulletPoints": ["string"],
      "visualDescription": "string"
    }
  ],
  "narratedWalkthrough": "string"
}
```
- **Prompt Guardrails:**
  - Strict JSON mode (`responseMimeType: 'application/json'`) using Type schema validation.
  - Must produce between 4 to 5 interactive slides.
  - Must include actionable visual descriptions for diagrams (e.g., chloroplasts, Cartesian coordinates, circuit diagrams).

### 3.2 Early-Warning Mode: Parent Outreach Generator
- **Trigger Endpoint:** `POST /api/generate-warning`
- **Payload:** `{ studentId: string }`
- **Model:** `gemini-3.5-flash`
- **Output Schema:**
```json
{
  "title": "string",
  "body": "string"
}
```
- **Prompt Guardrails:**
  - Must ingest real diagnostics: current term mark average, individual test scores, unexcused absence count, and conduct incidents.
  - Must follow the 5-point consultative structure:
    1. Warm greeting addressing the parent by full name.
    2. Affirmation of student potential and talent.
    3. Transparent, non-punitive breakdown of flagged concerns.
    4. Practical, funded school remediation options (e.g. afternoon CAPS tutoring 14:30–15:30).
    5. Explicit call to action (confirming counseling session or replying directly).
  - Saved automatically to server state as `'Draft'` status for Human-in-the-Loop Principal review.

---

## 4. Multi-Role Ecosystem & Contexts

ClassBridge AI features four synchronized portals driven by unified backend state:

1. **Admin Portal (`/` role='admin'):**
   - Headmaster & Department Head view.
   - Real-time teacher roster with instant Absence toggle.
   - AI Continuity generator triggering automated substitute lessons.
   - Student risk matrix with early-warning dispatch and draft editor.
   - Mark, attendance, and conduct logging drawers.

2. **Student Portal (`/` role='student'):**
   - Learner interactive desk.
   - Live substitute lesson viewer with animated slide carousel, script teleprompter, and audio synthesis narration player (Web Speech API).
   - Personal CASS mark log, attendance gauge, and conduct merit tracking.

3. **Parent Portal (`/` role='parent'):**
   - Closed-loop advisory inbox receiving principal communications.
   - 1-click compulsory CAPS tutoring booking and real-time callback request reply.
   - Account statement viewer with mock card payment gateway.
   - Medical doctor's absence certificate upload manager (supports drag-and-drop PDF/image).

4. **Driver Portal (`/` role='driver'):**
   - Scholar transport driver terminal ("Baba Sipho" - Soweto Route A).
   - Real-time student passenger boarding checklist.
   - 1-click broadcast notification for transport delays (e.g., Golden Highway traffic).

---

## 5. Agent Instructions for Code Modification

When asked to implement new features or fix bugs:
1. **Never break existing APIs:** If modifying endpoints in `server.ts`, ensure `src/types.ts` and the four client portals stay in sync.
2. **Keep the Dark Modern Aesthetic:** Follow `DESIGN_SYSTEM.md` for consistent `#050608` deep dark background, `#0c0e14` surfaces, Sky-500 interactive accents, and font pairings.
3. **Always Run Checks:** Validate changes by invoking `npm run lint` (`tsc --noEmit`) and verifying the Vite compilation.
4. **Preserve Seed Data Integrity:** `src/data/seedData.ts` contains realistic South African names, CAPS subjects (Mathematics, Life Sciences, Physical Sciences), and grading bands. Maintain this realistic baseline.
