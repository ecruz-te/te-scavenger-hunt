# Scavenger Hunt

A mobile scavenger hunt app. Players take photos of items, and [Jev AI](https://jev-ai.pro/) identifies what's in each photo.

## Structure

- `mobile/`: React Native app (Expo)
- `backend/`: Node/Express API that proxies requests to Jev AI, so the API key stays on the server

## Tech Choice
- I opted for react-native to give myself a chance to re-familiarize myself with React and give me a good chance to focus on jev/other aspects rather than focusing on learning dart/flutter.

## Getting Started

Requires Node 22.13+ (Expo SDK 58 / React Native 0.88). With nvm: `nvm use` (reads `.nvmrc`).

### Mobile

```bash
cd mobile
npm install
npx expo start --tunnel   # scan the QR code with the Expo Go app on your phone
```

`--tunnel` is needed on WSL2, where the phone can't reach the dev server over the LAN. On a normal Linux/macOS setup, `npx expo start` is enough.

### Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in JEV_API_KEY
npm run dev               # http://localhost:3000/health
```

### Tests

Run in either `mobile/` or `backend/`:

```bash
npm test
npm run typecheck
```