# CLAUDE.md

## Project context

Scavenger hunt MVP. Players photograph items; [Jev AI](https://jev-ai.pro/) identifies what's in each photo and the app checks it against the hunt list.

- `mobile/`: Expo (SDK 58) + React Native 0.88 + TypeScript. Runs in Expo Go.
- `backend/`: Node + Express 5 + TypeScript (run with `tsx`). Proxies calls to Jev AI.
- **The Jev API key lives only in `backend/.env`.** The mobile app must never call Jev directly or contain the key.
- Node 22.13+ is required (`.nvmrc`). Run `nvm use` before running anything.
- Expo-specific guidance is in [mobile/AGENTS.md](mobile/AGENTS.md). Read it before touching Expo APIs. Exception: this app uses the blank template (`App.tsx` entry), not Expo Router, so ignore the routing section until we adopt it.

## Commands

| | mobile/ | backend/ |
|---|---|---|
| Run | `npx expo start --tunnel` | `npm run dev`, or `docker compose watch` from the repo root (hot reload) |
| Test | `npm test` (jest-expo + RNTL) | `npm test` (node:test via tsx + supertest) |
| Typecheck | `npm run typecheck` | `npm run typecheck` |
| Add dep | `npx expo install <pkg>` | `npm install <pkg>` |
| Config | `.env.local`: `EXPO_PUBLIC_API_URL` (backend URL reachable from the phone) | `.env`: `JEV_API_KEY` |

Jev is called through `@typesafe-ai/sdk` pointed at `https://jev-ai.pro/api` (see `backend/src/jev.ts`). Images need the `jev-preview` model and the `TypeSafe-Danger-Zone-Images` header.

## Coding conventions

- TypeScript, `strict` on. Avoid `any`. Type API request/response shapes and share them where practical.
- React: function components and hooks only. Keep components small; move logic into hooks or plain functions so it can be tested.
- Mobile network requests go through React Query (`@tanstack/react-query`). One hook per file: reads in `mobile/src/api/queries/` (`useQuery`), writes/actions in `mobile/src/api/mutations/` (`useMutation`). Each file holds its fetch function and response types, and uses the shared `request()` helper in `mobile/src/api/request.ts`.
- Backend: build routes in `src/app.ts` (`createApp()`) so tests can use it without opening a port. `src/index.ts` only boots the server.
- Read config from `process.env`. Never hardcode secrets or URLs that vary by environment.
- Prefer built-in Expo modules (`expo-camera`, `expo-image-picker`, …). Don't add a dependency without a clear reason.
- Match the style of the surrounding code. Keep comments sparse and useful.

## Testing expectations

- Every behavior change comes with a test: an RNTL test for screens and components, a supertest test for routes.
- Mock Jev AI in tests. Tests must not hit the network or need a real API key.
- Before calling a task done, run `npm test` and `npm run typecheck` in each package you touched, and report the results honestly.

## How Claude should approach changes

- This is an MVP. Pick the simplest thing that works, and don't build abstractions for later.
- Keep diffs small and focused. For changes that span several files or both packages, outline the plan first.
- Never read, print, or commit `.env` files or keys.
- Ask before adding any native module that won't run in Expo Go, because it forces a dev build.
- Don't edit generated `ios/` or `android/` folders. Configure native behavior through `app.json`.
- Work on a branch, not `main`. Commit only when asked.
