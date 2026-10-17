# ClassBridge AI — Design System & Visual Specification (DESIGN_SYSTEM.md)

This document outlines the visual identity, token architecture, component styling principles, and typographic discipline of **ClassBridge AI**.

---

## 1. Design Philosophy

ClassBridge AI is designed as a **mission-critical institutional workstation** for school principals, department heads, learners, and parents. Its aesthetic avoids juvenile or toy-like educational tropes in favor of an **authoritative, high-density, modern editorial dark theme**.

### Core Tenets:
1. **Editorial & Scholastic Tone:** Pair academic serif headings with razor-sharp geometric sans-serif for UI labels and crisp monospaced tags for quantitative data.
2. **Atmospheric Dark Surfaces:** A 4-tier dark depth model that provides contrast without eye strain in high-glare classroom or office environments.
3. **Intentional Chromatic Accents:** Electric Sky-Blue (`sky-500`) serves as the primary interactive catalyst, supported by strict semantic indicators (Emerald for healthy metrics, Crimson for critical risks, Amber for moderate alerts).
4. **Anti-Pill Geometry:** Clean, purposeful rectangles with subtle `rounded-sm` corners (2px to 4px) replace bubbly pill-shaped elements to emphasize administrative precision.

---

## 2. Color Tokens

### 2.1 Background & Surface Hierarchy
| Token Name | Hex Code | Tailwind Utility | Intended Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#050608` | `bg-[#050608]` | Primary application backdrop |
| **Base Surface** | `#080a0f` | `bg-[#080a0f]` | Secondary panels, tab headers, input controls |
| **Card Surface** | `#0c0e14` | `bg-[#0c0e14]` | Primary content cards, data tables, modal dialogs |
| **Drawer / Aside Surface**| `#06080b` | `bg-[#06080b]` | Collapsible slide-overs, sticky headers |

### 2.2 Accent & Interactive
| Name | Hex / Utility | Use Case |
| :--- | :--- | :--- |
| **Primary Accent** | `rgb(14 165 233)` (`sky-500`) | Key action buttons, active tab states, selection glows |
| **Accent Glow** | `rgba(14, 165, 233, 0.15)` | Focus rings, subtle badge backdrops |
| **Primary Hover** | `rgb(56 189 248)` (`sky-400`) | Button hover state, interactive links |

### 2.3 Semantic Status Palette
| Status | Background Token | Border Token | Text Token | Icon / Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Passing / Safe** | `bg-emerald-500/10` | `border-emerald-500/20` | `text-emerald-400` | Attendance >90%, Mark >60%, Conduct + |
| **Caution / Moderate** | `bg-amber-500/10` | `border-amber-500/20` | `text-amber-400` | Risk Score 40–69%, Marks 50–59% |
| **Critical / High Risk**| `bg-red-500/10` | `border-red-500/20` | `text-red-400` | Absent teacher, Risk Score ≥70%, Truancy |
| **Information / System**| `bg-sky-500/10` | `border-sky-500/20` | `text-sky-400` | AI generated lessons, system notices |

### 2.4 Border & Divider Scale
- **Subtle Partition:** `border-white/5` (used between list items and table rows)
- **Standard Frame:** `border-white/10` (card perimeters, input field outlines)
- **Active / Elevated Frame:** `border-sky-500/30` or `border-white/20`

---

## 3. Typography

Fonts are imported via Google Fonts in `src/index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Fira+Code:wght@400;500&display=swap');
```

### 3.1 Font Families
1. **Sans-Serif (`font-sans`):** `Plus Jakarta Sans`
   - Role: Body copy, button text, table cell contents, form inputs.
   - Weights: `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700), `font-extrabold` (800).
2. **Serif (`font-serif`):** `Playfair Display` (frequently used italicized)
   - Role: Section hero headings, portal welcome banners, student names, slide titles.
   - Example: `<h1 className="text-3xl font-serif italic text-white tracking-tight">`
3. **Monospace (`font-mono`):** `Fira Code`
   - Role: Subject codes, percentages, risk metrics, timestamps, curriculum references (`CAPS § 3.2`), license plates.
   - Example: `<span className="font-mono text-xs text-sky-400">92%</span>`

### 3.2 Typographic Hierarchy
| Style | Classes | Example Use |
| :--- | :--- | :--- |
| **Hero Title** | `text-3xl md:text-4xl font-serif italic text-white tracking-tight` | Header portal titles |
| **Card Heading** | `text-base md:text-lg font-serif italic text-white` | Section card headers |
| **Subheading** | `text-xs font-mono font-bold text-slate-400 uppercase tracking-wider` | Form section label |
| **Micro Tag** | `text-[9px] font-mono font-bold uppercase tracking-widest` | Category badge chip |
| **Body Standard** | `text-xs md:text-sm text-slate-300 leading-relaxed font-sans` | Explanations, emails |
| **Caption** | `text-[11px] text-slate-500 font-sans` | Disclaimers, footer footnotes |

---

## 4. Component Patterns

### 4.1 Buttons
- **Primary Action (Sky Solid):**
  ```tsx
  className="bg-sky-500 hover:bg-sky-400 text-black font-extrabold uppercase tracking-wider text-[10px] py-2.5 px-4 rounded-sm transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-40"
  ```
- **Secondary / Ghost Action:**
  ```tsx
  className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-sm border border-white/10 transition cursor-pointer"
  ```
- **Critical / Danger Action:**
  ```tsx
  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold px-3 py-1.5 rounded-sm transition"
  ```

### 4.2 Cards & Containers
```tsx
<div className="bg-[#0c0e14] rounded-sm border border-white/5 p-6 shadow-2xl relative overflow-hidden">
  {/* Optional subtle ambient glow */}
  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />
  {/* Content */}
</div>
```

### 4.3 Form Inputs & Selects
```tsx
<input
  className="w-full bg-[#050608] border border-white/10 text-slate-200 rounded-sm p-2.5 text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none placeholder-slate-600 transition"
/>
```

### 4.4 Status Badges
- Strict rectangular corner tokens (`rounded-sm`), monospaced uppercase tracking:
```tsx
<span className="bg-sky-500/10 border border-sky-500/25 text-sky-400 font-mono font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm inline-flex items-center gap-1">
  <Sparkles className="w-3 h-3" /> Active CAPS Topic
</span>
```

### 4.5 Data Tables
- Header row: `bg-[#080a0f] text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider border-b border-white/5`
- Body row: `divide-y divide-white/5 text-xs text-slate-300 hover:bg-white/[0.02] transition`

---

## 5. Animation & Motion Guidelines

ClassBridge uses CSS transitions and lightweight keyframes:
- **`animate-fade-in`**: Tab switches, modal presentations, and incoming notifications (`opacity: 0 -> 1`).
- **`transition duration-200 ease-out`**: Button hovers, toggle switches, card borders.
- **Micro-pulse**: Subtle alert indicators (`animate-pulse`) for active risk warnings or substitute lesson broadcast flags.
- **Scrollbars**: Custom 6px dark track configured in `src/index.css` to match `#050608` with `#1e293b` thumb.
