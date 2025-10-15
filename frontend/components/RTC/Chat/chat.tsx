"use client";
import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";

type ChatMessage = {
  text: string;
  from: string;
  clientId: string;
  ts: number;
  kind?: "user" | "system";
};

const MAX_LEN = 1000;        // match server cap
const MAX_BUFFER = 300;      // keep memory tidy
const TYPING_DEBOUNCE = 350; // ms

export default function ChatPanel({
  socket,
  roomId,
  name,
  mySocketId,
  collapsed = false,
  isOpen = false,
}: {
  socket: Socket | null;
  roomId: string | null;
  name: string;
  mySocketId: string | null;
  collapsed?: boolean;
  isOpen?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [peerTyping, setPeerTyping] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidRef = useRef<string | null>(mySocketId ?? null);
  const didJoinRef = useRef<Record<string, string>>({});

  // derive & keep socket.id fresh for self-dedupe
  useEffect(() => {
    if (!socket) return;
    const setSid = () => {
      sidRef.current = socket.id || sidRef.current || null;
    };
    setSid();
    socket.on("connect", setSid);
    return () => {
      socket.off("connect", setSid);
    };
  }, [socket]);

  const canSend = !!socket && socket.connected && !!roomId && !!name && !!(sidRef.current || mySocketId);

  // Dismiss existing toasts when chat window opens
  useEffect(() => {
    if (isOpen) {
      toast.dismiss();
    }
  }, [isOpen]);

  // auto-scroll to bottom on new messages - DISABLED per user request
  // useEffect(() => {
  //   scrollerRef.current?.scrollTo({
  //     top: scrollerRef.current.scrollHeight,
  //     behavior: "smooth",
  //   });
  // }, [messages.length]);

  // wire socket events + (re)join on mount/room change/reconnect
  useEffect(() => {
    if (!socket || !roomId) return;

    const join = () => socket.emit("chat:join", { roomId, name });
    const joinOnce = () => {
      const sid = socket.id ?? null;
      const key = `${roomId}`;
      if (sid && didJoinRef.current[key] === sid) return; // already joined for this room with this socket id
      if (sid) didJoinRef.current[key] = sid;
      join();
    };
    // initial join will be emitted after listeners are attached
    const onConnect = () => {
      // re-join on reconnect
      sidRef.current = socket.id ?? null;
      joinOnce();
    };

    const onMsg = (m: ChatMessage) => {
      // skip server echo of my optimistic send
      const myId = mySocketId || sidRef.current;
      if (m.clientId === myId) return;
      setMessages((prev) => {
        const next = [...prev, { ...m, kind: "user" as const }];
        return next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
      });
        try {
          // Only show toast if chat window is closed
          if (!isOpen) {
            // subtle toast at bottom-right when receiving a new message
            toast.success(
              `${m.from}: ${m.text.length > 80 ? m.text.slice(0, 77) + '...' : m.text}`,
              { 
                duration: 3500,
                position: 'bottom-right',
                style: {
                  bottom: '100px', // Position above the control icons
                  right: '20px',
                }
              }
            );
          }
        } catch {}
    };

    const onSystem = (m: { text: string; ts?: number }) => {
      // normalize system text: keep my own name, anonymize peers as "peer"
      const normalize = (txt: string) => {
        try {
          const re = /^(.*)\s+(joined|left) the chat.*$/;
          const match = txt.match(re);
          if (match) {
            const who = (match[1] || "").trim();
            const action = match[2];
            const isSelf = who.length > 0 && who.toLowerCase() === (name || "").toLowerCase();
            return `${isSelf ? name : "Peer"} ${action} the chat`;
          }
        } catch {}
        return txt;
      };
      const text = normalize(m.text);

      setMessages((prev) => {
        // simple de-dupe: if last system message has identical text, skip
        const last = prev[prev.length - 1];
        if (last?.kind === "system" && last.text === text) return prev;
        const next = [
          ...prev,
          { text, from: "system", clientId: "system", ts: m.ts ?? Date.now(), kind: "system" as const },
        ];
        return next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
      });
    };

    const onTyping = ({ from, typing }: { from: string; typing: boolean }) => {
      setPeerTyping(typing ? `Peer is typing…` : null);
      if (typing) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setPeerTyping(null), 3000);
      }
    };


    // Handler for when partner leaves the chat
    // const onPartnerLeft = ({ reason }: { reason: string }) => {
    //   console.log("👋 PARTNER LEFT - Chat event received with reason:", reason);
    //   onSystem({ text: `Your partner left (${reason}).` });
    // };

    // Server-sent history: merge with current messages and de-dupe
    const onHistory = (payload: { roomId: string; messages: ChatMessage[] }) => {
      if (!payload || payload.roomId !== roomId) return;
      const incoming = Array.isArray(payload.messages) ? payload.messages : [];
      if (incoming.length === 0) return;
      setMessages((prev) => {
        const keyOf = (x: ChatMessage) => `${x.kind || 'user'}|${x.ts}|${x.clientId}|${x.text}`;
        const seen = new Set(prev.map(keyOf));
        const add = incoming.filter((m) => !seen.has(keyOf(m)));
        if (add.length === 0) return prev;
        const merged = [...prev, ...add];
        return merged.length > MAX_BUFFER ? merged.slice(-MAX_BUFFER) : merged;
      });
    };

    socket.on("connect", onConnect);
    socket.on("chat:message", onMsg);
    socket.on("chat:system", onSystem);
    socket.on("chat:typing", onTyping);
    socket.on("chat:history", onHistory);
    // socket.on("partner:left", onPartnerLeft);

    // perform initial join only once per socket.id+room
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("chat:message", onMsg);
      socket.off("chat:system", onSystem);
      socket.off("chat:typing", onTyping);
      socket.off("chat:history", onHistory);
      // socket.off("partner:left", onPartnerLeft);
      // stop typing when leaving room/unmounting
      socket.emit("chat:typing", { roomId, from: name, typing: false });
      // announce leaving the chat room
      socket.emit("chat:leave", { roomId, name });
    };
  }, [socket, roomId]);

  const sendMessage = () => {
    if (!canSend || !input.trim()) return;
    const myId = mySocketId || sidRef.current!;
    const payload = {
      roomId: roomId!,
      text: input.trim().slice(0, MAX_LEN),
      from: name,
      clientId: myId,
      ts: Date.now(),
    };
    // optimistic add
    setMessages((prev) => {
      const next = [...prev, { ...payload, kind: "user" as const }];
      return next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
    });
    try {
      // toast for outgoing message (short & subtle)
      toast.success("Message sent", { duration: 1200 });
    } catch {}
    socket!.emit("chat:message", payload);
    setInput("");
    socket!.emit("chat:typing", { roomId, from: name, typing: false });
  };

  const handleTyping = (value: string) => {
    setInput(value);
    if (!socket || !roomId) return;

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      socket.emit("chat:typing", { roomId, from: name, typing: !!value });
    }, TYPING_DEBOUNCE);
  };

  if (collapsed) return null;

  return (
    <div className="flex flex-col h-full bg-neutral-950 rounded-l-2xl overflow-hidden">
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map((m, idx) => {
          const myId = mySocketId || sidRef.current;
          const mine = m.clientId === myId;
          const isSystem = m.kind === "system";
          return (
            <div key={idx} className={`flex ${isSystem ? "justify-center" : mine ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  isSystem
                    ? "text-xs text-white/50 italic"
                    : `max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-indigo-600 text-white" : "bg-white/10 text-white/90"
                      }`
                }
                title={new Date(m.ts).toLocaleTimeString()}
              >
                {isSystem ? (
                  <span>{m.text}</span>
                ) : (
                  <>
                    {!mine && <div className="text-[10px] text-white/60 mb-1">Peer</div>}
                    <div>{m.text}</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {peerTyping && <div className="text-xs text-white/60 italic">{peerTyping}</div>}
      </div>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/60"
            placeholder={canSend ? "Type a message…" : "Connecting chat…"}
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            disabled={!canSend}
            maxLength={MAX_LEN}
          />
          <button
            onClick={sendMessage}
            disabled={!canSend || !input.trim()}
            className="cursor-pointer h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
