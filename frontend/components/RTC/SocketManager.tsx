import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

const URL = process.env.BACKEND_URI || "https://poc-v2-1.onrender.com";

interface SocketManagerProps {
  name: string;
  onSocketReady: (socket: Socket) => void;
  onRoomJoined: (data: { roomId: string; mySocketId: string }) => void;
  onUserJoined: () => void;
  onUserLeft: (reason?: string) => void;
  onOffer: (data: any) => void;
  onAnswer: (data: any) => void;
  onIceCandidate: (data: any) => void;
  onRenegotiateOffer: (data: any) => void;
  onRenegotiateAnswer: (data: any) => void;
  onMediaStateChange: (data: any) => void;
}

export default function SocketManager({
  name,
  onSocketReady,
  onRoomJoined,
  onUserJoined,
  onUserLeft,
  onOffer,
  onAnswer,
  onIceCandidate,
  onRenegotiateOffer,
  onRenegotiateAnswer,
  onMediaStateChange,
}: SocketManagerProps) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    console.log("🔌 Connecting to socket server...");
    const socket = io(URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to server with ID:", socket.id);
      onSocketReady(socket);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason);
      toast.error("Connection Lost", {
        description: "Trying to reconnect..."
      });
    });

    socket.on("room-joined", (data) => {
      console.log("🏠 Joined room:", data);
      onRoomJoined(data);
    });

    socket.on("user-joined", () => {
      console.log("👤 Another user joined the room");
      onUserJoined();
    });

    socket.on("user-left", (data) => {
      console.log("👋 User left:", data);
      onUserLeft(data?.reason);
    });

    socket.on("offer", (data) => {
      console.log("📥 Received offer:", data);
      onOffer(data);
    });

    socket.on("answer", (data) => {
      console.log("📥 Received answer:", data);
      onAnswer(data);
    });

    socket.on("ice-candidate", (data) => {
      console.log("🧊 Received ICE candidate:", data);
      onIceCandidate(data);
    });

    socket.on("renegotiate-offer", (data) => {
      console.log("🔄 Received renegotiate offer:", data);
      onRenegotiateOffer(data);
    });

    socket.on("renegotiate-answer", (data) => {
      console.log("🔄 Received renegotiate answer:", data);
      onRenegotiateAnswer(data);
    });

    socket.on("media-state-change", (data) => {
      console.log("📺 Received media state change:", data);
      onMediaStateChange(data);
    });

    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
      toast.error("Connection Error", {
        description: error.message || "An unexpected error occurred"
      });
    });

    // Join matching queue immediately
    console.log("🎯 Joining match queue with name:", name);
    socket.emit("join-match", { name });

    return () => {
      console.log("🔌 Cleaning up socket connection");
      socket.disconnect();
    };
  }, [name, onSocketReady, onRoomJoined, onUserJoined, onUserLeft, onOffer, onAnswer, onIceCandidate, onRenegotiateOffer, onRenegotiateAnswer, onMediaStateChange]);

  return null; // This component doesn't render anything
}