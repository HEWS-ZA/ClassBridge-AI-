# ClassBridge AI — System Analysis, Technical Evaluation & Development Roadmap (SYSTEM_ANALYSIS_AND_ROADMAP.md)

This document provides a thorough analysis of **ClassBridge AI**, detailing what the system does today, its architectural strengths and constraints, opportunities for enhanced efficiency and UI/UX, and an actionable, prioritized engineering roadmap of what needs to be developed.

---

## 1. Executive Summary & Educational Mission

**ClassBridge AI** is an EdTech operating platform built for South African secondary schools (aligned with the **CAPS** curriculum — *Curriculum and Assessment Policy Statement*, modeled on institutions such as Phakamani Secondary School in Gauteng).

The platform addresses two chronic, interconnected vulnerabilities in public and semi-private schooling:
1. **Unplanned Educator Absences & Disruptions (Continuity Mode):** When teachers fall ill, attend departmental training, or face transit challenges, classrooms frequently sit unattended. ClassBridge AI generates structured, curriculum-mapped substitute lesson slides, teacher lecture scripts, and interactive voice-narrated walkthroughs via Google Gemini 3.5 Flash in seconds.
2. **Silent Learner Disengagement & Drop-Out Risk (Early-Warning Mode):** Drop-out warning signs (declining CASS assessment trends, Friday truancy, conduct demerits) often compound unnoticed until late matric trials. ClassBridge AI executes continuous multi-factor algorithmic risk scoring, generating empathetic, Human-in-the-Loop parent outreach drafts and closed-loop tutoring enrollment.

---

## 2. Comprehensive System Anatomy (What It Does Today)

ClassBridge AI is built as a single-page application with four synchronized role portals powered by a unified Node.js / Express backend:

```
                                  ClassBridge AI Root (App.tsx)
                                                │
             ┌───────────────────┬──────────────┴──────┬───────────────────┐
             ▼                   ▼                     ▼                   ▼
     ┌──────────────┐    ┌──────────────┐      ┌──────────────┐    ┌──────────────┐
     │ Admin Portal │    │Student Portal│      │Parent Portal │    │Driver Portal │
     └──────┬───────┘    └──────┬───────┘      └──────┬───────┘    └──────┬───────┘
            │                   │                     │                   │
            └───────────────────┴──────────────┬──────┴───────────────────┘
                                               │ REST API
                                               ▼
                                      Express 4 Server (server.ts)
                                  ┌───────────────────────────┐
                                  │ • In-Memory Store (seed)  │
                                  │ • Dynamic Risk Engine     │
                                  │ • Gemini 3.5 Flash Proxy  │
                                  └───────────────────────────┘
```

### 2.1 The Four Operational Portals

#### A. Administrative Command Center (`src/components/AdminPortal.tsx`)
- **Teacher Attendance Roster:** Instant `Active` vs. `Absent` toggles tracking absence dates.
- **Continuity Lesson Trigger:** Automatically flags absent educators and maps to CAPS topics (Calculus Limits, Photosynthesis, Organic Chemistry). Invokes `POST /api/generate-lesson` to compile substitute lessons.
- **Student Risk Matrix:** Real-time risk categorization (`Low`, `Medium`, `High`) combining academic marks, attendance drop-offs, and conduct logs.
- **Human-in-the-Loop Outreach Generator:** Triggers `POST /api/generate-warning` to craft culturally tailored, non-punitive emails to parents. Principals can review, edit, and dispatch messages (`status: 'Sent'`).
- **Data Capture Drawers:** Modals to record new assessment marks, attendance incidents (with reason tracking), and positive merits or concern demerits.

#### B. Student Interactive Desk (`src/components/StudentPortal.tsx`)
- **Substitute Lesson Slide Player:** Interactive carousel showing slide numbers, core concepts, formula breakdowns, and visual diagram prompts.
- **Audio Teleprompter & Speech Synthesizer:** Integrates the browser's native **Web Speech Synthesis API** to voice the narrated walkthrough with play, pause, and scrub controls.
- **Personal Diagnostic Gauge:** Displays the student's Term 2 mark average, attendance percentage bar, and educator conduct merits.

#### C. Parent Partnership Gateway (`src/components/ParentPortal.tsx`)
- **Advisory Inbox:** Displays official school notices with institutional letterhead styling.
- **1-Click Remediation Booking:** Enables parents to enroll learners into funded afternoon CAPS tutoring (Monday–Thursday 14:30–15:30) with a single tap (R0 fee).
- **Two-Way Administrative Feedback:** Direct callback request form routed immediately to grade head desks.
- **Statement of Account & Payments:** Breakdown of outstanding high school fees and stationery levies with a simulated card payment gateway.
- **Doctor’s Absence Certificate Manager:** HTML5 drag-and-drop dropzone for medical certificates (PDF, JPG, PNG) to prevent zero-mark default penalties under provincial CASS rules.

#### D. Scholar Transport Terminal (`src/components/DriverPortal.tsx`)
- **Route Manifest ("Baba Sipho" - Soweto Route A):** Interactive student boarding checklist preventing students from being left behind.
- **Transit Delay Broadcast:** 1-click broadcast notification system (e.g., "Golden Highway traffic congestion") notifying waiting parents and administrators.

---

## 3. Current Architecture & Algorithmic Foundations

### 3.1 Composite Risk Scoring Engine
The backend engine computes a normalized 0–100 risk score on every data mutation:

$$\text{Composite Risk} = (0.40 \times \text{Marks Risk}) + (0.30 \times \text{Attendance Risk}) + (0.30 \times \text{Conduct Risk})$$

1. **Marks Risk (40% Weight):**
   - Arithmetic mean across CASS assessments.
   - **Declining Trend Detection:** Automatically detects if the latest Mathematics test is lower than the previous one, injecting an immediate **+15% penalty**.
2. **Attendance Risk (30% Weight):**
   - Combines baseline term days with recorded absence events. $\ge 95\% = 0$ risk; $< 75\% = 100$ risk.
3. **Conduct Risk (30% Weight):**
   - Baseline of 100 points, modified by educator merit/demerit logs. Clamped between $[0, 120]$.

### 3.2 Gemini AI Integration & Prompt Guardrails
- **SDK:** `@google/genai` TypeScript SDK executed server-side.
- **Model:** `gemini-3.5-flash` with strict JSON schema enforcement (`responseMimeType: 'application/json'`).
- **Prompt Safety:** Input data is sanitized and structured into strict parameter blocks. Output is validated against JSON schemas before saving to state.
- **Fallback Simulation:** Deterministic fallback mode ensures zero crashes in demo environments when an API key is unconfigured.

---

## 4. Evaluation: What Needs to Be Developed

While the core functionality is intact, the following architectural and UI/UX opportunities have been identified to elevate ClassBridge AI into an enterprise-grade production platform:

### 4.1 Backend & Architectural Enhancements

| Area | Current State | Target Solution | Benefit |
| :--- | :--- | :--- | :--- |
| **Data Persistence** | In-memory arrays in `server.ts` reset on server restart | Relational database (PostgreSQL with Drizzle ORM) or Firebase Firestore | Data persistence across server reboots, multi-admin scalability |
| **Live Synchronization** | Client HTTP polling on user action | WebSockets (`socket.io`) or Server-Sent Events (SSE) | Instant driver delay alerts and teacher absence notifications without manual reload |
| **Lesson Caching** | AI regenerates identical topics repeatedly | Redis or in-memory LRU cache keyed by `[Grade, Subject, Topic]` | 70% reduction in Gemini API token costs and sub-50ms lesson retrieval |
| **Batch Risk Optimization** | Synchronous $O(N \times M)$ scan over all students on every log | Incremental student-specific recalculation | Decreases server CPU cycles on high-frequency attendance logging |

### 4.2 Frontend & UI/UX Enhancements

| Component | Current State | Target Solution | Benefit |
| :--- | :--- | :--- | :--- |
| **Admin Risk Matrix** | Unfiltered vertical card list | Search bar + quick status filter tabs (`All`, `High Risk`, `Declining Trend`) + sorting | Instant triage for schools with hundreds of matric learners |
| **Lesson Slide Player** | Embedded widget inside 2-column grid | **Full-Screen Projector Mode (F11/Theater)** with high-contrast text | Enables substitute teachers to project directly onto classroom whiteboards |
| **Scientific Diagrams** | Text descriptions of diagrams | Embedded dynamic SVG diagrams (Cartesian planes, chloroplasts, circuits) | Visual engagement for learners without relying on external images |
| **Driver Terminal** | Standard web buttons | Large thumb-friendly tap targets (`h-14`) with haptic/audio confirmation | Prevents driver distraction and mis-taps on mobile devices |
| **Parent Communication** | In-app inbox simulation | **WhatsApp / SMS bubble preview toggle** | Mirrors how South African parents actually consume school notifications |

---

## 5. Development Roadmap & Implementation Plan

### Phase 1: High-Impact UI & Usability (Short-Term: 1–2 Sprints)
- [ ] **Admin Matrix Filtering & Search:**
  - Add real-time name/grade search input.
  - Add filter buttons: `All Students`, `Critical Risk (≥70)`, `Declining Marks`, `Truancy Alerts`.
  - Add sorting by Risk Score descending.
- [ ] **Classroom Projector Mode:**
  - Add a dedicated "Projector View" button to the Student slide player.
  - Render high-contrast, scalable typography optimized for classroom projectors.
  - Add keyboard navigation (Arrow Left / Arrow Right / Spacebar).
- [ ] **Driver Terminal Mobile Ergonomics:**
  - Increase button height to 56px (`h-14`) for one-touch boarding toggles.
  - Add prominent status banners with visual color indicators.

### Phase 2: Rich Media & Communication Realism (Medium-Term: 2–3 Sprints)
- [ ] **Dynamic SVG Diagram Engine:**
  - Build specialized SVG renderers for:
    - Mathematics: Cartesian plane with tangent lines and limits.
    - Life Sciences: Cell structure and photosynthesis flow.
    - Physical Sciences: Electric circuit diagrams.
- [ ] **WhatsApp & SMS Simulation in Parent Portal:**
  - Provide a toggle in Parent Portal to view notifications as an authentic WhatsApp chat bubble or green SMS thread with delivery checkmarks.
- [ ] **CASS Progress Trend Sparklines:**
  - Embed mini inline SVG trend charts on student cards indicating term assessment trajectory.

### Phase 3: Scalability, Persistence & Production Readiness (Long-Term: 3–5 Sprints)
- [ ] **Persistent Database Layer:**
  - Migrate in-memory state to PostgreSQL (via Drizzle ORM) or Firestore.
  - Implement foreign key constraints and audit logging.
- [ ] **Real-Time Push Notifications:**
  - Implement SSE (Server-Sent Events) for instant transit delay alerts.
  - Display non-intrusive toast notifications across portals when state updates.
- [ ] **Curriculum Lesson Cache:**
  - Implement LRU caching for common CAPS lesson topics to reduce API latency and cost.
- [ ] **Role-Based Authentication (RBAC):**
  - Integrate OpenID Connect / Google Workspace for Education / Gov.za SSO.

---

## 6. Verification & Quality Standards

When implementing items from this roadmap:
1. **Maintain Type Safety:** All new models and payloads must be added to `src/types.ts`.
2. **Follow Design Tokens:** Adhere strictly to the color tokens and typography defined in `DESIGN_SYSTEM.md`.
3. **Run Static Checks:** Verify each phase with `npm run lint` (`tsc --noEmit`) and `npm run build`.
4. **Preserve Educational Authenticity:** Retain South African CAPS curriculum alignment and respectful communication tone.
