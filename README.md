# Fuel Saver

A mobile-first PWA for tracking fuel fill-ups: cost per km, average **net**
price per litre by gas brand, and brand discount reminders. See
[PLAN.md](./PLAN.md) for the full design and implementation plan this app
was built from.

## Features

- **Add fill-up** — upload a receipt photo (OCR via Tesseract.js pre-fills
  brand, litres, date and net amount) or enter details manually. The parser
  is deliberately tuned to pick the *final/net* amount paid and ignore
  discount/subtotal lines.
- **Dashboard** — cost per km, volume-weighted average net $/L per brand,
  a brand cost comparison callout, consumption (L/100km) trend, and monthly
  spend chart.
- **History** — edit/delete past fill-ups, filter by brand, JSON export/import
  for backup.
- **Deals** — user-managed brand discount reminders (e.g. "Caltex: free
  petrol upgrade every Saturday") with a today's-deal banner.

All data is stored locally in the browser (IndexedDB via Dexie) — no
backend, no account, works offline once loaded, installable to your phone's
home screen.

## Development

```bash
npm install
npm run dev        # start dev server
npm run test        # run unit tests (stats engine + receipt parser)
npm run lint        # oxlint
npm run build        # type-check + production build
```

## Tech stack

React + TypeScript + Vite, Tailwind CSS, Dexie.js (IndexedDB), Recharts,
Tesseract.js (client-side OCR), vite-plugin-pwa.
