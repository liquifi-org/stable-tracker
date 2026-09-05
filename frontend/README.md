
# Stablecoins Tracker — Frontend

A React + Vite dashboard for exploring global stablecoin adoption, regulatory frameworks, and cross-border payment corridors.

## Tech stack

- React 18 / TypeScript
- Vite 6
- Tailwind CSS v4
- shadcn/ui (Radix UI primitives)
- D3-geo + TopoJSON for maps

## Getting started

```bash
pnpm install
pnpm dev
```

The app expects a backend running at `http://localhost:3003/v1`. See `src/app/services/api.ts` for the endpoints consumed. Dev server: `http://127.0.0.1:5173`.
  