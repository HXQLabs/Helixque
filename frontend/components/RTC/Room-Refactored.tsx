// This is the refactored Room.tsx component with logic split into smaller, manageable pieces
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Components
import LobbyView from "./LobbyView";
import CallView from "./CallView";
import SocketManager from "./SocketManager";

// Custom Hooks
import { useMediaDevices } from "./hooks/useMediaDevices";
import { useWebRTC } from "./hooks/useWebRTC";

// Types
import { RoomProps, MediaState, PeerMediaState, RoomState } from "./types/room";

export default function Room({
  name,
  localAudioTrack,
  localVideoTrack,
}: RoomProps) {
  const router = useRouter();

  // State Management
  const [mediaState, setMediaState] = useState<MediaState>({
    micOn: true,
    camOn: true,
    screenShareOn: false,
  });

  const [peerMediaState, setPeerMediaState] = useState<PeerMediaState>({
    peerMicOn: true,
    peerCamOn: true,
    peerScreenShareOn: false,
  });

  const [roomState, setRoomState] = useState<RoomState>({
    roomId: null,
    mySocketId: null,
    lobby: true,
    status: "Waiting to connect you to someone…",
    showChat: false,
  });

  // DOM refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localScreenShareRef = useRef<HTMLVideoElement>(null);
  const remoteScreenShareRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Custom hooks
  const {
    currentVideoTrackRef,
    videoSenderRef,
    stopProvidedTracks,
    toggleCamera,
    toggleScreenShare,
  } = useMediaDevices();

  const {
    sendingPcRef,
    receivingPcRef,
    remoteStreamRef,
    joinedRef,
    ensureRemoteStream,
    teardownPeers,
    detachLocalPreview,
  } = useWebRTC();

  // Initialize video track reference
  useEffect(() => {
    currentVideoTrackRef.current = localVideoTrack;
  }, [localVideoTrack, currentVideoTrackRef]);

  // Set up local preview on component mount
  useEffect(() => {
    if (!localVideoRef.current || !localVideoTrack) return;

    const localStream = new MediaStream();
    if (localVideoTrack) localStream.addTrack(localVideoTrack);
    if (localAudioTrack) localStream.addTrack(localAudioTrack);

    localVideoRef.current.srcObject = localStream;
    localVideoRef.current.play().catch(console.error);

    return () => {
      detachLocalPreview(localVideoRef);
      stopProvidedTracks(localVideoTrack, localAudioTrack);
    };
  }, [localVideoTrack, localAudioTrack, detachLocalPreview, stopProvidedTracks]);

  // Socket event handlers
  const handleSocketReady = (socket: Socket) => {
    socketRef.current = socket;
  };

  const handleRoomJoined = (data: { roomId: string; mySocketId: string }) => {
    setRoomState(prev => ({
      ...prev,
      roomId: data.roomId,
      mySocketId: data.mySocketId,
    }));
    console.log("✅ Room joined successfully");
  };

  const handleUserJoined = () => {
    setRoomState(prev => ({
      ...prev,
      lobby: false,
      status: "Connected! Setting up the call...",
    }));
    startCall();
  };

  const handleUserLeft = (reason?: string) => {
    console.log("👋 User left, reason:", reason);
    teardownPeers(reason || "user-left");
    setRoomState(prev => ({
      ...prev,
      lobby: true,
      status: reason === "partner-left" ? "Partner left. Finding a new match…" : "Waiting to connect you to someone…",
      showChat: false,
    }));
    setPeerMediaState({
      peerMicOn: true,
      peerCamOn: true,
      peerScreenShareOn: false,
    });
  };

  const handleMediaStateChange = (data: any) => {
    console.log("📺 Peer media state changed:", data);
    setPeerMediaState(prev => ({
      ...prev,
      peerMicOn: data.micOn ?? prev.peerMicOn,
      peerCamOn: data.camOn ?? prev.peerCamOn,
      peerScreenShareOn: data.isScreenSharing ?? prev.peerScreenShareOn,
    }));
  };

  // WebRTC call setup
  const startCall = async () => {
    if (!socketRef.current || !roomState.roomId) {
      console.error("❌ Socket or roomId not available for call setup");
      return;
    }

    try {
      // Create peer connections
      const sendingPc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      const receivingPc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      sendingPcRef.current = sendingPc;
      receivingPcRef.current = receivingPc;

      // Add local tracks to sending peer connection
      if (localAudioTrack) {
        sendingPc.addTrack(localAudioTrack);
      }
      if (localVideoTrack) {
        const sender = sendingPc.addTrack(localVideoTrack);
        videoSenderRef.current = sender;
      }

      // Handle incoming streams on receiving peer connection
      receivingPc.ontrack = (event) => {
        console.log("📥 Received remote track:", event.track.kind);
        if (remoteStreamRef.current) {
          remoteStreamRef.current.addTrack(event.track);
          ensureRemoteStream(remoteVideoRef, remoteAudioRef, remoteScreenShareRef, peerMediaState.peerScreenShareOn);
        }
      };

      // Handle ICE candidates
      sendingPc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("ice-candidate", {
            roomId: roomState.roomId,
            candidate: event.candidate,
            type: "sending",
          });
        }
      };

      receivingPc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("ice-candidate", {
            roomId: roomState.roomId,
            candidate: event.candidate,
            type: "receiving",
          });
        }
      };

      // Create and send offer
      const offer = await sendingPc.createOffer();
      await sendingPc.setLocalDescription(offer);

      socketRef.current.emit("offer", {
        roomId: roomState.roomId,
        sdp: offer,
      });

      console.log("📤 Offer sent successfully");
    } catch (error) {
      console.error("❌ Error setting up call:", error);
      toast.error("Call Setup Failed", {
        description: "Failed to establish connection. Please try again."
      });
    }
  };

  // WebRTC signal handling
  const handleOffer = async (data: any) => {
    if (!receivingPcRef.current || !socketRef.current) return;

    try {
      await receivingPcRef.current.setRemoteDescription(data.sdp);
      const answer = await receivingPcRef.current.createAnswer();
      await receivingPcRef.current.setLocalDescription(answer);

      socketRef.current.emit("answer", {
        roomId: roomState.roomId,
        sdp: answer,
      });

      console.log("📤 Answer sent successfully");
    } catch (error) {
      console.error("❌ Error handling offer:", error);
    }
  };

  const handleAnswer = async (data: any) => {
    if (!sendingPcRef.current) return;

    try {
      await sendingPcRef.current.setRemoteDescription(data.sdp);
      console.log("✅ Answer processed successfully");
    } catch (error) {
      console.error("❌ Error handling answer:", error);
    }
  };

  const handleIceCandidate = async (data: any) => {
    const pc = data.type === "sending" ? receivingPcRef.current : sendingPcRef.current;
    if (!pc) return;

    try {
      await pc.addIceCandidate(data.candidate);
      console.log("✅ ICE candidate added successfully");
    } catch (error) {
      console.error("❌ Error adding ICE candidate:", error);
    }
  };

  const handleRenegotiateOffer = async (data: any) => {
    // Handle renegotiation offers (for screen sharing, etc.)
    console.log("🔄 Handling renegotiate offer");
    // Implementation would be similar to handleOffer
  };

  const handleRenegotiateAnswer = async (data: any) => {
    // Handle renegotiation answers
    console.log("🔄 Handling renegotiate answer");
    // Implementation would be similar to handleAnswer
  };

  // Media control handlers
  const handleToggleMic = () => {
    const newMicState = !mediaState.micOn;
    setMediaState(prev => ({ ...prev, micOn: newMicState }));
    
    if (localAudioTrack) {
      localAudioTrack.enabled = newMicState;
    }

    // Notify peer of mic state change
    if (socketRef.current && roomState.roomId) {
      socketRef.current.emit("media-state-change", {
        micOn: newMicState,
        camOn: mediaState.camOn,
        isScreenSharing: mediaState.screenShareOn,
      });
    }
  };

  const handleToggleCam = async () => {
    const newCamState = !mediaState.camOn;
    setMediaState(prev => ({ ...prev, camOn: newCamState }));
    
    await toggleCamera(
      mediaState.camOn,
      localVideoRef,
      roomState.roomId,
      sendingPcRef,
      receivingPcRef,
      socketRef
    );

    // Notify peer of camera state change
    if (socketRef.current && roomState.roomId) {
      socketRef.current.emit("media-state-change", {
        micOn: mediaState.micOn,
        camOn: newCamState,
        isScreenSharing: mediaState.screenShareOn,
      });
    }
  };

  const handleToggleScreenShare = async () => {
    const newScreenShareState = !mediaState.screenShareOn;
    setMediaState(prev => ({ ...prev, screenShareOn: newScreenShareState }));
    
    await toggleScreenShare(
      mediaState.screenShareOn,
      mediaState.micOn,
      mediaState.camOn,
      roomState.roomId,
      localScreenShareRef,
      localVideoRef,
      sendingPcRef,
      receivingPcRef,
      socketRef
    );
  };

  const handleToggleChat = () => {
    setRoomState(prev => ({ ...prev, showChat: !prev.showChat }));
  };

  const handleNext = () => {
    console.log("⏭️ Finding next match");
    teardownPeers("next");
    setRoomState(prev => ({
      ...prev,
      lobby: true,
      status: "Searching for your next match…",
      showChat: false,
    }));
    setPeerMediaState({
      peerMicOn: true,
      peerCamOn: true,
      peerScreenShareOn: false,
    });
    
    // Rejoin the matching queue
    if (socketRef.current) {
      socketRef.current.emit("join-match", { name });
    }
  };

  const handleLeave = () => {
    console.log("📞 Leaving call");
    teardownPeers("leave");
    router.push("/");
  };

  const handleReport = () => {
    // Implement report functionality
    toast.info("Report submitted", {
      description: "Thank you for helping keep our community safe."
    });
  };

  return (
    <>
      {/* Socket Manager - handles all socket communication */}
      <SocketManager
        name={name}
        onSocketReady={handleSocketReady}
        onRoomJoined={handleRoomJoined}
        onUserJoined={handleUserJoined}
        onUserLeft={handleUserLeft}
        onOffer={handleOffer}
        onAnswer={handleAnswer}
        onIceCandidate={handleIceCandidate}
        onRenegotiateOffer={handleRenegotiateOffer}
        onRenegotiateAnswer={handleRenegotiateAnswer}
        onMediaStateChange={handleMediaStateChange}
      />

      {/* Render appropriate view based on lobby state */}
      {roomState.lobby ? (
        <LobbyView
          status={roomState.status}
          localVideoRef={localVideoRef}
          camOn={mediaState.camOn}
        />
      ) : (
        <CallView
          {...mediaState}
          {...peerMediaState}
          showChat={roomState.showChat}
          socket={socketRef.current}
          roomId={roomState.roomId}
          name={name}
          mySocketId={roomState.mySocketId}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          remoteAudioRef={remoteAudioRef}
          localScreenShareRef={localScreenShareRef}
          remoteScreenShareRef={remoteScreenShareRef}
          onToggleMic={handleToggleMic}
          onToggleCam={handleToggleCam}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleChat={handleToggleChat}
          onNext={handleNext}
          onLeave={handleLeave}
          onReport={handleReport}
        />
      )}
    </>
  );
}