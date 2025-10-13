import { Server, Socket } from 'socket.io';
import { extractLinkPreviewFromText, LinkPreview } from './utils/linkPreview';

interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: number;
  linkPreview?: LinkPreview;
}

const messagesStore: Message[] = []; // simple in-memory store

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function setupMessageHandler(io: Server, socket: Socket) {
  socket.on('message:new', async (payload: { text: string; roomId: string }) => {
    const { text, roomId } = payload;

    const message: Message = {
      id: generateId(),
      text,
      userId: (socket as any).userId || 'anon',
      createdAt: Date.now(),
    };

    try {
      const preview = await extractLinkPreviewFromText(text);
      if (preview) message.linkPreview = preview;
    } catch (err) {
      console.error('link preview error', err);
    }

    messagesStore.push(message);

    io.to(roomId).emit('message:new', message);
  });
}
