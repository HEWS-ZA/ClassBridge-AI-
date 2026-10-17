# ClassBridge AI

> **South African Secondary School Academic Continuity & Early-Warning Operating System**  
> *Bridging classrooms during teacher absences and protecting learner trajectories through algorithmic risk detection and empathetic, closed-loop parent partnership.*

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%203.5%20Flash-8e44ad)](https://ai.google.dev/)

---

## 🌟 The Challenge & The Mission

Across South African high schools (such as Phakamani Secondary in Gauteng), schools face two interconnected systemic vulnerabilities:
1. **Teacher Disruptions & Uncovered Periods:** Unplanned educator illness, official department training, or transit delays often leave entire matric classes without subject-matter instruction during critical CAPS curriculum windows.
2. **Delayed Intervention in Learner Drop-Out Risk:** Warning signs—such as a single test failure, unexcused Friday absences, or subtle disengagement—compound in silence until end-of-year exams or trial exams, when intervention is too late.

**ClassBridge AI** solves this through a unified, 4-portal institutional platform powered by the **Google Gemini API** and an **algorithmic multi-factor diagnostic engine**.

---

## 🚀 Key Capabilities

### 1. 🔄 Continuity Mode (Instant Substitute Lessons)
When an educator is flagged as absent, ClassBridge AI immediately retrieves their CAPS curriculum syllabus position and generates:
- **Interactive Teaching Slides:** Complete with conceptual explanations, step-by-step mathematical derivations, and visual diagrams.
- **Educator Lecture Script:** An engaging, South African context-oriented teaching script designed for substitute teachers or class prefects.
- **Audio Teleprompter & Narration:** An automated walkthrough powered by the browser's native **Web Speech Synthesis API**, allowing self-paced or classroom-wide playback.

### 2. ⚠️ Early-Warning Diagnostic Engine
A continuous composite risk scoring model:
$$\text{Composite Risk} = (40\% \times \text{Marks Trend}) + (30\% \times \text{Attendance}) + (30\% \times \text{Conduct})$$
- Detects subtle declining score trajectories (e.g. failing a second math test in a row triggers a **+15% declining trend penalty**).
- Automatically triggers a **Human-in-the-Loop** draft communication to parents, authored in an empathetic, collaborative South African administrative tone.
- Saves drafts for Principal review and 1-click dispatch.

### 3. 👨‍👩‍👧 Parent Closed-Loop Portal
Parents receive real-time, actionable alerts on their smartphones:
- **Direct Advisory Inbox:** Review official school advisories with full context.
- **1-Click Remediation Booking:** Instant enrollment in funded afternoon CAPS tutoring (Monday–Thursday 14:30–15:30) with zero friction.
- **Callback Request:** Direct response loop routed immediately to administrative desks.
- **Fee Settlement:** Transparent view of high school fees and stationery levies with a simulated credit card gateway.
- **Absence Medical Note Upload:** Drag-and-drop doctor's sick note submission to prevent zero-mark default penalties under CASS regulations.

### 4. 🚐 Scholar Transport Driver Terminal
Designed for scholar transport operators ("Baba Sipho" - Soweto Route A):
- Live passenger boarding checklist.
- 1-click broadcast notification for transit delays (e.g. Golden Highway traffic) dispatched to both school administration and waiting parents.

---

## 🏛️ Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 SPA with TypeScript 5.8 |
| **Bundler & Build Tool**| Vite 6 |
| **Styling & Design** | Tailwind CSS v4 (`@tailwindcss/vite`), custom dark theme token scale |
| **Backend & API** | Node.js (v20+), Express 4 |
| **Development Server** | Programmatic Vite middleware mounted in `server.ts` via `tsx` |
| **Production Server** | Bundled CommonJS server (`dist/server.cjs`) compiled via `esbuild` |
| **AI & LLM Services** | Google Gemini 3.5 Flash via official `@google/genai` TypeScript SDK |
| **Typography** | Playfair Display (Serif), Plus Jakarta Sans, Fira Code (Mono) |
| **Iconography** | Lucide React |

---

## 📂 Repository Documentation

Detailed engineering documentation is organized into dedicated topic specifications:

- **[AGENTS.md](./AGENTS.md):** Guidelines for autonomous coding assistants, prompt contracts, and safety boundaries.
- **[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md):** Visual tokens, color palettes (`#050608`, `#0c0e14`, `sky-500`), typography hierarchy, and anti-pill geometry rules.
- **[ARCHITECTURE.md](./ARCHITECTURE.md):** System topology, algorithmic risk calculation formula, Gemini API proxying, and data schemas.
- **[SECURITY.md](./SECURITY.md):** South African POPIA compliance for learner data, server-side API key isolation, and prompt injection defense.
- **[CODE_STYLE.md](./CODE_STYLE.md):** TypeScript standards, React functional architecture, naming conventions, and file organization.
- **[TESTING.md](./TESTING.md):** Risk score unit tests, API integration verification, and manual QA checklists for all 4 portals.
- **[SYSTEM_ANALYSIS_AND_ROADMAP.md](./SYSTEM_ANALYSIS_AND_ROADMAP.md):** In-depth system analysis, architectural evaluation, and prioritized engineering implementation roadmap.

---

## 🛠️ Quick Start

### 1. Prerequisites
- **Node.js**: v20 or later
- **npm**: v10 or later
- **Gemini API Key**: (Optional for basic simulation, recommended for live generative capabilities)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/classbridge-ai.git
cd classbridge-ai

# Install dependencies
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Add your Google Gemini API key:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
```
*(Note: If no API key is provided, the server operates using realistic built-in educational simulations, preventing any demo crashes).*

### 4. Run Development Server
```bash
npm run dev
```
The application will be live at `http://localhost:3000`.

---

## 📜 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Express server with Vite middleware in development mode via `tsx` |
| `npm run build` | Compiles the Vite client bundle and packages `server.ts` with `esbuild` into `dist/` |
| `npm start` | Runs the compiled production server (`node dist/server.cjs`) |
| `npm run lint` | Runs TypeScript static type checking without emitting files (`tsc --noEmit`) |
| `npm run clean` | Removes compiled artifacts (`dist/`) |

---

## 🔒 Privacy & POPIA Notice

ClassBridge AI is engineered to comply with the South African **Protection of Personal Information Act (POPIA), Act 4 of 2013**, specifically safeguarding the **Special Personal Information of Minors** (Sections 34–35). Learner diagnostics are processed strictly for legitimate academic continuity and parent partnership.

---

## 📄 License

ClassBridge AI is open-source software licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
