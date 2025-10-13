import { Server, Socket } from 'socket.io';
import { extractLinkPreviewFromText, LinkPreview } from '../utils/linkPreview';
import crypto from 'crypto'; // secure ID generation

export interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: number;
  linkPreview?: LinkPreview;
}

interface TypedSocket extends Socket {
  userId?: string;
}

// Simple in-memory store
const messagesStore: Message[] = [];

// Secure ID generator
function generateId(bytes = 9): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

// Narrow payload type
interface NewMessagePayload {
  text: unknown;
  roomId: unknown;
}

export function setupMessageController(io: Server, socket: TypedSocket) {
  socket.on('message:new', async (payload: NewMessagePayload) => {
    // Validate text
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0 || payload.text.length > 1000) {
      socket.emit('message:error', { error: 'Invalid text' });
      return;
    }

    // Validate roomId
    if (typeof payload.roomId !== 'string' || payload.roomId.trim().length === 0) {
      socket.emit('message:error', { error: 'Invalid room ID' });
      return;
    }

    const text = payload.text.trim();
    const roomId = payload.roomId.trim();

    // Safe userId
    const userId = typeof socket.userId === 'string' && socket.userId.length > 0 ? socket.userId : 'anonymous';

    const message: Message = {
      id: generateId(), // secure ID
      text,
      userId,
      createdAt: Date.now(),
    };

    messagesStore.push(message);
    io.to(roomId).emit('message:new', message);

    // Enrich asynchronously and notify clients
    (async () => {
      try {
        const preview = await extractLinkPreviewFromText(text);
        if (preview) {
          message.linkPreview = preview;
          io.to(roomId).emit('message:update', { id: message.id, linkPreview: preview });
        }
      } catch (err) {
        console.error('Link preview extraction failed:', err);
     }
   })();
  });
}
