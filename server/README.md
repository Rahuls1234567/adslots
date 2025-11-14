# AdSlotPro Server (Minimal Scaffold)

This is a minimal Express + TypeScript server to bootstrap development strictly per the requirements document.

## Prerequisites
- Node.js 18+

## Setup
```bash
cd server
npm install
```

## Run (development)
```bash
npm run dev
```
The server starts on `http://localhost:4000` by default.

- Health check: `GET /health` → `{ "status": "ok" }`

## Configuration
Create a `.env` file in `server/` if you want to override defaults:
```
PORT=4000
```

## Build & Start (production)
```bash
npm run build
npm start
```


