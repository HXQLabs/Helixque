<br />

<p align="center">
<a href="https://github.com/HXQLabs/Helixque">
  <img src="assets/header.png" alt="Helixque Header" width="100%">
</a>
</p>
<p align="center"><b>Professional real-time video chat with preference-based matching</b></p>

<p align="center">
<a href="https://discord.gg/dQUh6SY9Uk">
<img alt="Discord" src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white&style=for-the-badge" />
</a>
<img alt="Commit activity per month" src="https://img.shields.io/github/commit-activity/m/HXQLabs/Helixque?style=for-the-badge" />
<img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue?style=for-the-badge" />
</p>

<p align="center">
    <a href="https://github.com/HXQLabs/Helixque"><b>GitHub</b></a> •
    <a href="https://github.com/HXQLabs/Helixque/releases"><b>Releases</b></a> •
    <a href="https://discord.gg/dQUh6SY9Uk"><b>Discord</b></a> •
    <a href="#deployment"><b>Deployment Guide</b></a>
</p>

Meet [Helixque](https://github.com/HXQLabs/Helixque), a professional real-time video chat application that pairs people based on their preferences. Built with WebRTC for secure, low-latency peer-to-peer media and Socket.IO for reliable signaling—delivering a modern experience for networking, and collaboration. 🎥

> Helixque is continuously evolving. Your suggestions, ideas, and reported bugs help us immensely. Do not hesitate to join the conversation on [Discord](https://discord.gg/dQUh6SY9Uk) or raise a GitHub issue. We read everything and respond to most.


## Note
You can now preview the latest updates and improvements every 2–3 days at the following link:
👉 [Helixque-Changes](https://helixque-changes.netlify.app/)

## 🚀 Quick Start

Getting started with Helixque is simple:

1. **Clone the repository**

```bash
git clone https://github.com/HXQLabs/Helixque.git
cd Helixque
```

2. **Install dependencies**

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

3. **Configure environment variables**

```bash
# Backend: Copy and edit .env.example
cp backend/.env.example backend/.env

# Frontend: Create .env.local
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:5001" > frontend/.env.local
```

4. **Start development servers**

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open your browser at `http://localhost:3000` and allow camera/microphone access. 🎉

## 🌟 Features

- **Enhanced UI & Layout**
  Enjoy a cleaner, smoother interface with improved stability when switching between users. Seamless navigation and responsive design ensure a premium user experience.

- **Seamless Media Switching**
  Toggle between video and audio effortlessly with smooth transitions for uninterrupted conversations. Real-time device management keeps your calls crystal clear.

- **Instant Messaging**
  Send and receive messages in real time for seamless communication alongside video calls. Perfect for sharing links, notes, or quick thoughts during conversations.

- **One-on-One Video Calling**
  Connect directly with other users for private, high-quality video conversations. WebRTC ensures low-latency, peer-to-peer connections for the best quality.

- **Random Connect with Professionals**
  Meet and network with professionals from various fields instantly. Expand your connections effortlessly with intelligent preference-based matching.

- **Unlimited Skips**
  No limits on finding the right match. Skip as many times as you need until you find the perfect conversation partner.

## 🛠️ Local Development

### Frontend

The frontend is a Next.js application (App Router) that manages device selection, user preferences, UI state, and the RTCPeerConnection lifecycle.

**Development commands:**

```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
```

**Environment variables:**

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

> **Note:** Frontend requires HTTPS in production for getUserMedia to function correctly. Device permissions must be granted by the user.

### Backend

The backend is a Node.js + TypeScript server providing Socket.IO signaling, user presence, and preference-based matchmaking.

**Development commands:**

```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
```

**Environment variables:**

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=5001
NODE_ENV=production
CORS_ORIGINS=http://localhost:3000
# Optional: REDIS_URL=redis://localhost:6379
# Optional: STUN/TURN server configuration
```

> **Note:** Use a TURN server in production to ensure media relay when direct P2P is not possible. For multiple backend instances, configure Socket.IO Redis adapter.

## ⚙️ Built With

[![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## 🏗️ Project Structure

```
Helixque/
├─ backend/              # Signaling server (Node.js + TypeScript)
│  ├─ src/
│  │  ├─ managers/       # UserManager, RoomManager
│  │  └─ index.ts        # Entry point
│  ├─ .env.example
│  └─ package.json
├─ frontend/             # Next.js app (TypeScript)
│  ├─ app/               # App Router pages
│  ├─ components/        # UI + RTC components
│  ├─ .env.local
│  └─ package.json
├─ assets/               # Images and static files
└─ README.md
```

### Core Components

- **UserManager** (backend) — Queue management, matching logic, presence tracking, and session state
- **RoomManager** (backend) — Room lifecycle, signaling orchestration, and cleanup operations
- **Room** (frontend) — RTCPeerConnection lifecycle, media controls, and UI state management

## 📡 Socket.IO Events

### Client → Server

| Event | Description | Payload |
|-------|-------------|---------|
| `offer` | Send WebRTC offer | `{ sdp: string, roomId: string }` |
| `answer` | Send WebRTC answer | `{ sdp: string, roomId: string }` |
| `add-ice-candidate` | Send ICE candidate | `{ candidate: RTCIceCandidate, roomId: string, type: 'sender' \| 'receiver' }` |
| `queue:next` | Request next match | — |
| `queue:leave` | Leave queue / room | — |

### Server → Client

| Event | Description | Payload |
|-------|-------------|---------|
| `lobby` | User joined lobby | — |
| `queue:waiting` | Waiting for a match | — |
| `send-offer` | Instruct client to create/send offer | `{ roomId: string }` |
| `offer` | Deliver remote offer | `{ sdp: string, roomId: string }` |
| `answer` | Deliver remote answer | `{ sdp: string, roomId: string }` |
| `add-ice-candidate` | Deliver remote ICE candidate | `{ candidate: RTCIceCandidate, type: 'sender' \| 'receiver' }` |
| `partner:left` | Remote peer disconnected | `{ reason?: string }` |

## 🚢 Deployment

### Backend (Render / Railway / Heroku)

| Platform | Guide |
|----------|-------|
| Render | Deploy Node.js app with environment variables |
| Railway | Auto-deploy from GitHub with build commands |
| Heroku | Use Procfile with `npm start` |

**Deployment steps:**

1. Set environment variables (`PORT`, `NODE_ENV`, `CORS_ORIGINS`, optional `REDIS_URL` and `TURN_*`)
2. Build and run:

```bash
cd backend
npm run build
npm start
```

### Frontend (Vercel / Netlify)

| Platform | Guide |
|----------|-------|
| Vercel | Automatic Next.js deployment from GitHub |
| Netlify | Configure build command: `npm run build` |

**Deployment steps:**

1. Set `NEXT_PUBLIC_BACKEND_URL` to your backend's HTTPS endpoint
2. Deploy using your platform's Next.js build pipeline

> **Docker:** Container examples are included in the project for advanced deployments.

## ❤️ Community

Join the Helixque community on [Discord](https://discord.gg/dQUh6SY9Uk) and [GitHub Discussions](https://github.com/HXQLabs/Helixque/discussions). 

Feel free to ask questions, report bugs, participate in discussions, share ideas, request features, or showcase your projects. We'd love to hear from you!

## 🛡️ Security

If you discover a security vulnerability in Helixque, please report it responsibly instead of opening a public issue. We take all legitimate reports seriously and will investigate them promptly.

To disclose any security issues, please contact the maintainers through Discord or open a private security advisory on GitHub.

## 🤝 Contributing

There are many ways you can contribute to Helixque:

- ⭐ **Star the repository** to support the project
- 🐛 Report bugs or submit feature requests via [GitHub Issues](https://github.com/HXQLabs/Helixque/issues)
- 📖 Review and improve documentation
- 💬 Talk about Helixque in your community and [let us know](https://discord.gg/dQUh6SY9Uk)
- 👍 Show your support by upvoting popular feature requests

### Contribution Guidelines

- Open an issue to discuss larger features before implementing
- Use small, focused pull requests with descriptive titles and testing notes
- Maintain TypeScript types and follow existing code style
- Run linters and formatters before committing
- Join our [Discord](https://discord.gg/dQUh6SY9Uk) to coordinate work and get faster PR reviews

> **Important:** Signing up and completing the brief onboarding in the app is required for all contributors. Maintainers will use registered accounts to verify changes.

### Repo Activity

![Helixque Repo Activity](https://repobeats.axiom.co/api/embed/104659808acdebcf5999205983b83c1cae5b9ae4.svg "Repobeats analytics image")


### We Couldn't Have Done This Without You

<a href="https://github.com/HXQLabs/Helixque/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=HXQLabs/Helixque" />
</a>

## 📄 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

### Acknowledgments

Thanks to the open-source projects that made Helixque possible:
- [WebRTC](https://webrtc.org/) - Real-time communication
- [Socket.IO](https://socket.io/) - Real-time bidirectional communication
- [Next.js](https://nextjs.org/) - React framework
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

<br />

