# ClassBridge AI — Code Style & Engineering Standards (CODE_STYLE.md)

This document defines the coding conventions, architectural patterns, directory structure, and linting standards for **ClassBridge AI**.

---

## 1. Core Principles

- **Clarity over cleverness:** Code should be readable, well-typed, and easy for any engineer or automated agent to maintain.
- **Strict Typing:** Avoid `any` wherever possible. Define models in `src/types.ts` and share them across frontend and backend.
- **Cohesive Component Architecture:** Group portal-specific UI, modals, and interaction states inside dedicated components within `src/components/`.
- **Zero Style Leakage:** Rely strictly on Tailwind CSS v4 utility classes and CSS theme variables defined in `src/index.css`. Never write ad-hoc inline styles or unmanaged CSS files.

---

## 2. Project Directory Structure

```
├── .env.example              # Environment variables template
├── assets/                   # Static binary/image assets
├── index.html                # HTML entry point with metadata & Google Fonts
├── metadata.json             # AI Studio applet capabilities & metadata
├── package.json              # Dependencies and build scripts
├── server.ts                 # Full-stack Express backend & Vite middleware
├── tsconfig.json             # TypeScript compiler configuration
├── vite.config.ts            # Vite bundler configuration with Tailwind plugin
└── src/
    ├── App.tsx               # Root component, global role switcher & pitch guide
    ├── index.css             # Tailwind v4 import, theme tokens, and custom scrollbar
    ├── main.tsx              # React DOM mounting entry point
    ├── types.ts              # Canonical domain interfaces and TypeScript types
    ├── components/
    │   ├── AdminPortal.tsx   # Principal & HOD institutional control center
    │   ├── DriverPortal.tsx  # Scholar transport terminal & boarding check
    │   ├── ParentPortal.tsx  # Advisory inbox, fee payments & medical uploads
    │   └── StudentPortal.tsx # Learner desk, interactive slides & audio narration
    └── data/
        └── seedData.ts       # Realistic South African CAPS seed datasets
```

---

## 3. TypeScript Guidelines

### 3.1 Strict Data Models
All shared data structures must be exported from `src/types.ts`.
```typescript
// Good: Clear, explicit contract
export interface Student {
  id: string;
  name: string;
  grade: string;
  riskScore: number; // 0 to 100
  riskLevel: 'Low' | 'Medium' | 'High';
  attendancePercent: number;
  averageMark: number;
  conductScore: number;
}
```

### 3.2 Typing Handlers & State
- Always type async handlers and state setters explicitly when the type cannot be inferred:
```typescript
const [role, setRole] = useState<'admin' | 'student' | 'parent' | 'driver'>('admin');
const handleToggle = async (id: string, status: 'Active' | 'Absent'): Promise<void> => { ... };
```

---

## 4. React Component Standards

### 4.1 Functional Components & Hooks
- All components must be functional using standard React 19 hooks (`useState`, `useEffect`, `useRef`, `useMemo`).
- Avoid class components.
- Keep components modular: extract sub-modals, drawers, or heavy sections if lines exceed manageable limits.

### 4.2 State Synchronization & API Calls
- When executing API mutations (e.g., logging a mark or generating a substitute lesson), trigger an immediate re-fetch (`await fetchState()`) or update the state optimistically to guarantee UI reactivity.
- Catch errors and display clear, non-technical feedback to the user.

```typescript
// Good pattern
const handleToggleTeacher = async (teacherId: string, status: 'Active' | 'Absent') => {
  try {
    const res = await fetch('/api/teachers/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, status })
    });
    if (!res.ok) throw new Error('Failed to update teacher presence status');
    await fetchState();
  } catch (err: any) {
    console.error('Error toggling teacher:', err);
    alert(err.message || 'Could not update teacher status');
  }
};
```

---

## 5. Tailwind CSS & Styling Rules

### 5.1 Dark Theme Tokens
Use the predefined tokens from `DESIGN_SYSTEM.md`:
- Backdrop: `bg-[#050608]`
- Surfaces: `bg-[#080a0f]`, `bg-[#0c0e14]`
- Borders: `border-white/5` (subtle), `border-white/10` (standard)
- Interactive Accent: `bg-sky-500` / `text-sky-400` / `hover:bg-sky-400`

### 5.2 Font Utility Usage
- Editorial headings: `font-serif italic`
- UI labels and body text: `font-sans`
- Data numbers, percentages, tags: `font-mono`

### 5.3 Button & Geometry Standards
- Prefer `rounded-sm` (crisp 2–4px radius) for standard cards, inputs, and action buttons.
- Reserve `rounded-full` strictly for small avatar icons or circular progress indicators.
- Include transitions (`transition`) and cursor indicators (`cursor-pointer`).

---

## 6. Naming Conventions

| Category | Convention | Examples |
| :--- | :--- | :--- |
| **Component Files** | PascalCase | `AdminPortal.tsx`, `ParentPortal.tsx` |
| **Functions & Handlers** | camelCase | `handleGenerateLesson`, `updateStudentRiskMetrics` |
| **Constants & Seeds** | UPPER_SNAKE_CASE | `SEED_STUDENTS`, `SEED_TEACHERS` |
| **TypeScript Types** | PascalCase | `Student`, `GeneratedLesson`, `PortalRole` |
| **CSS Custom Properties** | kebab-case | `--color-dark-bg`, `--font-mono` |

---

## 7. Linting & Build Verification

Before committing changes or finalizing builds:
- Run TypeScript checking:
  ```bash
  npm run lint
  ```
  *(Executes `tsc --noEmit` without errors)*
- Run full production bundle build:
  ```bash
  npm run build
  ```
  *(Verifies Vite frontend compilation and esbuild server packaging)*
