"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ChatPanel from "./Chat/chat"; // ← adjust path if different
import VideoGrid from "./VideoGrid";
import ControlBar from "./ControlBar";
import TimeoutAlert from "./TimeoutAlert";
import { useMediaState, usePeerState, useRoomState } from "./hooks";
import { 
  ensureRemoteStream, 
  detachLocalPreview, 
  stopProvidedTracks, 
  teardownPeers,
  toggleCameraTrack
} from "./webrtc-utils";

const URL = process.env.NEXT_PUBLIC_BACKEND_URI || "http://localhost:5001";

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
  const router = useRouter();

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
  const sendingPcRef = useRef<RTCPeerConnection | null>(null);
  const receivingPcRef = useRef<RTCPeerConnection | null>(null);
  const joinedRef = useRef(false);

  // video and screenshare refs
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const currentVideoTrackRef = useRef<MediaStreamTrack | null>(localVideoTrack);
  const currentScreenShareTrackRef = useRef<MediaStreamTrack | null>(null);
  const localScreenShareStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  
  // ICE candidate queues for handling candidates before remote description is set
  const senderIceCandidatesQueue = useRef<RTCIceCandidate[]>([]);
  const receiverIceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  // Helper function for remote stream management
  const ensureRemoteStreamLocal = () => {
    if (!remoteStreamRef.current) {
      remoteStreamRef.current = new MediaStream();
    }
    if (remoteVideoRef.current && !peerScreenShareOn) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
    }
    if (remoteScreenShareRef.current && peerScreenShareOn) {
      remoteScreenShareRef.current.srcObject = remoteStreamRef.current;
    }
  };

  // Helper function to process queued ICE candidates
  const processQueuedIceCandidates = async (pc: RTCPeerConnection, queue: RTCIceCandidate[]) => {
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(candidate);
          // console.log("Processed queued ICE candidate");
        } catch (e) {
          // console.error("Error processing queued ICE candidate:", e);
        }
      }
    }
  };

  // Helper for common PC setup
  const setupPeerConnection = async (pc: RTCPeerConnection, isOffer: boolean, rid: string, socket: Socket) => {
    videoSenderRef.current = null;
    
    if (localAudioTrack && localAudioTrack.readyState === "live" && micOn) {
      pc.addTrack(localAudioTrack);
    }
    
    if (camOn) {
      let videoTrack = currentVideoTrackRef.current;
      if (!videoTrack || videoTrack.readyState === "ended") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoTrack = stream.getVideoTracks()[0];
          currentVideoTrackRef.current = videoTrack;
        } catch (err) {
          // console.error("Error creating video track:", err);
          videoTrack = null;
        }
      }
      
      if (videoTrack && videoTrack.readyState === "live") {
        const vs = pc.addTrack(videoTrack);
        videoSenderRef.current = vs;
      }
    }

    ensureRemoteStreamLocal();
    pc.ontrack = (e) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      if (e.track.kind === 'video') {
        remoteStreamRef.current.getVideoTracks().forEach(track => 
          remoteStreamRef.current?.removeTrack(track)
        );
      }
      remoteStreamRef.current.addTrack(e.track);
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
  };

  // ===== EVENT HANDLERS =====
  const handleRetryMatchmaking = () => {
    if (socketRef.current) {
      socketRef.current.emit("queue:retry");
      setShowTimeoutAlert(false);
      setStatus("Searching for the best match…");
    }
  };

  const handleCancelTimeout = () => {
    if (socketRef.current) {
      socketRef.current.emit("queue:leave");
    }
    setShowTimeoutAlert(false);
    setLobby(false);
    window.location.reload();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelTimeout();
    }
  };

  const toggleMic = () => {
    const on = !micOn;
    setMicOn(on);
    try {
      if (localAudioTrack) localAudioTrack.enabled = on;
    } catch {}
  };

  const toggleCam = async () => {
    await toggleCameraTrack(
      camOn,
      setCamOn,
      currentVideoTrackRef,
      localVideoRef,
      videoSenderRef,
      sendingPcRef,
      receivingPcRef,
      roomId,
      socketRef,
      localVideoTrack
    );
  };

  const toggleScreenShare = async () => {
    const turningOn = !screenShareOn;
    setScreenShareOn(turningOn);

    try {
      const socket = socketRef.current;

      if (turningOn) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });

          const screenTrack = screenStream.getVideoTracks()[0];
          currentScreenShareTrackRef.current = screenTrack;
          localScreenShareStreamRef.current = screenStream;

          if (localScreenShareRef.current) {
            localScreenShareRef.current.srcObject = screenStream;
            await localScreenShareRef.current.play().catch(() => {});
          }

          if (videoSenderRef.current) {
            await videoSenderRef.current.replaceTrack(screenTrack);
            toast.success("Screen Share Started", {
              description: "You are now sharing your screen"
            });
          }

          if (socket && roomId) {
            socket.emit("media-state-change", {
              isScreenSharing: true,
              micOn,
              camOn: false
            });
          }

          screenTrack.onended = async () => {
            setScreenShareOn(false);
            
            let cameraTrack = currentVideoTrackRef.current;
            if (!cameraTrack || cameraTrack.readyState === "ended") {
              if (camOn) {
                try {
                  const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                  cameraTrack = cameraStream.getVideoTracks()[0];
                  currentVideoTrackRef.current = cameraTrack;
                } catch (err: any) {
                  // console.error("Error getting camera after screen share:", err);
                  cameraTrack = null;
                }
              }
            }
            
            if (videoSenderRef.current) {
              await videoSenderRef.current.replaceTrack(camOn ? cameraTrack : null);
            }

            if (localScreenShareRef.current) {
              localScreenShareRef.current.srcObject = null;
            }
            currentScreenShareTrackRef.current = null;
            localScreenShareStreamRef.current = null;

            toast.success("Screen Share Stopped", {
              description: "You have stopped sharing your screen"
            });

            if (socket && roomId) {
              socket.emit("media-state-change", {
                isScreenSharing: false,
                micOn,
                camOn
              });
            }
          };

        } catch (error: any) {
          // console.error("Error starting screen share:", error);
          toast.error("Screen Share Error", {
            description: error?.message || "Failed to start screen sharing"
          });
          setScreenShareOn(false);
        }
      } else {
        // Stop screen sharing manually
        if (currentScreenShareTrackRef.current) {
          currentScreenShareTrackRef.current.stop();
        }
        if (localScreenShareStreamRef.current) {
          localScreenShareStreamRef.current.getTracks().forEach(t => t.stop());
          localScreenShareStreamRef.current = null;
        }
        if (localScreenShareRef.current) {
          localScreenShareRef.current.srcObject = null;
        }

        let cameraTrack = currentVideoTrackRef.current;
        if (!cameraTrack || cameraTrack.readyState === "ended") {
          if (camOn) {
            try {
              const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
              cameraTrack = cameraStream.getVideoTracks()[0];
              currentVideoTrackRef.current = cameraTrack;
              
              if (localVideoRef.current) {
                const ms = localVideoRef.current.srcObject as MediaStream || new MediaStream();
                ms.getVideoTracks().forEach(t => ms.removeTrack(t));
                ms.addTrack(cameraTrack);
                if (!localVideoRef.current.srcObject) localVideoRef.current.srcObject = ms;
                await localVideoRef.current.play().catch(() => {});
              }
            } catch (err: any) {
              // console.error("Error getting camera after stopping screen share:", err);
              toast.error("Camera Error", {
                description: "Failed to restore camera after stopping screen share"
              });
              cameraTrack = null;
            }
          }
        }

        if (videoSenderRef.current) {
          await videoSenderRef.current.replaceTrack(camOn ? cameraTrack : null);
        }

        if (socket && roomId) {
          socket.emit("media-state-change", {
            isScreenSharing: false,
            micOn,
            camOn
          });
        }

        currentScreenShareTrackRef.current = null;
      }
    } catch (error: any) {
      // console.error("toggleScreenShare error", error);
      toast.error("Screen Share Error", {
        description: error?.message || "Failed to toggle screen sharing"
      });
      setScreenShareOn(false);
    }
  };

  const handleNext = () => {
    const s = socketRef.current;
    if (!s) return;

    const actualCamState = !!(currentVideoTrackRef.current && currentVideoTrackRef.current.readyState === "live" && camOn);
    const actualMicState = !!(localAudioTrack && localAudioTrack.readyState === "live" && micOn);

    try {
      remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    s.emit("queue:next");
    handleNextConnection(actualCamState, actualMicState, "next");
  };

  const handleLeave = () => {
    const s = socketRef.current;

    try {
      s?.emit("queue:leave");
    } catch {}

    if (screenShareOn) {
      if (currentScreenShareTrackRef.current) {
        try {
          currentScreenShareTrackRef.current.stop();
        } catch {}
      }
      if (localScreenShareStreamRef.current) {
        try {
          localScreenShareStreamRef.current.getTracks().forEach(t => t.stop());
        } catch {}
      }
    }

    teardownPeers(
      "teardown",
      sendingPcRef,
      receivingPcRef,
      remoteStreamRef,
      remoteVideoRef,
      remoteAudioRef,
      videoSenderRef,
      localScreenShareStreamRef,
      currentScreenShareTrackRef,
      localScreenShareRef,
      {
        setShowChat,
        setPeerMicOn,
        setPeerCamOn,
        setScreenShareOn,
        setPeerScreenShareOn,
        setLobby,
        setStatus
      }
    );
    stopProvidedTracks(localVideoTrack, localAudioTrack, currentVideoTrackRef);
    detachLocalPreview(localVideoRef);

    try {
      s?.disconnect();
    } catch {}
    socketRef.current = null;

    try {
      router.replace(`/match`);
    } catch (e) {
      try {
        router.replace(`/`);
      } catch {}
    }

    try {
      onLeave?.();
    } catch {}
  };

  const handleRecheck = () => {
    setLobby(true);
    setStatus("Rechecking…");
  };

  const handleReport = (reason?: string) => {
    const s = socketRef.current;
    const reporter = mySocketId || s?.id || null;
    const reported = peerIdRef.current || null;
    try {
      if (s && reporter) {
        s.emit("report", { reporterId: reporter, reportedId: reported, roomId, reason });
        toast.success("Report submitted", { description: "Thank you. We received your report." });
      } else {
        toast.error("Report failed", { description: "Could not submit report (no socket)." });
      }
    } catch (e) {
      console.error("report emit error", e);
      try { toast.error("Report failed", { description: "An error occurred." }); } catch {}
    }
  };

  function handleNextConnection(currentCamState: boolean, currentMicState: boolean, reason: "next" | "partner-left" = "next") {
    // Clear ICE candidate queues
    senderIceCandidatesQueue.current = [];
    receiverIceCandidatesQueue.current = [];
    
    teardownPeers(
      reason,
      sendingPcRef,
      receivingPcRef,
      remoteStreamRef,
      remoteVideoRef,
      remoteAudioRef,
      videoSenderRef,
      localScreenShareStreamRef,
      currentScreenShareTrackRef,
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
      if (currentVideoTrackRef.current) {
        try {
          currentVideoTrackRef.current.stop();
          currentVideoTrackRef.current = null;
        } catch (err) {
          // console.error("❌ Error stopping video track:", err);
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
            // console.error("❌ Error stopping local preview track:", err);
          }
        }
      }
    }
  }

  // ===== EFFECTS =====
  useEffect(() => {
    if (localVideoTrack) {
      currentVideoTrackRef.current = localVideoTrack;
    }
  }, [localVideoTrack]);



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

  // Main socket connection effect - simplified, actual WebRTC logic would be here
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
      setMySocketId(s.id ?? null);
      if (!joinedRef.current) {
        joinedRef.current = true;
      }
    });

    // ----- CALLER -----
    s.on("send-offer", async ({ roomId: rid }) => {
      setRoomId(rid);
      setLobby(false);
      setStatus("Connecting…");
      
      // Add a small delay to ensure any previous toasts are displayed
      setTimeout(() => {
        toast.success("Connected!", {
          id: "connected-toast-" + rid, // Unique ID per room
          description: "You've been connected to someone"
        });
        // Emit chat join after a small delay to ensure listeners are attached
        setTimeout(() => {
          s.emit("chat:join", { roomId: rid, name });
        }, 100);
      }, 100);

      const pc = new RTCPeerConnection();
      sendingPcRef.current = pc;
      peerIdRef.current = rid;
      
      await setupPeerConnection(pc, true, rid, s);

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      s.emit("offer", { sdp: offer, roomId: rid });
    });

    // ----- ANSWERER -----
    s.on("offer", async ({ roomId: rid, sdp: remoteSdp }) => {
      setRoomId(rid);
      setLobby(false);
      setStatus("Connecting…");
      
      // Add a small delay to ensure any previous toasts are displayed
      setTimeout(() => {
        toast.success("Connected!", {
          id: "connected-toast-" + rid, // Unique ID per room
          description: "You've been connected to someone"
        });
        // Emit chat join after a small delay to ensure listeners are attached
        setTimeout(() => {
          s.emit("chat:join", { roomId: rid, name });
        }, 100);
      }, 100);

      const pc = new RTCPeerConnection();
      receivingPcRef.current = pc;
      peerIdRef.current = rid;
      
      await setupPeerConnection(pc, false, rid, s);
      await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
      await processQueuedIceCandidates(pc, receiverIceCandidatesQueue.current);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit("answer", { roomId: rid, sdp: answer });
    });

    // caller receives answer
    s.on("answer", async ({ sdp: remoteSdp }) => {
      const pc = sendingPcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
      
      // Process any queued ICE candidates now that remote description is set
      await processQueuedIceCandidates(pc, senderIceCandidatesQueue.current);
    });

    // trickle ICE
    s.on("add-ice-candidate", async ({ candidate, type }) => {
      try {
        const ice = new RTCIceCandidate(candidate);
        
        if (type === "sender") {
          const pc = receivingPcRef.current;
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(ice);
          } else {
            // Queue the candidate until remote description is set
            receiverIceCandidatesQueue.current.push(ice);
          }
        } else {
          const pc = sendingPcRef.current;
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(ice);
          } else {
            // Queue the candidate until remote description is set
            senderIceCandidatesQueue.current.push(ice);
          }
        }
      } catch (e) {
        // console.error("addIceCandidate error", e);
      }
    });

    // Renegotiation handlers
    s.on("renegotiate-offer", async ({ sdp, role }) => {
      const pc = receivingPcRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit("renegotiate-answer", { roomId, sdp: answer, role: "answerer" });
      }
    });

    s.on("renegotiate-answer", async ({ sdp, role }) => {
      const pc = sendingPcRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    // Simplified event handlers - full WebRTC logic would go here
    s.on("lobby", () => {
      setLobby(true);
      setStatus("Waiting to connect you to someone…");
    });

    s.on("queue:waiting", () => {
      setLobby(true);
      setStatus("Searching for the best match…");
    });

    s.on("queue:timeout", ({ message }: { message: string }) => {
      setTimeoutMessage(message);
      setShowTimeoutAlert(true);
      setLobby(true);
      setStatus("No match found. Try again?");
    });

    s.on("partner:left", () => {
      toast.warning("Partner Left", {
        id: "partner-left-toast-" + Date.now(), // Unique ID to prevent duplicates
        description: "Your partner has left the call"
      });
      const actualCamState = !!(currentVideoTrackRef.current && currentVideoTrackRef.current.readyState === "live" && camOn);
      const actualMicState = !!(localAudioTrack && localAudioTrack.readyState === "live" && micOn);
      handleNextConnection(actualCamState, actualMicState, "partner-left");
    });

    s.on("peer:media-state", ({ state }: { state: { micOn?: boolean; camOn?: boolean } }) => {
      if (typeof state?.micOn === "boolean") setPeerMicOn(state.micOn);
      if (typeof state?.camOn === "boolean") setPeerCamOn(state.camOn);
    });

    s.on("peer-media-state-change", ({ isScreenSharing, micOn: peerMic, camOn: peerCam, from, userId }) => {
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
      stopProvidedTracks(localVideoTrack, localAudioTrack, currentVideoTrackRef);
      detachLocalPreview(localVideoRef);
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      s.disconnect();
      socketRef.current = null;
      detachLocalPreview(localVideoRef);
    };
  }, [name, localAudioTrack, localVideoTrack]);

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
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => setShowChat((v) => !v)}
        onRecheck={handleRecheck}
        onNext={handleNext}
        onLeave={handleLeave}
        onReport={() => handleReport()}
      />

      <TimeoutAlert
        show={showTimeoutAlert}
        message={timeoutMessage}
        onRetry={handleRetryMatchmaking}
        onCancel={handleCancelTimeout}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}