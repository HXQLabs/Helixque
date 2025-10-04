"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  IconLoader2,
  IconMessage2,
  IconUser,
  IconArrowLeft,
  IconRefresh,
} from "@tabler/icons-react";
import ProfessionalChatRoom from "./ProfessionalChatRoom";

const URL = process.env.BACKEND_URI || "http://localhost:5001";

export default function ProfessionalChatLobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [lobby, setLobby] = useState(true);
  const [status, setStatus] = useState<string>("Enter your details to start networking");
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);

  // Handle joining the professional chat queue
  const handleJoinQueue = () => {
    if (!name.trim()) {
      toast.error("Name Required", {
        description: "Please enter your name to continue"
      });
      return;
    }

    setJoined(true);
    setLobby(true);
    setStatus("Connecting to professional network...");
    
    // Initialize socket connection for text-only chat
    const s = io(URL, {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      auth: { name: name.trim(), mode: "text-only" },
    });

    socketRef.current = s;
    s.connect();

    s.on("connect", () => {
      console.log("[PROFESSIONAL CHAT] Socket connected to:", URL);
      setMySocketId(s.id ?? null);
      if (!joinedRef.current) {
        joinedRef.current = true;
        setStatus("Finding a professional to connect with...");
      }
    });

    // Listen for professional chat match
    s.on("professional-chat:matched", ({ roomId: rid, partnerName: partner }: { roomId: string; partnerName: string }) => {
      console.log("[PROFESSIONAL CHAT] Matched with professional:", partner);
      setRoomId(rid);
      setPartnerName(partner);
      setLobby(false);
      setStatus("Connected");
      
      toast.success("Connection Established!", {
        description: `You're now connected with ${partner}`
      });
    });

    // Listen for queue status updates
    s.on("professional-chat:waiting", () => {
      setStatus("Looking for available professionals...");
    });

    s.on("professional-chat:timeout", ({ message }: { message: string }) => {
      setTimeoutMessage(message);
      setShowTimeoutAlert(true);
      setStatus("Connection timeout - try again");
    });

    // Handle partner leaving
    s.on("professional-chat:partner-left", ({ reason }: { reason: string }) => {
      console.log("[PROFESSIONAL CHAT] Partner left:", reason);
      setLobby(true);
      setRoomId(null);
      setPartnerName(null);
      setStatus("Professional disconnected. Finding new connection...");
      
      toast.info("Connection Ended", {
        description: "Your professional has disconnected"
      });
    });

    s.on("disconnect", () => {
      console.log("[PROFESSIONAL CHAT] Disconnected");
      setLobby(true);
      setStatus("Disconnected - reconnecting...");
    });

    // Join the professional chat queue
    s.emit("professional-chat:join-queue", { name: name.trim() });
  };

  const handleRetry = () => {
    setShowTimeoutAlert(false);
    if (socketRef.current) {
      socketRef.current.emit("professional-chat:retry");
      setStatus("Searching for professionals...");
    }
  };

  const handleLeave = () => {
    if (socketRef.current) {
      socketRef.current.emit("professional-chat:leave");
      socketRef.current.disconnect();
    }
    setJoined(false);
    setLobby(true);
    setRoomId(null);
    setPartnerName(null);
    joinedRef.current = false;
  };

  const handleGoHome = () => {
    handleLeave();
    router.push("/");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // If connected to a professional, show the chat room
  if (joined && !lobby && roomId && partnerName) {
    return (
      <ProfessionalChatRoom
        socket={socketRef.current}
        roomId={roomId}
        myName={name}
        partnerName={partnerName}
        mySocketId={mySocketId}
        onLeave={handleLeave}
        onNext={() => {
          setLobby(true);
          setRoomId(null);
          setPartnerName(null);
          setStatus("Finding your next professional connection...");
          socketRef.current?.emit("professional-chat:next");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <IconArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Professional Chat</h1>
            <p className="text-neutral-400 mt-1">Connect with professionals through text</p>
          </div>
          
          <div className="w-24"></div> {/* Spacer for centering */}
        </div>

        {!joined ? (
          /* Join Form */
          <div className="max-w-md mx-auto">
            <div className="p-8 rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <div className="text-center mb-6">
                <div className="p-4 rounded-full bg-green-600/20 w-fit mx-auto mb-4">
                  <IconMessage2 className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">Join Professional Network</h2>
                <p className="text-neutral-400">Enter your name to start connecting with professionals</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    What should we call you?
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full h-12 px-4 rounded-xl border border-white/10 bg-neutral-800/50 text-white placeholder-neutral-500 focus:border-white/30 focus:outline-none transition-colors backdrop-blur"
                    onKeyDown={(e) => e.key === "Enter" && handleJoinQueue()}
                  />
                </div>

                <button
                  onClick={handleJoinQueue}
                  disabled={!name.trim()}
                  className="w-full h-12 bg-white text-black rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 disabled:hover:bg-white"
                >
                  Join Professional Chat
                </button>

                <p className="text-xs text-neutral-500 text-center">
                  By joining, you agree to our terms of service and privacy policy
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Lobby/Waiting Screen */
          <div className="max-w-2xl mx-auto text-center">
            <div className="p-12 rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              
              {/* Loading Animation */}
              <div className="mb-8">
                <IconLoader2 className="h-16 w-16 animate-spin text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-white mb-2">Professional Networking</h2>
                <p className="text-neutral-400 text-lg">{status}</p>
              </div>

              {/* Professional Profile Preview */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="flex flex-col items-center">
                  <div className="p-3 rounded-full bg-green-600/20 border-2 border-green-500/30">
                    <IconUser className="h-6 w-6 text-green-400" />
                  </div>
                  <span className="text-sm text-white mt-2">{name}</span>
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                  <div className="h-px bg-gradient-to-r from-transparent via-neutral-600 to-transparent w-full max-w-32"></div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="p-3 rounded-full bg-neutral-700/50 border-2 border-neutral-600/30">
                    <IconMessage2 className="h-6 w-6 text-neutral-400" />
                  </div>
                  <span className="text-sm text-neutral-400 mt-2">Searching...</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleLeave}
                  className="px-6 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Timeout Alert */}
            {showTimeoutAlert && (
              <div className="mt-6 p-4 rounded-xl bg-yellow-600/10 border border-yellow-500/20">
                <p className="text-yellow-400 mb-3">{timeoutMessage}</p>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30 transition-colors"
                >
                  <IconRefresh className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}