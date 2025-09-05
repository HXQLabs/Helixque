# Helixque

A real-time video chat application that connects strangers for random conversations, similar to Omegle. Built with modern web technologies for seamless peer-to-peer communication.

## ✨ Features

- **Random Video Chat**: Connect with strangers worldwide through video and audio
- **Next/Skip Functionality**: Skip to the next person if the conversation isn't going well
- **Device Management**: Easy camera and microphone controls
- **Real-time Matching**: Instant pairing with available users
- **Ban System**: Prevents rematching with previously encountered users
- **Responsive Design**: Works across desktop and mobile devices
- **WebRTC Technology**: Direct peer-to-peer connections for optimal performance

## 🏗️ Architecture

### Backend (`/backend`)
- **Node.js + TypeScript**: Type-safe server implementation
- **Socket.IO**: Real-time bidirectional communication
- **Express**: Web framework for API endpoints
- **WebRTC Signaling**: Handles offer/answer/ICE candidate exchange
- **Redis Support**: Scalable with Redis adapter for multi-instance deployments

### Frontend (`/my-app`)
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe frontend development
- **TailwindCSS**: Utility-first styling
- **WebRTC**: Direct peer-to-peer video/audio streaming
- **Socket.IO Client**: Real-time communication with backend

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern web browser with WebRTC support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Omelge-exe/Helixque.git
   cd Helixque
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../my-app
   npm install
   ```

### Development

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   Server will start on `http://localhost:5001` (or the port specified in PORT env var)

2. **Start the frontend development server**
   ```bash
   cd my-app
   npm run dev
   ```
   Frontend will start on `http://localhost:3000` (or next available port)

3. **Open your browser**
   Navigate to the frontend URL and allow camera/microphone permissions when prompted.

### Production Build

1. **Build the backend**
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **Build the frontend**
   ```bash
   cd my-app
   npm run build
   npm start
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (`/backend/.env`)
```env
PORT=5001
NODE_ENV=production
# Optional: Redis configuration for scaling
REDIS_URL=redis://localhost:6379
```

#### Frontend (`/my-app/.env.local`)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

## 📡 Socket.IO Events

### Client → Server

| Event | Description | Payload |
|-------|-------------|---------|
| `offer` | WebRTC offer | `{sdp: string, roomId: string}` |
| `answer` | WebRTC answer | `{sdp: string, roomId: string}` |
| `add-ice-candidate` | ICE candidate | `{candidate: RTCIceCandidate, roomId: string, type: "sender"\|"receiver"}` |
| `queue:next` | Skip to next person | - |
| `queue:leave` | Leave the matching queue | - |

### Server → Client

| Event | Description | Payload |
|-------|-------------|---------|
| `lobby` | User joined lobby | - |
| `queue:waiting` | Waiting for match | - |
| `send-offer` | Request to send offer | `{roomId: string}` |
| `offer` | Received WebRTC offer | `{sdp: string, roomId: string}` |
| `answer` | Received WebRTC answer | `{sdp: string, roomId: string}` |
| `add-ice-candidate` | Received ICE candidate | `{candidate: RTCIceCandidate, type: "sender"\|"receiver"}` |
| `partner:left` | Partner disconnected | `{reason: string}` |

## 🏛️ Project Structure

```
Helixque/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── managers/
│   │   │   ├── UserManager.ts    # User matching and queue management
│   │   │   └── RoomManager.ts    # Room creation and WebRTC signaling
│   │   └── index.ts         # Express server and Socket.IO setup
│   ├── package.json
│   └── tsconfig.json
├── my-app/                  # Next.js frontend
│   ├── app/
│   │   ├── page.tsx         # Home page
│   │   ├── match/           # Device setup and matching
│   │   └── room/            # Video chat rooms
│   ├── components/
│   │   ├── RTC/
│   │   │   ├── DeviceCheck.tsx   # Camera/mic setup
│   │   │   └── Room.tsx          # Video chat interface
│   │   └── ui/              # Reusable UI components
│   └── package.json
└── README.md
```

## 🧩 Core Components

### UserManager
Handles user lifecycle, matching logic, and queue management:
- **Queue Management**: Maintains waiting users for matching
- **Ban System**: Prevents rematching with previous partners
- **Connection Tracking**: Monitors online/offline status
- **Partner Linking**: Manages current conversation pairs

### RoomManager  
Manages chat rooms and WebRTC signaling:
- **Room Creation**: Sets up communication channels between users
- **WebRTC Signaling**: Facilitates offer/answer/ICE exchange
- **Teardown**: Cleans up rooms when users leave

### Room Component
Frontend video chat interface:
- **Media Stream Management**: Handles local and remote video/audio
- **WebRTC Peer Connections**: Establishes direct communication
- **UI Controls**: Next, leave, and device toggle buttons
- **Connection States**: Loading, connected, and error states

## 🎯 Usage

1. **Join**: Visit the application and allow camera/microphone access
2. **Setup**: Configure your video/audio preferences
3. **Match**: Get automatically paired with another online user
4. **Chat**: Enjoy real-time video conversation
5. **Next**: Click "Next" to find a new conversation partner
6. **Leave**: Click "Leave" to exit the application

## 🔒 Privacy & Security

- **No Data Storage**: Conversations are not recorded or stored
- **Peer-to-Peer**: Video/audio streams directly between users
- **Temporary Rooms**: Chat rooms are destroyed when users disconnect
- **Ban System**: Prevents harassment through rematching prevention

## 🚀 Deployment

### Backend Deployment (Render/Railway/Heroku)

1. Set the `PORT` environment variable (automatically provided by most platforms)
2. Ensure `NODE_ENV=production`
3. Run `npm run build && npm start`

### Frontend Deployment (Vercel/Netlify)

1. Set `NEXT_PUBLIC_BACKEND_URL` to your backend URL
2. Run `npm run build`
3. Deploy the generated `.next` directory

### Docker Deployment

Backend Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

## 🛠️ Development

### Adding New Features

1. **Backend**: Extend `UserManager` or `RoomManager` classes
2. **Frontend**: Add new components in `/components` directory
3. **Real-time Events**: Update Socket.IO event handlers in both backend and frontend

### Testing

```bash
# Backend tests (if available)
cd backend
npm test

# Frontend tests (if available)  
cd my-app
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- WebRTC technology for peer-to-peer communication
- Socket.IO for real-time bidirectional communication
- Next.js and React for the modern frontend framework
- TailwindCSS for beautiful, responsive styling

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub or contact the maintainers.

---

**Note**: This application requires HTTPS in production for WebRTC to function properly. Most modern deployment platforms (Vercel, Netlify, Render) provide HTTPS by default.