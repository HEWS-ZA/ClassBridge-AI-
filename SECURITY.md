# ClassBridge AI — Security & Data Privacy Policy (SECURITY.md)

This document establishes the security guidelines, regulatory compliance standards, key management policies, and vulnerability disclosure procedures for **ClassBridge AI**.

---

## 1. Regulatory Context: South African POPIA Compliance

Because ClassBridge AI processes learner performance data, attendance records, and parent contact details, the system operates under the legal framework of the **Protection of Personal Information Act (POPIA), Act No. 4 of 2013** of the Republic of South Africa.

### 1.1 Special Personal Information of Children (Section 34–35)
- Under POPIA, information relating to minors (learners under age 18) constitutes **Special Personal Information**.
- Processing is legally justified exclusively under **Section 35(1)(a)** (with explicit consent of a competent person/parent/guardian) and **Section 35(1)(c)** (obligation in law for school administration and academic continuity).
- Data records (marks, conduct points, attendance rates) must never be shared, sold, or surfaced to third-party commercial ad networks.

### 1.2 Data Minimization & Retention
- The system only ingests variables strictly required for curriculum delivery and risk intervention: learner name, grade, parent contact details, marks, and attendance status.
- Sensitive biological, health, or residential location data is excluded from automated prompt generation.
- Medical certificates submitted via the Parent Portal are held under restricted access for CASS verification only.

---

## 2. API Key Management & Credential Boundaries

### 2.1 Server-Side Proxy Isolation
- **Rule 1:** The Google Gemini API key (`GEMINI_API_KEY`) is **NEVER** bundled into the client-side browser application or exported via `VITE_` prefixed environment variables.
- **Rule 2:** All LLM interactions are proxied through server-side Express routes (`/api/generate-lesson` and `/api/generate-warning`).
- **Rule 3:** The `.env` file containing secrets is added to `.gitignore`. An example template without secrets is maintained in `.env.example`.

### 2.2 Fallback Shield
- If `GEMINI_API_KEY` is missing or contains the default placeholder `MY_GEMINI_API_KEY`, the server logs a warning and routes calls through an internal, deterministic educational generator.
- This prevents unhandled server exceptions, credential leakage in stack traces, or disruption of classroom activities during network interruptions.

---

## 3. LLM Security & Prompt Defense

ClassBridge AI interacts with large language models to generate classroom substitute lesson slides and parent communications. To guard against prompt injection, jailbreaking, or data exfiltration, the following controls are enforced:

### 3.1 Strict Schema Enforcement
Both LLM endpoints utilize the `@google/genai` SDK's structured output mode (`responseMimeType: 'application/json'`) with declarative `responseSchema` specifications:
- Any attempts by injected input to alter the structure or emit arbitrary executable scripts are rejected at the parsing boundary.
- The server performs strict `JSON.parse` with schema boundary validation prior to appending lessons or messages to application state.

### 3.2 Human-in-the-Loop Safeguards
- Generated parent communications are **NEVER dispatched automatically**.
- The system saves generated communications with a `status: 'Draft'` flag.
- A human administrator (Principal, Vice-Principal, or Grade Head) must review, optionally edit, and explicitly trigger the dispatch (`status: 'Sent'`).

---

## 4. Portal Access Controls & Segmentation

ClassBridge AI is designed with four distinct operating boundaries:

| Portal | Intended User | Read Access | Write Access |
| :--- | :--- | :--- | :--- |
| **Admin Portal** | Principals, HODs, Grade Heads | Full school roster, risk scores, teacher status, all drafts | Teacher toggles, marks, attendance, behaviour logs, message dispatch |
| **Student Portal** | High School Learners | Personal marks, personal attendance, published substitute lessons | Speech playback controls, slide navigation |
| **Parent Portal** | Parents / Legal Guardians | Child-specific advisory inbox, child marks & attendance, fee invoices | Remediation bookings, direct replies, medical note uploads |
| **Driver Portal** | Scholar Transport Staff | Route passenger list, boarding checklist | Passenger boarding toggle, delay alert broadcasts |

*Note for production deployments:* In enterprise deployments, role switching is authenticated via OpenID Connect (OIDC), Google Workspace for Education, or South African Provincial Education Department single sign-on (SSO).

---

## 5. Network & Operational Security

1. **Host Binding:** The server listens on `0.0.0.0:3000` to support containerized cloud execution (Google Cloud Run / Kubernetes).
2. **Payload Limiting:** Express JSON middleware is constrained to reasonable payload sizes to prevent Denial of Service (DoS) attacks via oversized request bodies.
3. **No Direct OS Execution:** The web application does not execute arbitrary shell commands or expose shell evaluation endpoints to clients.

---

## 6. Vulnerability Reporting

If you discover a security vulnerability or privacy concern within ClassBridge AI:
1. Do not open a public issue.
2. Email detailed reproduction steps to the project security maintainers at: `sefellethekiso@gmail.com`.
3. Provide an actionable description of the vulnerability, affected components, and potential impact.
4. Security patches will be prioritized and deployed with high urgency.
