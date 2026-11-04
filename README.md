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

Or run it in Docker (from the repo root; reads `backend/.env` at runtime):

```bash
docker compose watch      # builds, starts, and hot-reloads on changes to backend/src
```

Edits under `backend/src/` are synced into the container and the server restarts automatically; changes to `package.json` or `package-lock.json` trigger a rebuild. To run in the background without hot reload instead: `docker compose up -d --build`, then `docker compose logs -f backend`.

The object check endpoint (`POST /api/object-check`) asks Jev whether an object is in a photo and where it is, and returns the photo with a box drawn around it. The request is multipart: `object` (text) and `photo` (PNG or JPEG file, up to 15 MB; the backend shrinks it for Jev):

```bash
curl -F object=mug -F photo=@my-photo.jpg localhost:3000/api/object-check
```

### Connecting the phone to the backend

With the backend running in Docker Desktop, port 3000 is published on Windows, so a phone on the same network can reach it at your PC's LAN IP.

1. Find the PC's IPv4 address with `ipconfig` on Windows.
2. Allow inbound port 3000 once, from an **admin** PowerShell:
   ```powershell
   New-NetFirewallRule -DisplayName "Scavenger Hunt backend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
   ```
3. Point the app at it, then restart Expo (`EXPO_PUBLIC_*` values are inlined at bundle time):
   ```bash
   cp mobile/.env.example mobile/.env.local   # set EXPO_PUBLIC_API_URL=http://<PC IP>:3000
   npx expo start --tunnel --clear
   ```

Check from the phone's browser first: `http://<PC IP>:3000/health` should show `{"ok":true}`.

### Tests

Run in either `mobile/` or `backend/`:

```bash
npm test
npm run typecheck
```