![Helixque Header](assets/header.png)

Helixque is a professional real-time video chat application that pairs people based on their preferences. It uses WebRTC for secure, low-latency, peer-to-peer media and Socket.IO for reliable signaling—delivering a modern experience for networking, interviews, and collaboration.

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Frontend](#frontend)
- [Backend](#backend)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Socket.IO events](#socketio-events)
- [Project structure](#project-structure)
- [Core components](#core-components)
- [Deployment](#deployment)
- [Contribution guidelines](#contribution-guidelines)
- [Contributers](#contributers)
- [License & acknowledgments](#license--acknowledgments)

---

## Overview

Helixque provides preference-based pairing and a lightweight signaling server to facilitate direct WebRTC peer connections. The architecture separates responsibilities between a TypeScript backend (signaling, presence, matching) and a Next.js frontend (device setup, UI, and peer connection management).

We’re continuously enhancing Helixque, evolving it into a dynamic platform. New features and improvements are on the way, and the best way to stay updated is by joining our [Discord](https://discord.gg/dQUh6SY9Uk) community, where you can engage in discussions and be part of the active development journey.

---

## Features

**Enhanced UI & Layout** – enjoy a cleaner, smoother interface with improved stability when switching between users.

**Seamless Media Switching** – toggle between video and audio effortlessly, with smooth transitions for uninterrupted conversations.

**Instant Messaging** – send and receive messages in real time for seamless communication alongside video calls.

**One-on-One Video Calling** – connect directly with other users for private, high-quality video conversations.

**Random Connect with Professionals** – meet and network with professionals from various fields instantly, expanding your connections effortlessly.

**Unlimited Skips** - there is no limit for the user to skip the calls.

---

## Frontend

Purpose

The frontend is a Next.js (App Router) application that manages device selection, user preferences, UI state, and the RTCPeerConnection lifecycle.

Key commands

- Install dependencies:

```bash
cd frontend
npm install
```
- Run development server:

```bash
cd frontend
npm run dev
```
- Build (production):

```bash
cd frontend
npm run build
npm start
```

Environment

Create `/frontend/.env.local` with the following minimum entry:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

Notes

- Frontend requires HTTPS in production for getUserMedia to function correctly.
- Device permissions (camera/microphone) must be granted by the user for media flows to start.

## Backend

Purpose

The backend is a Node.js + TypeScript server that provides Socket.IO signaling, user presence, and a preference-based matchmaker. It is intentionally minimal so it can scale horizontally when paired with a Redis adapter.

Key commands

- Install dependencies:

```bash
cd backend
npm install
```
- Run development server:

```bash
cd backend
npm run dev
```
- Build (production):

```bash
cd backend
npm run build
npm start
```

Environment

Copy `/backend/.env.example` to `/backend/.env` and set required values, for example:

```env
PORT=5001
NODE_ENV=production
CORS_ORIGINS=http://localhost:3000
# Optional: REDIS_URL=redis://localhost:6379
# Optional: STUN/TURN servers can be provided via environment variables
```

Notes

- Use a TURN server in production to ensure media relay when direct P2P is not possible.
- If deploying multiple backend instances, configure the Socket.IO Redis adapter and set `REDIS_URL`.

## Quick start

1. Clone the repository:

```bash
git clone https://github.com/Omelge-exe/Helixque.git
cd Helixque
```

2. Install dependencies (both services):

```bash
cd backend && npm install
cd ../frontend && npm install
```

3. Start development servers (two terminals):

Terminal 1 — backend

```bash
cd backend
npm run dev
```

Terminal 2 — frontend

```bash
cd frontend
npm run dev
```

Open the frontend in your browser (http://localhost:3000 by default) and allow camera/microphone access.

## Configuration

Backend environment example is provided in `/backend/.env.example`. Key entries:

- `PORT` — server port (default 5001)
- `CORS_ORIGINS` — comma-separated frontend origins
- `REDIS_URL` — Redis connection string (optional)
- `STUN_URLS`, `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` — optional ICE servers

Frontend environment key:

- `NEXT_PUBLIC_BACKEND_URL` — public URL for the backend (use HTTPS in production)

## Socket.IO events

Client → Server

| Event | Description | Payload |
|---|---:|---|
| `offer` | Send WebRTC offer | `{ sdp: string, roomId: string }` |
| `answer` | Send WebRTC answer | `{ sdp: string, roomId: string }` |
| `add-ice-candidate` | Send ICE candidate | `{ candidate: RTCIceCandidate, roomId: string, type: 'sender' | 'receiver' }` |
| `queue:next` | Request next match | — |
| `queue:leave` | Leave queue / room | — |

Server → Client

| Event | Description | Payload |
|---|---:|---|
| `lobby` | User joined lobby | — |
| `queue:waiting` | Waiting for a match | — |
| `send-offer` | Instruct client to create/send offer | `{ roomId: string }` |
| `offer` | Deliver remote offer | `{ sdp: string, roomId: string }` |
| `answer` | Deliver remote answer | `{ sdp: string, roomId: string }` |
| `add-ice-candidate` | Deliver remote ICE candidate | `{ candidate: RTCIceCandidate, type: 'sender' | 'receiver' }` |
| `partner:left` | Remote peer disconnected | `{ reason?: string }` |

## Project structure

```
Helixque/
├─ backend/           # Signaling server (Node.js + TypeScript)
│  ├─ src/
│  │  ├─ managers/    # UserManager, RoomManager
│  │  └─ index.ts     # Entry point
│  └─ package.json
├─ frontend/          # Next.js app (TypeScript)
│  ├─ app/            # App Router pages
│  ├─ components/     # UI + RTC components
│  └─ package.json
└─ README.md
```

## Core components

- UserManager (backend) — queue, matching, presence, session state
- RoomManager (backend) — room lifecycle, signaling orchestration, cleanup
- Room (frontend) — RTCPeerConnection lifecycle, media controls, UI state

## Deployment

Backend (Render / Railway / Heroku)

1. Set environment variables (PORT, NODE_ENV, NEXT_PUBLIC_BACKEND_URL, optional REDIS_URL and TURN_*).
2. Build and run:

```bash
cd backend
npm run build
npm start
```

Frontend (Vercel / Netlify)

1. Set `NEXT_PUBLIC_BACKEND_URL` to your backend's HTTPS endpoint.
2. Use the platform's Next.js build pipeline. On Vercel this is automatic; `npm start` is not required.

Docker examples are included in the project to containerize frontend and backend for advanced deployments.

## Contribution guidelines

- Please star the repository to support the project.
- Open an issue to discuss larger features before implementing.
- Use small, focused pull requests with descriptive titles and testing notes.
- Maintain TypeScript types and follow existing code style. Run linters and formatters before committing.

Community and support: <a href="https://discord.gg/dQUh6SY9Uk"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white"/></a> or open issues on GitHub.

To contribute: join our Discord (use the badge above) to discuss ideas, coordinate work, ask questions, and get faster PR reviews.

Signing up and completing the brief onboarding in the app is required for all contributors. Maintainers will use registered accounts and active sessions to verify changes; PRs may not be merged until this verification step is completed.

## Contributers

![Alt](https://repobeats.axiom.co/api/embed/241636b7674153b09f7a274fc31e67ceaf13859f.svg "Repobeats analytics image")

<a href="https://github.com/HXQLabs/Helixque/graphs/contributors">
	<img src="https://contrib.rocks/image?repo=HXQLabs/Helixque" />
</a>

## License & acknowledgments

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

Thanks to the open-source projects used here: WebRTC, Socket.IO, Next.js, React, and Tailwind CSS.

