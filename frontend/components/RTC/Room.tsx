"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import ChatPanel from "./Chat/chat";
import VideoGrid from "./VideoGrid";
import ControlBar from "./ControlBar";
import TimeoutAlert from "./TimeoutAlert";
import { 
  useMediaState, 
  usePeerState, 
  useRoomState,
} from "./hooks";
import { detachLocalPreview, stopProvidedTracks } from "./webrtc-utils";
import { useWebRTCConnection } from "./hooks/useWebRTCConnection";
import { useMediaControls } from "./hooks/useMediaControls";
import { useRoomActions } from "./hooks/useRoomActions";


const URL = process.env.BACKEND_URI || "http://localhost:5001";

interface RoomProps {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
  audioOn?: boolean;
  videoOn?: boolean;
  onLeave?: () => void;
}

export default function Room({
  name,
  localAudioTrack,
  localVideoTrack,
  audioOn,
  videoOn,
  onLeave,
}: RoomProps) {
  // Custom hooks for state management
  const mediaState = useMediaState(audioOn, videoOn);
  const peerState = usePeerState();
  const roomState = useRoomState();

  const { micOn, setMicOn, camOn, setCamOn, screenShareOn, setScreenShareOn } = mediaState;
  const { peerMicOn, setPeerMicOn, peerCamOn, setPeerCamOn, peerScreenShareOn, setPeerScreenShareOn } = peerState;
  const { 
    showChat, setShowChat, roomId, setRoomId, mySocketId, setMySocketId,
    lobby, setLobby, status, setStatus, showTimeoutAlert, setShowTimeoutAlert,
    timeoutMessage, setTimeoutMessage 
  } = roomState;

  // DOM refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localScreenShareRef = useRef<HTMLVideoElement>(null);
  const remoteScreenShareRef = useRef<HTMLVideoElement>(null);

  // socket/pc refs
  const socketRef = useRef<Socket | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const joinedRef = useRef(false);

  // Initialize WebRTC connection hook
  const webrtcConnection = useWebRTCConnection({
    localAudioTrack,
    localVideoTrack,
    micOn,
    camOn,
    peerScreenShareOn,
    roomId
  });

  // Initialize media controls hook
  const mediaControls = useMediaControls({
    localAudioTrack,
    localVideoTrack,
              micOn,
    camOn,
    screenShareOn,
    setMicOn,
    setCamOn,
    setScreenShareOn,
    currentVideoTrackRef: webrtcConnection.currentVideoTrackRef,
    currentScreenShareTrackRef: webrtcConnection.currentScreenShareTrackRef,
    localScreenShareStreamRef: webrtcConnection.localScreenShareStreamRef,
    videoSenderRef: webrtcConnection.videoSenderRef,
    sendingPcRef: webrtcConnection.sendingPcRef,
    receivingPcRef: webrtcConnection.receivingPcRef,
    localVideoRef,
    localScreenShareRef,
    roomId,
    socket: socketRef.current
  });

  // Handle next connection function
  const handleNextConnection = useCallback((currentCamState: boolean, currentMicState: boolean, reason: "next" | "partner-left" = "next") => {
    console.log("🔄 HANDLE_NEXT_CONNECTION START:", { currentCamState, currentMicState, reason });
    
    // Clear ICE candidate queues
    webrtcConnection.clearIceQueues();
    
    webrtcConnection.cleanup(
      reason,
      remoteVideoRef,
      remoteAudioRef,
      localScreenShareRef,
      {
        setShowChat,
        setPeerMicOn,
        setPeerCamOn,
        setScreenShareOn: () => {}, // Don't reset screen share on next
        setPeerScreenShareOn,
        setLobby,
        setStatus
      }
    );

    if (!currentCamState) {
      console.log("🚫 CAMERA OFF - Cleaning up video tracks");
      if (webrtcConnection.currentVideoTrackRef.current) {
        try {
          console.log("🛑 Stopping video track:", webrtcConnection.currentVideoTrackRef.current.id);
          webrtcConnection.currentVideoTrackRef.current.stop();
          webrtcConnection.currentVideoTrackRef.current = null;
          console.log("✅ Video track stopped and cleared");
        } catch (err) {
          console.error("❌ Error stopping video track:", err);
        }
      }
      
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const ms = localVideoRef.current.srcObject as MediaStream;
        const videoTracks = ms.getVideoTracks();
        for (const t of videoTracks) {
          try {
            t.stop();
            ms.removeTrack(t);
          } catch (err) {
            console.error("❌ Error stopping local preview track:", err);
          }
        }
      }
    }

    console.log("🔄 HANDLE_NEXT_CONNECTION END - States preserved:", { camOn: currentCamState, micOn: currentMicState });
  }, [webrtcConnection, camOn, micOn, localAudioTrack, localVideoRef]);

  // Initialize room actions hook
  const roomActions = useRoomActions({
    socket: socketRef.current,
    roomId,
    mySocketId,
    peerIdRef,
    localAudioTrack,
    localVideoTrack,
    currentVideoTrackRef: webrtcConnection.currentVideoTrackRef,
    currentScreenShareTrackRef: webrtcConnection.currentScreenShareTrackRef,
    localScreenShareStreamRef: webrtcConnection.localScreenShareStreamRef,
    screenShareOn,
    camOn,
    micOn,
    sendingPcRef: webrtcConnection.sendingPcRef,
    receivingPcRef: webrtcConnection.receivingPcRef,
    remoteStreamRef: webrtcConnection.remoteStreamRef,
    remoteVideoRef,
    remoteAudioRef,
    videoSenderRef: webrtcConnection.videoSenderRef,
    localScreenShareRef,
    localVideoRef,
    onLeave,
    onNextConnection: handleNextConnection,
    setters: {
      setShowChat,
      setPeerMicOn,
      setPeerCamOn,
      setScreenShareOn,
      setPeerScreenShareOn,
      setLobby,
      setStatus
    }
  });

  // Helper function for remote stream management
  const ensureRemoteStreamLocal = useCallback(() => {
    if (!webrtcConnection.remoteStreamRef.current) {
      webrtcConnection.remoteStreamRef.current = new MediaStream();
    }
    if (remoteVideoRef.current && !peerScreenShareOn) {
      remoteVideoRef.current.srcObject = webrtcConnection.remoteStreamRef.current;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = webrtcConnection.remoteStreamRef.current;
    }
    if (remoteScreenShareRef.current && peerScreenShareOn) {
      remoteScreenShareRef.current.srcObject = webrtcConnection.remoteStreamRef.current;
    }
  }, [webrtcConnection.remoteStreamRef, peerScreenShareOn]);

  // Helper for common PC setup
  const setupPeerConnection = useCallback(async (pc: RTCPeerConnection, isOffer: boolean, rid: string, socket: Socket) => {
    webrtcConnection.videoSenderRef.current = null;
    
    if (localAudioTrack && localAudioTrack.readyState === "live" && micOn) {
      pc.addTrack(localAudioTrack);
    }
    
    if (camOn) {
      let videoTrack = webrtcConnection.currentVideoTrackRef.current;
      if (!videoTrack || videoTrack.readyState === "ended") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoTrack = stream.getVideoTracks()[0];
          webrtcConnection.currentVideoTrackRef.current = videoTrack;
        } catch (err) {
          console.error("Error creating video track:", err);
          videoTrack = null;
        }
      }
      
      if (videoTrack && videoTrack.readyState === "live") {
        const vs = pc.addTrack(videoTrack);
        webrtcConnection.videoSenderRef.current = vs;
      }
    }

    ensureRemoteStreamLocal();
    pc.ontrack = (e) => {
      console.log("🎯 Received track event!");
      if (!webrtcConnection.remoteStreamRef.current) webrtcConnection.remoteStreamRef.current = new MediaStream();
      if (e.track.kind === 'video') {
        webrtcConnection.remoteStreamRef.current.getVideoTracks().forEach((track: MediaStreamTrack) => 
          webrtcConnection.remoteStreamRef.current?.removeTrack(track)
        );
      }
      webrtcConnection.remoteStreamRef.current.addTrack(e.track);
      ensureRemoteStreamLocal();
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("add-ice-candidate", { 
          candidate: e.candidate, 
          type: isOffer ? "sender" : "receiver", 
          roomId: rid 
        });
      }
    };
  }, [webrtcConnection, localAudioTrack, micOn, camOn, ensureRemoteStreamLocal]);


  // ===== EFFECTS =====
  useEffect(() => {
    if (localVideoTrack) {
      webrtcConnection.currentVideoTrackRef.current = localVideoTrack;
    }
  }, [localVideoTrack, webrtcConnection.currentVideoTrackRef]);



  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (!localVideoTrack && !localAudioTrack) return;

    const stream = new MediaStream([
      ...(localVideoTrack ? [localVideoTrack] : []),
      ...(localAudioTrack ? [localAudioTrack] : []),
    ]);

    el.srcObject = stream;
    el.muted = true;
    el.playsInline = true;

    const tryPlay = () => el.play().catch(() => {});
    tryPlay();

    const onceClick = () => {
      tryPlay();
      window.removeEventListener("click", onceClick);
    };
    window.addEventListener("click", onceClick, { once: true });

    return () => window.removeEventListener("click", onceClick);
  }, [localAudioTrack, localVideoTrack]);

  useEffect(() => {
    if (!roomId || !socketRef.current) return;
    socketRef.current.emit("media:state", { roomId, state: { micOn, camOn } });
  }, [micOn, camOn, roomId]);

  // Main socket connection effect
  useEffect(() => {
    if (socketRef.current) return;

    const s = io(URL, {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      auth: { name },
    });

    socketRef.current = s;
    s.connect();

    s.on("connect", () => {
      console.log("[FRONTEND] Socket connected to:", URL);
      setMySocketId(s.id ?? null);
      if (!joinedRef.current) {
        joinedRef.current = true;
      }
    });

    // ----- CALLER -----
    s.on("send-offer", async ({ roomId: rid }) => {
      setRoomId(rid);
      s.emit("chat:join", { roomId: rid, name });
      setLobby(false);
      setStatus("Connecting…");
      
      toast.success("Connected!", {
        description: "You've been connected to someone"
      });

      const pc = new RTCPeerConnection();
      webrtcConnection.sendingPcRef.current = pc;
      peerIdRef.current = rid;
      
      await setupPeerConnection(pc, true, rid, s);

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      s.emit("offer", { sdp: offer, roomId: rid });
    });

    // ----- ANSWERER -----
    s.on("offer", async ({ roomId: rid, sdp: remoteSdp }) => {
      setRoomId(rid);
      s.emit("chat:join", { roomId: rid, name });
      setLobby(false);
      setStatus("Connecting…");
      
      toast.success("Connected!", {
        description: "You've been connected to someone"
      });

      const pc = new RTCPeerConnection();
      webrtcConnection.receivingPcRef.current = pc;
      peerIdRef.current = rid;
      
      await setupPeerConnection(pc, false, rid, s);
      await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
      await webrtcConnection.processQueuedIceCandidates(pc, webrtcConnection.receiverIceCandidatesQueue.current);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit("answer", { roomId: rid, sdp: answer });
    });

    // caller receives answer
    s.on("answer", async ({ sdp: remoteSdp }) => {
      const pc = webrtcConnection.sendingPcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
      
      // Process any queued ICE candidates now that remote description is set
      await webrtcConnection.processQueuedIceCandidates(pc, webrtcConnection.senderIceCandidatesQueue.current);
    });

    // trickle ICE
    s.on("add-ice-candidate", async ({ candidate, type }) => {
      try {
        const ice = new RTCIceCandidate(candidate);
        
        if (type === "sender") {
          const pc = webrtcConnection.receivingPcRef.current;
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(ice);
          } else {
            // Queue the candidate until remote description is set
            webrtcConnection.receiverIceCandidatesQueue.current.push(ice);
            console.log("Queued ICE candidate for receiver (no remote description yet)");
          }
        } else {
          const pc = webrtcConnection.sendingPcRef.current;
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(ice);
          } else {
            // Queue the candidate until remote description is set
            webrtcConnection.senderIceCandidatesQueue.current.push(ice);
            console.log("Queued ICE candidate for sender (no remote description yet)");
          }
        }
      } catch (e) {
        console.error("addIceCandidate error", e);
      }
    });

    // Renegotiation handlers
    s.on("renegotiate-offer", async ({ sdp, role }) => {
      console.log("Received renegotiation offer from", role);
      const pc = webrtcConnection.receivingPcRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit("renegotiate-answer", { roomId, sdp: answer, role: "answerer" });
      }
    });

    s.on("renegotiate-answer", async ({ sdp, role }) => {
      console.log("Received renegotiation answer from", role);
      const pc = webrtcConnection.sendingPcRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    // Room events
    s.on("lobby", () => {
      console.log("[FRONTEND] Received lobby event");
      setLobby(true);
      setStatus("Waiting to connect you to someone…");
    });

    s.on("queue:waiting", () => {
      setLobby(true);
      setStatus("Searching for the best match…");
    });

    s.on("queue:timeout", ({ message }: { message: string }) => {
      console.log("[FRONTEND] Received queue:timeout event:", { message });
      setTimeoutMessage(message);
      setShowTimeoutAlert(true);
      setLobby(true);
      setStatus("No match found. Try again?");
    });

    s.on("partner:left", () => {
      console.log("👋 PARTNER LEFT");
      toast.warning("Partner Left", {
        description: "Your partner has left the call"
      });
      
      const actualCamState = !!(webrtcConnection.currentVideoTrackRef.current && webrtcConnection.currentVideoTrackRef.current.readyState === "live" && camOn);
      const actualMicState = !!(localAudioTrack && localAudioTrack.readyState === "live" && micOn);
      
      handleNextConnection(actualCamState, actualMicState, "partner-left");
    });

    s.on("peer:media-state", ({ state }: { state: { micOn?: boolean; camOn?: boolean } }) => {
      if (typeof state?.micOn === "boolean") setPeerMicOn(state.micOn);
      if (typeof state?.camOn === "boolean") setPeerCamOn(state.camOn);
    });

    s.on("peer-media-state-change", ({ isScreenSharing, micOn: peerMic, camOn: peerCam, from, userId }) => {
      console.log("🔄 Peer media state changed:", { isScreenSharing, peerMic, peerCam, from, userId });
      
      if (typeof isScreenSharing === "boolean") {
        setPeerScreenShareOn(isScreenSharing);
      }
      if (typeof peerMic === "boolean") {
        setPeerMicOn(peerMic);
      }
      if (typeof peerCam === "boolean") {
        setPeerCamOn(peerCam);
      }
    });

    const onBeforeUnload = () => {
      try {
        s.emit("queue:leave");
      } catch {}
      stopProvidedTracks(localVideoTrack, localAudioTrack, webrtcConnection.currentVideoTrackRef);
      detachLocalPreview(localVideoRef);
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      s.disconnect();
      socketRef.current = null;
      detachLocalPreview(localVideoRef);
    };
  }, [name, localAudioTrack, localVideoTrack, camOn, micOn, peerScreenShareOn]);

  // ===== RENDER =====
  return (
    <div className="relative flex min-h-screen flex-col bg-neutral-950 text-white">
      {/* Main Content Area */}
      <main className="relative flex-1">
        <div className={`relative mx-auto max-w-[1400px] h-[calc(100vh-80px)] transition-all duration-300 ${
          showChat ? 'px-2 pr-[500px] sm:pr-[500px] md:pr-[540px] lg:pr-[600px]' : 'px-4'
        } pt-4`}>
          
          <VideoGrid
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            localScreenShareRef={localScreenShareRef}
            remoteScreenShareRef={remoteScreenShareRef}
            showChat={showChat}
            lobby={lobby}
            status={status}
            name={name}
            mediaState={mediaState}
            peerState={peerState}
          />

          {/* Hidden remote audio */}
          <audio ref={remoteAudioRef} style={{ display: "none" }} />
        </div>

        {/* Chat Drawer */}
        <div
          className={`fixed top-4 right-0 bottom-20 w-full sm:w-[500px] md:w-[540px] lg:w-[600px] transform border border-white/10 border-r-0 bg-neutral-950 backdrop-blur transition-transform duration-300 rounded-l-2xl ${
            showChat ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full">
            <ChatPanel
              socket={socketRef.current}
              roomId={roomId}
              name={name}
              mySocketId={mySocketId}
              collapsed={false}
              isOpen={showChat}
            />
          </div>
        </div>
      </main>

      <ControlBar
        mediaState={mediaState}
        showChat={showChat}
        onToggleMic={mediaControls.toggleMic}
        onToggleCam={mediaControls.toggleCam}
        onToggleScreenShare={mediaControls.toggleScreenShare}
        onToggleChat={() => setShowChat((v) => !v)}
        onRecheck={roomActions.handleRecheck}
        onNext={roomActions.handleNext}
        onLeave={roomActions.handleLeave}
        onReport={() => roomActions.handleReport()}
      />

      <TimeoutAlert
        show={showTimeoutAlert}
        message={timeoutMessage}
        onRetry={roomActions.handleRetryMatchmaking}
        onCancel={roomActions.handleCancelTimeout}
        onKeyDown={roomActions.handleKeyDown}
      />
    </div>
  );
}