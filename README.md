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
- **Deals** — brand discount reminders with a today's-deal banner. Seeded
  with real, sourced Hong Kong promos (Esso Smiles, Caltex 加FUN, Shell GO+,
  Sinopec, PetroChina, HSBC EveryMile, Dah Sing MyAuto, Amex Platinum) as of
  July 2026 — edit, disable, or add your own; promo terms change often, so
  verify current details in each brand's official app.
- **繁體中文** — full Traditional Chinese translation; toggle with the
  EN/繁中 button in the top-right corner. Preference is saved locally.

All data is stored locally in the browser (IndexedDB via Dexie) — no
backend, no account, works offline once loaded, installable to your phone's
home screen. The app requests persistent storage on load (via
`navigator.storage.persist()`) to reduce the risk of the browser evicting
data under storage pressure. Because everything lives only in this browser
profile, use History → Export regularly to save a JSON backup (History
shows a reminder if you haven't backed up in a while, or ever); Import
restores from that file.

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
