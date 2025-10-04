"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";
import {
  IconSend,
  IconUser,
  IconMessage2,
  IconPlayerSkipForward,
  IconPhoneOff,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";

interface Message {
  id: string;
  text: string;
  from: string;
  clientId: string;
  ts: number;
  type: 'message' | 'system';
}

interface ProfessionalChatRoomProps {
  socket: Socket | null;
  roomId: string;
  myName: string;
  partnerName: string;
  mySocketId: string | null;
  onLeave: () => void;
  onNext: () => void;
}

export default function ProfessionalChatRoom({
  socket,
  roomId,
  myName,
  partnerName,
  mySocketId,
  onLeave,
  onNext,
}: ProfessionalChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [connected, setConnected] = useState(true);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || !socket || !roomId) return;

    const message: Message = {
      id: `${mySocketId}-${Date.now()}`,
      text,
      from: myName,
      clientId: mySocketId || "",
      ts: Date.now(),
      type: 'message',
    };

    // Add to local messages immediately
    setMessages(prev => [...prev, message]);
    
    // Send to server
    socket.emit("professional-chat:message", {
      roomId,
      text,
      from: myName,
      clientId: mySocketId,
    });

    setInputText("");
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canSend = !!socket && connected && !!roomId && !!myName;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-neutral-900/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-600/20">
                <IconUser className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">{partnerName}</h2>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-neutral-400">
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onNext}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
              >
                <IconPlayerSkipForward className="h-4 w-4" />
                <span className="hidden sm:inline">Next</span>
              </button>
              
              <button
                onClick={onLeave}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/20 text-red-400 hover:bg-red-600/30 transition-colors"
              >
                <IconPhoneOff className="h-4 w-4" />
                <span className="hidden sm:inline">End Chat</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6">
        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto py-6 space-y-4 max-h-[calc(100vh-200px)]"
        >
          {messages.map((message) => {
            const isMe = message.clientId === mySocketId;
            const isSystem = message.type === 'system';

            if (isSystem) {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="px-3 py-1 rounded-full bg-neutral-800/50 text-xs text-neutral-400">
                    {message.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[70%]">
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      isMe
                        ? 'bg-green-600 text-white rounded-br-md'
                        : 'bg-neutral-800 text-white rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words">
                      {message.text}
                    </p>
                  </div>
                  
                  <div className={`flex items-center gap-2 mt-1 text-xs text-neutral-500 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}>
                    <span>{isMe ? 'You' : message.from}</span>
                    <span>•</span>
                    <span>{formatTime(message.ts)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-neutral-800/50 mb-4">
                <IconMessage2 className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-neutral-400 text-lg mb-2">Start Your Professional Conversation</p>
              <p className="text-neutral-500 text-sm">
                Send your first message to begin networking with {partnerName}
              </p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 py-4">
          <div className="flex items-end gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={canSend ? "Type your message..." : "Connecting..."}
              disabled={!canSend}
              className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-neutral-800/50 text-white placeholder-neutral-500 focus:border-white/30 focus:outline-none transition-colors backdrop-blur"
            />
            
            <button
              onClick={sendMessage}
              disabled={!canSend || !inputText.trim()}
              className="p-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20"
            >
              <IconSend className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}