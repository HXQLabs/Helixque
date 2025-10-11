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
  const storageKeyRef = useRef<string>(`chat:last`);
  // continuous log across matches; no conversation reset
  const lastSystemRef = useRef<{ text: string; ts: number } | null>(null);
  const pendingSystemRef = useRef<{ text: string; ts: number }[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingJoinRef = useRef<{ text: string; ts: number } | null>(null);
  const pendingJoinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sessionStorage helpers
  const loadPersisted = () => {
    try {
      const raw = sessionStorage.getItem(storageKeyRef.current);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { messages?: ChatMessage[] };
      return Array.isArray(parsed?.messages) ? parsed.messages.slice(-MAX_BUFFER) : null;
    } catch {
      return null;
    }
  };

  const savePersisted = (msgs: ChatMessage[]) => {
    try {
      sessionStorage.setItem(
        storageKeyRef.current,
        JSON.stringify({ messages: msgs.slice(-MAX_BUFFER) })
      );
    } catch {}
  };

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

    // stable key for last conversation continuity
    storageKeyRef.current = `chat:last`;

    // hydrate from sessionStorage before any server events
    if (messages.length === 0) {
      const cached = loadPersisted();
      if (cached && cached.length > 0) setMessages(cached);
    }
    // keep existing messages; no reset on next match

    const join = () => socket.emit("chat:join", { roomId, name });
    // initial join will be emitted after listeners are attached
    const onConnect = () => {
      // re-join on reconnect
      sidRef.current = socket.id ?? null;
      join();
    };

    const onMsg = (m: ChatMessage) => {
      // skip server echo of my optimistic send
      const myId = mySocketId || sidRef.current;
      if (m.clientId === myId) return;
      setMessages((prev) => {
        const next = [...prev, { ...m, kind: "user" as const }];
        const trimmed = next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
        savePersisted(trimmed);
        return trimmed;
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
            return `${isSelf ? name : "peer"} ${action} the chat`;
          }
        } catch {}
        return txt;
      };
      const text = normalize(m.text);

      // drop duplicates within a short time window
      const incomingTs = m.ts ?? Date.now();
      const last = lastSystemRef.current;
      if (last && last.text === text && Math.abs(incomingTs - last.ts) < 1500) {
        return; // duplicate burst (live + history), ignore
      }
      lastSystemRef.current = { text, ts: incomingTs };

      const isLeft = /left the chat/i.test(text);
      const isJoined = /joined the chat/i.test(text);

      // Gate: delay joined slightly so a preceding left can be inserted first
      if (isJoined) {
        // replace any existing pending join with the latest
        pendingJoinRef.current = { text, ts: incomingTs };
        if (pendingJoinTimerRef.current) clearTimeout(pendingJoinTimerRef.current);
        pendingJoinTimerRef.current = setTimeout(() => {
          // if no left arrived in the window, release the pending join into the batch
          if (pendingJoinRef.current) {
            pendingSystemRef.current.push(pendingJoinRef.current);
            pendingJoinRef.current = null;
            scheduleFlush();
          }
        }, 700);
        return; // don't immediately add joined
      }

      // If a left arrives and a join is pending, emit left then the pending join
      if (isLeft && pendingJoinRef.current) {
        pendingSystemRef.current.push({ text, ts: incomingTs });
        pendingSystemRef.current.push(pendingJoinRef.current);
        pendingJoinRef.current = null;
        if (pendingJoinTimerRef.current) {
          clearTimeout(pendingJoinTimerRef.current);
          pendingJoinTimerRef.current = null;
        }
        scheduleFlush(true);
        return;
      }

      // Default: buffer briefly to coalesce and order
      pendingSystemRef.current.push({ text, ts: incomingTs });
      scheduleFlush();

      function scheduleFlush(immediate = false) {
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => {
        const batch = pendingSystemRef.current.splice(0, pendingSystemRef.current.length);
        if (batch.length === 0) return;
        // sort by timestamp; when very close in time, place "left" before "joined"
        const nearWindowMs = 800;
        const isLeft = (t: string) => /left the chat/i.test(t);
        const isJoined = (t: string) => /joined the chat/i.test(t);
        batch.sort((a, b) => {
          if (a.ts === b.ts || Math.abs(a.ts - b.ts) < nearWindowMs) {
            if (isLeft(a.text) && isJoined(b.text)) return -1;
            if (isJoined(a.text) && isLeft(b.text)) return 1;
          }
          return a.ts - b.ts;
        });
        setMessages((prev) => {
          let next = prev.slice();
          for (const item of batch) {
            // skip if an identical system text exists very recently (avoid live+history duplicates only)
            const nowWindowMs = 2000;
            const tail = next.slice(-8);
            const hasRecentSame = tail.some(
              (x) => x.kind === "system" && x.text === item.text && Math.abs(item.ts - x.ts) < nowWindowMs
            );
            if (hasRecentSame) continue;

            const isLeftMsg = /left the chat/i.test(item.text);
            const isJoinedMsg = /joined the chat/i.test(item.text);

            // If a LEFT comes after a JOIN already shown, reorder so LEFT appears before JOIN
            if (isLeftMsg && tail.length > 0) {
              const lastIdx = next.length - 1;
              const lastMsg = next[lastIdx];
              if (
                lastMsg &&
                lastMsg.kind === "system" &&
                /joined the chat/i.test(lastMsg.text) &&
                Math.abs(item.ts - lastMsg.ts) < 3000
              ) {
                // remove the last JOIN, then append LEFT then re-append JOIN
                next = next.slice(0, lastIdx);
                next.push({ text: item.text, from: "system", clientId: "system", ts: item.ts, kind: "system" as const });
                next.push(lastMsg);
                continue;
              }
            }

            // default append
            next.push({ text: item.text, from: "system", clientId: "system", ts: item.ts, kind: "system" as const });
          }
          const trimmed = next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
          savePersisted(trimmed);
          return trimmed;
        });
        }, immediate ? 0 : 350);
      }
    };

    const onTyping = ({ from, typing }: { from: string; typing: boolean }) => {
      setPeerTyping(typing ? `Peer is typing…` : null);
      if (typing) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setPeerTyping(null), 3000);
      }
    };

    const onHistory = (payload: { roomId: string; messages: ChatMessage[] }) => {
      if (!payload || payload.roomId !== roomId) return;
      const normalized = (payload.messages || []).slice(-MAX_BUFFER);
      // Merge server history into existing messages with simple de-dupe
      setMessages((prev) => {
        const existingKeys = new Set(prev.map((x) => `${x.kind}|${x.ts}|${x.clientId}|${x.text}`));
        const additions = normalized.filter((x) => {
          // normalize system messages before checking duplicates
          const key = `${(x.kind || 'user')}|${x.ts}|${x.clientId}|${x.text}`;
          return !existingKeys.has(key);
        });
        if (additions.length === 0) return prev;
        const merged = [...prev, ...additions];
        const trimmed = merged.length > MAX_BUFFER ? merged.slice(-MAX_BUFFER) : merged;
        savePersisted(trimmed);
        return trimmed;
      });
    };

 //   const onPartnerLeft = ({ reason }: { reason: string }) => {
  //    onSystem({ text: `Your partner left (${reason}).` });
  //  };

    socket.on("connect", onConnect);
    socket.on("chat:message", onMsg);
    socket.on("chat:system", onSystem);
    socket.on("chat:typing", onTyping);
    socket.on("chat:history", onHistory);
 //   socket.on("partner:left", onPartnerLeft);

    // now that listeners are wired, perform initial join
    join(); // initial

    return () => {
      socket.off("connect", onConnect);
      socket.off("chat:message", onMsg);
      socket.off("chat:system", onSystem);
      socket.off("chat:typing", onTyping);
      socket.off("chat:history", onHistory);
 //     socket.off("partner:left", onPartnerLeft);
      // stop typing when leaving room/unmounting
      socket.emit("chat:typing", { roomId, from: name, typing: false });
      // announce leaving the chat room
      socket.emit("chat:leave", { roomId, name });

      // clear system dedupe buffers on room change/unmount
      pendingSystemRef.current = [];
      lastSystemRef.current = null;
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (pendingJoinTimerRef.current) {
        clearTimeout(pendingJoinTimerRef.current);
        pendingJoinTimerRef.current = null;
      }
      pendingJoinRef.current = null;
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
      const trimmed = next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
      savePersisted(trimmed);
      return trimmed;
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
