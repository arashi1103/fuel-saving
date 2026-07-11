# Fuel-Saving App — Design & Implementation Plan

A mobile-first web app for tracking fuel costs from gas station receipts:
cost per km, average **net** price per litre by brand (Esso, Caltex, Shell, …),
and brand discount reminders.

---

## 1. Product Overview

### Core user flow
1. User fills up, snaps/uploads the receipt (photo or PDF).
2. App extracts: date, brand, litres, **net/final amount paid** (ignore all
   intermediate discount lines — only the last/net total matters).
3. User enters current odometer reading (the one manual field that OCR can't get).
4. App computes and charts: $/km, $/L (net) per brand, consumption (L/100km),
   monthly spend.
5. App reminds the user of brand-specific promo days (e.g. "Caltex: free
   upgrade every Saturday") before they fill up.

### Key screens (mobile-first, 4 tabs)
| Screen | Contents |
|---|---|
| **Add fill-up** | Camera/file upload → OCR → editable confirmation form (brand, date, litres, net amount, odometer) |
| **Dashboard** | Cost per km, avg net $/L overall and per brand, L/100km trend chart, monthly spend |
| **History** | List of fill-ups, tap to edit/delete, filter by brand/date |
| **Deals** | User-managed list of brand promos with day-of-week rules; "today's deals" banner |

---

## 2. Architecture

**Recommendation: a client-side-only PWA (no backend for v1).**

Rationale: single-user personal finance data, works offline at the gas
station, zero hosting cost (static site), no auth needed. Data lives in
IndexedDB with JSON export/import for backup. A backend can be added later
(v3) if multi-device sync is wanted.

```
[Camera/File] → [OCR layer] → [Parser (brand + net amount + litres)]
      → [Confirmation form] → [IndexedDB store]
      → [Stats engine] → [Dashboard charts]
[Deals store + day-of-week rules] → [Reminder banner / notifications]
```

### Tech stack
- **Framework:** React + Vite + TypeScript (or Svelte if the executor prefers — nothing here is React-specific)
- **Styling:** Tailwind CSS, mobile-first
- **OCR (pick one, in order of preference):**
  1. **LLM vision API** (e.g. Claude with an image input) — best accuracy on messy
     receipts, trivially returns structured JSON. Needs an API key → either a
     tiny serverless proxy (Cloudflare Worker / Vercel function) or user-supplied key.
  2. **Tesseract.js** — fully client-side/free/offline, but receipt accuracy is
     mediocre; requires a robust regex parser and always show the confirmation form.
  - v1 can ship with Tesseract.js + manual-entry fallback; swap in LLM OCR behind
    the same `extractReceipt(image): Promise<ReceiptDraft>` interface later.
- **Storage:** IndexedDB via `Dexie.js`; JSON export/import button in settings
- **Charts:** Recharts (or Chart.js)
- **PWA:** manifest + service worker (vite-plugin-pwa) for installability + offline
- **Hosting:** GitHub Pages / Netlify / Vercel (static)

---

## 3. Data Model

```ts
interface FillUp {
  id: string;            // uuid
  date: string;          // ISO date from receipt
  brand: string;         // normalized: "Shell" | "Esso" | "Caltex" | "Sinopec" | "Other:<name>"
  litres: number;
  netAmount: number;     // FINAL amount paid — the only money figure stored
  odometer: number;      // km, user-entered
  stationName?: string;  // optional, from receipt
  receiptImage?: Blob;   // optional thumbnail for audit
  createdAt: string;
}

interface Deal {
  id: string;
  brand: string;
  title: string;         // "Free petrol upgrade"
  rule: { type: "weekly", days: number[] }   // 0–6, e.g. [6] = Saturday
      | { type: "dateRange", start: string, end: string }
      | { type: "always" };
  notes?: string;
  enabled: boolean;
}

interface Settings {
  currency: string;        // default "HKD" (configurable)
  distanceUnit: "km";
  tankWarnThresholdDays?: number;
}
```

**Seed deals** (editable, shipped as defaults): Caltex Saturday free upgrade,
plus placeholders for Shell/Esso — clearly marked "verify with your station",
since promos change.

---

## 4. Calculations (stats engine — pure functions, unit-tested)

Fill-ups sorted by odometer. For fill-up *i* (i ≥ 1):

- **Distance:** `dist_i = odo_i − odo_{i−1}`
- **Cost per km:** `netAmount_i / dist_i` (the fuel bought at i−1 powered this
  interval, but using amount_i is the standard simple approximation — document it)
- **Consumption:** `litres_i / dist_i × 100` → L/100km
- **Net $/L per brand:** `Σ netAmount / Σ litres` grouped by brand
  (volume-weighted, not mean-of-prices — this is the correct average)
- **Overall $/km:** `Σ netAmount (excl. first) / (odo_last − odo_first)`
- **Monthly spend:** group `netAmount` by month

Edge cases to handle: first fill-up (no distance yet), odometer entered out of
order (validate: must exceed previous by date), missed fill-ups (allow a
"partial/missed previous" flag that excludes the interval from per-km stats),
deleting a middle entry (recompute neighbors).

**Brand comparison insight:** show "Shell avg $X.XX/L vs Caltex $Y.YY/L —
Caltex saves you ~$Z per 40L tank" — this is the killer takeaway of the app.

---

## 5. Receipt parsing rules (net amount focus)

1. OCR → raw text (or structured JSON if LLM).
2. **Brand:** keyword match against known list (`caltex|shell|esso|sinopec|petrochina…`) anywhere in text; fallback: ask user.
3. **Net amount:** take the **last** money value labelled
   `total|net|amount due|payable|visa|mastercard|paid` — explicitly skip lines
   containing `discount|rebate|save|offset|original|subtotal|less`.
4. **Litres:** pattern `(\d+\.\d{1,3})\s*(L|Litre|公升)`.
5. **Date:** common formats; fallback to today.
6. Always land on the **confirmation form** pre-filled — never auto-save OCR
   output. Low-confidence fields highlighted.

---

## 6. Discount reminders

- v1: **in-app banner** — on app open, evaluate `Deal.rule` against today;
  show "🎉 Today: Caltex free upgrade" on Dashboard and Add-fill-up screens.
- v1.5: **Web Push / local notification** via service worker on promo days at a
  user-set time (needs notification permission; note iOS Safari requires the
  PWA to be installed to Home Screen).
- Deals screen: CRUD for deals, toggle on/off, day-of-week picker.

---

## 7. Implementation phases (for the executing model)

### Phase 1 — Skeleton & manual entry (ship first, fully usable)
1. Vite + React + TS + Tailwind + Dexie scaffold; 4-tab mobile layout.
2. `FillUp` CRUD with manual entry form + validation (odometer monotonic per date).
3. Stats engine (pure `src/lib/stats.ts`) + unit tests (Vitest).
4. Dashboard: stat cards ($/km, $/L by brand, L/100km) + one trend chart.
5. History list with edit/delete. JSON export/import.

### Phase 2 — Receipt OCR
6. Upload/camera input (`<input type="file" accept="image/*" capture>`).
7. `extractReceipt()` interface + Tesseract.js implementation + parser
   (section 5) + confirmation form wiring. Store receipt thumbnail.
8. (Optional) LLM-vision implementation behind the same interface.

### Phase 3 — Deals & PWA polish
9. Deals CRUD + rule evaluator + today-banner; seed defaults.
10. PWA manifest + offline service worker; install prompt.
11. (Optional) push/local notifications on promo days.

### Suggested file layout
```
src/
  lib/        stats.ts, parser.ts, ocr/{index.ts,tesseract.ts,llm.ts}, db.ts, deals.ts
  components/ (forms, cards, charts, banner)
  pages/      AddFillUp.tsx, Dashboard.tsx, History.tsx, Deals.tsx
  App.tsx     (tab router)
tests/        stats.test.ts, parser.test.ts (use real anonymized receipt texts as fixtures)
```

### Definition of done per phase
- Phase 1: can log 3 fill-ups manually and see correct $/km & per-brand $/L (verified by tests).
- Phase 2: photo of a Caltex/Shell receipt pre-fills the form with net amount & litres ≥80% of the time; user confirms in <10s.
- Phase 3: installable on a phone home screen; Saturday shows the Caltex banner.

---

## 8. Nice-to-haves (backlog, don't build in v1)
- Multi-vehicle support (add `vehicleId` to FillUp now, UI later).
- Price-trend alert: "your Shell price is 5% above your 3-month average".
- Best-station map (needs location permission).
- Cloud sync/auth (turns this into a backend project — defer).
- Octane grade tracking (98 vs 95 cost-effectiveness comparison).
