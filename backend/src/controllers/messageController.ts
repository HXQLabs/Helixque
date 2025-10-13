import { Server, Socket } from 'socket.io';
import { extractLinkPreviewFromText, LinkPreview } from '../utils/linkPreview';

export interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: number;
  linkPreview?: LinkPreview;
}

// Optional: typed Socket interface to include userId
interface TypedSocket extends Socket {
  userId?: string;
}

// Simple in-memory store for demonstration
const messagesStore: Message[] = [];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// Narrow payload type with validation
interface NewMessagePayload {
  text: unknown;
  roomId: unknown;
}

export function setupMessageController(io: Server, socket: TypedSocket) {
  socket.on('message:new', async (payload: NewMessagePayload) => {
    // Validate payload.text
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0 || payload.text.length > 1000) {
      socket.emit('message:error', { error: 'Invalid text' });
      return;
    }

    // Validate payload.roomId
    if (typeof payload.roomId !== 'string' || payload.roomId.trim().length === 0) {
      socket.emit('message:error', { error: 'Invalid room ID' });
      return;
    }

    const text = payload.text.trim();
    const roomId = payload.roomId.trim();

    // Validate userId
    const userId = typeof socket.userId === 'string' && socket.userId.length > 0 ? socket.userId : 'anonymous';

    const message: Message = {
      id: generateId(),
      text,
      userId,
      createdAt: Date.now(),
    };

    try {
      const preview = await extractLinkPreviewFromText(text);
      if (preview) message.linkPreview = preview;
    } catch (err) {
      console.error('Link preview extraction failed:', err);
    }

    // Store and emit message
    messagesStore.push(message);
    io.to(roomId).emit('message:new', message);
  });
}
