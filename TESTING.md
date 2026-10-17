# ClassBridge AI — Testing & Quality Assurance Guide (TESTING.md)

This document details the testing strategy, validation procedures, quality assurance checklists, and verification commands for **ClassBridge AI**.

---

## 1. Testing Strategy Overview

ClassBridge AI employs a tiered testing methodology designed to validate both deterministic algorithmic logic (risk scoring) and stochastic generative outputs (Gemini API), while ensuring seamless UX across all four user portals.

```
+-------------------------------------------------------------------+
|               End-to-End Multi-Portal QA Checklist                |
|           (Admin, Student, Parent, Driver User Journeys)          |
+---------------------------------+---------------------------------+
                                  |
+---------------------------------v---------------------------------+
|             API & LLM Integration Verification Tests              |
|        (/api/state, /api/generate-lesson, /api/generate-warning)  |
+---------------------------------+---------------------------------+
                                  |
+---------------------------------v---------------------------------+
|         Algorithmic Risk Calculation Unit Assertions              |
|          (Marks Trend, Attendance, Conduct Clamping)              |
+---------------------------------+---------------------------------+
                                  |
+---------------------------------v---------------------------------+
|            Static Analysis & Type Integrity Validation            |
|                     (npm run lint / tsc --noEmit)                 |
+-------------------------------------------------------------------+
```

---

## 2. Static Analysis & Compilation Checks

### 2.1 TypeScript Type Checking
Validates all types, prop interfaces, and API contracts:
```bash
npm run lint
```
*Expected Output:* `tsc --noEmit` exits with status `0` and zero errors.

### 2.2 Production Build Verification
Ensures both the Vite frontend bundle and the esbuild backend bundle compile cleanly:
```bash
npm run build
```
*Expected Output:* Generates `/dist` directory containing `index.html`, bundled client chunks, and `dist/server.cjs`.

---

## 3. Algorithmic Risk Engine Verification

The risk score model in `server.ts` calculates a 0–100 composite score from three diagnostic streams:

### 3.1 Test Case: Declining Mark Trend Penalty
- **Condition:** Student has two Mathematics assessments where the latest score is lower than the previous score (e.g. 58% followed by 42%).
- **Expected Behavior:** `marksRiskScore` receives an automatic `+15%` trend penalty, effectively increasing the composite risk score and elevating risk level from `Medium` to `High`.

### 3.2 Test Case: Attendance Drop Thresholds
- **Condition:** Student attendance falls below 75%.
- **Expected Behavior:** `attRiskScore` evaluates to `100`, contributing a full 30 points to the composite risk score.

### 3.3 Test Case: Conduct Score Clamping
- **Condition:** Teacher logs negative conduct points exceeding 120 demerits.
- **Expected Behavior:** `conductScore` is clamped to a minimum of `0` (never negative), and `conductRiskScore` is capped at `100`.

---

## 4. API Endpoint Integration Testing

Using `curl` or REST test clients, verify core endpoints against the running server:

### 4.1 System Health & State Retrieval
```bash
curl -X GET http://localhost:3000/api/state
```
- **Validation Criteria:** Returns HTTP 200 with non-empty arrays for `students`, `teachers`, `lessonPlans`, and aggregated `stats`.

### 4.2 State Reset
```bash
curl -X POST http://localhost:3000/api/state/reset
```
- **Validation Criteria:** Returns `{ success: true, message: 'State successfully reset to seed defaults' }`.

### 4.3 Teacher Absence Toggle
```bash
curl -X POST http://localhost:3000/api/teachers/toggle \
  -H "Content-Type: application/json" \
  -d '{"teacherId": "teach-1", "status": "Absent"}'
```
- **Validation Criteria:** Teacher status updates to `'Absent'`, and `absentSince` contains the current date string.

### 4.4 Gemini Substitute Lesson Generation
```bash
curl -X POST http://localhost:3000/api/generate-lesson \
  -H "Content-Type: application/json" \
  -d '{"teacherId": "teach-1", "lessonPlanId": "lp-1"}'
```
- **Validation Criteria:**
  - Returns HTTP 200 with `{ success: true, lesson: { ... } }`.
  - `lesson.slides` contains an array of at least 2 structured slides with `slideNumber`, `title`, `bulletPoints`, and `visualDescription`.
  - `lesson.script` and `lesson.narratedWalkthrough` are populated strings.

### 4.5 Gemini Early-Warning Email Generation
```bash
curl -X POST http://localhost:3000/api/generate-warning \
  -H "Content-Type: application/json" \
  -d '{"studentId": "stud-1"}'
```
- **Validation Criteria:**
  - Returns HTTP 200 with `{ success: true, message: { ... } }`.
  - `message.status` is strictly `'Draft'` (verifying human-in-the-loop requirement).
  - `message.title` and `message.body` are populated with culturally tailored text.

---

## 5. Portal Manual QA Checklists

### 5.1 Admin Portal QA
- [ ] **Teacher Roster:** Click "Mark Absent" on an active educator. Confirm the badge switches to red "Absent" and Continuity Mode prompts generation.
- [ ] **Continuity Lesson Dispatch:** Click "Generate AI Substitute Lesson". Verify loading state, completion, and toast indicator.
- [ ] **Student Risk Matrix:** Review student cards. Confirm High Risk students are highlighted with red border and warning tags.
- [ ] **Action Drawers:**
  - Add Mark: Select student, enter 35/100, submit. Verify student's average recalculates and risk score increases.
  - Log Attendance: Mark student Absent with reason "Truancy". Confirm attendance rate drops.
  - Log Behaviour: Add -15 points for "Disrupting class". Confirm conduct drops.
- [ ] **Review & Send Draft:** Open the generated draft message, click "Edit & Send to Parent". Verify status updates to "Sent".

### 5.2 Student Portal QA
- [ ] **Student Profile Switcher:** Switch between Thabo Mokoena (High Risk) and Lerato Khumalo (Low Risk). Confirm stats update.
- [ ] **Substitute Lesson Player:**
  - Verify slide navigation buttons (`Next Slide`, `Previous Slide`).
  - Verify slide counter (`Slide 2 of 4`).
  - Verify visual prompt callout displays diagram descriptions.
- [ ] **Speech Synthesis:** Click "Play Narration". Verify audio playback begins via the Web Speech API. Click "Pause" and confirm playback pauses.
- [ ] **CASS Progress Tab:** Verify test mark breakdown displays CAPS percentages and color-coded status chips.

### 5.3 Parent Portal QA
- [ ] **Advisory Inbox:** Open inbox tab. Confirm AI draft or sent message appears with school letterhead styling.
- [ ] **Remediation Action:** Click "Confirm Enrollment (R0 Fee)" for afternoon CAPS tutoring. Confirm badge changes to "Learner Enrolled & Confirmed".
- [ ] **Direct Reply:** Enter a reply message in the textarea and submit. Verify confirmation banner appears.
- [ ] **Fee Statements & Payment:**
  - Click "Pay" on the High School Fees item.
  - Fill out cardholder name and click "Pay".
  - Verify processing state and subsequent "Payment Successful" confirmation with receipt reference.
- [ ] **Doctor's Note Upload:**
  - Drag and drop a sample PDF or image file into the drop zone.
  - Confirm file is appended to "Uploaded Absence Submissions" with size, timestamp, and "Transmitted" badge.

### 5.4 Driver Portal QA
- [ ] **Transit Manifest:** Verify student passenger list for Soweto Route A.
- [ ] **Boarding Check:** Click "Mark as Boarded" / "Undo Boarding" for individual learners. Confirm counter updates (`2 / 4 Boarded`).
- [ ] **Delay Broadcast:** Select delay reason ("Traffic on Golden Highway"), click "Broadcast Delay Alert". Verify transition through "Broadcasting..." to "Alert Transmitted to School & Parents".
