"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { teardownPeers, stopProvidedTracks, detachLocalPreview } from "../webrtc-utils";

interface UseRoomActionsProps {
  socket: any;
  roomId: string | null;
  mySocketId: string | null;
  peerIdRef: React.RefObject<string | null>;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
  currentVideoTrackRef: React.RefObject<MediaStreamTrack | null>;
  currentScreenShareTrackRef: React.RefObject<MediaStreamTrack | null>;
  localScreenShareStreamRef: React.RefObject<MediaStream | null>;
  screenShareOn: boolean;
  camOn: boolean;
  micOn: boolean;
  sendingPcRef: React.RefObject<RTCPeerConnection | null>;
  receivingPcRef: React.RefObject<RTCPeerConnection | null>;
  remoteStreamRef: React.RefObject<MediaStream | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  videoSenderRef: React.RefObject<RTCRtpSender | null>;
  localScreenShareRef: React.RefObject<HTMLVideoElement | null>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  onLeave?: () => void;
  onNextConnection: (actualCamState: boolean, actualMicState: boolean, reason: "next" | "partner-left") => void;
  setters: {
    setShowChat: (value: boolean) => void;
    setPeerMicOn: (value: boolean) => void;
    setPeerCamOn: (value: boolean) => void;
    setScreenShareOn: (value: boolean) => void;
    setPeerScreenShareOn: (value: boolean) => void;
    setLobby: (value: boolean) => void;
    setStatus: (value: string) => void;
  };
}

export function useRoomActions({
  socket,
  roomId,
  mySocketId,
  peerIdRef,
  localAudioTrack,
  localVideoTrack,
  currentVideoTrackRef,
  currentScreenShareTrackRef,
  localScreenShareStreamRef,
  screenShareOn,
  camOn,
  micOn,
  sendingPcRef,
  receivingPcRef,
  remoteStreamRef,
  remoteVideoRef,
  remoteAudioRef,
  videoSenderRef,
  localScreenShareRef,
  localVideoRef,
  onLeave,
  onNextConnection,
  setters
}: UseRoomActionsProps) {
  const router = useRouter();

  const handleNext = useCallback(() => {
    const s = socket;
    if (!s) return;

    const actualCamState = !!(currentVideoTrackRef.current && currentVideoTrackRef.current.readyState === "live" && camOn);
    const actualMicState = !!(localAudioTrack && localAudioTrack.readyState === "live" && micOn);

    try {
      remoteStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    s.emit("queue:next");
    onNextConnection(actualCamState, actualMicState, "next");
  }, [
    socket,
    currentVideoTrackRef,
    camOn,
    localAudioTrack,
    micOn,
    remoteStreamRef,
    remoteVideoRef,
    remoteAudioRef,
    onNextConnection
  ]);

  const handleLeave = useCallback(() => {
    const s = socket;

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
      setters
    );
    stopProvidedTracks(localVideoTrack, localAudioTrack, currentVideoTrackRef);
    detachLocalPreview(localVideoRef);

    try {
      s?.disconnect();
    } catch {}
    socket = null;

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
  }, [
    socket,
    screenShareOn,
    currentScreenShareTrackRef,
    localScreenShareStreamRef,
    sendingPcRef,
    receivingPcRef,
    remoteStreamRef,
    remoteVideoRef,
    remoteAudioRef,
    videoSenderRef,
    localScreenShareStreamRef,
    currentScreenShareTrackRef,
    localScreenShareRef,
    setters,
    localVideoTrack,
    localAudioTrack,
    currentVideoTrackRef,
    localVideoRef,
    router,
    onLeave
  ]);

  const handleRecheck = useCallback(() => {
    setters.setLobby(true);
    setters.setStatus("Rechecking…");
  }, [setters]);

  const handleReport = useCallback((reason?: string) => {
    const s = socket;
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
  }, [socket, mySocketId, peerIdRef, roomId]);

  const handleRetryMatchmaking = useCallback(() => {
    if (socket) {
      socket.emit("queue:retry");
      setters.setLobby(true);
      setters.setStatus("Searching for the best match…");
    }
  }, [socket, setters]);

  const handleCancelTimeout = useCallback(() => {
    if (socket) {
      socket.emit("queue:leave");
    }
    // @ts-expect-error: setShowTimeoutAlert may exist on setters in some contexts
    setters.setShowTimeoutAlert?.(false);
    setters.setLobby(false);
    setters.setStatus("Search paused. Click Try Again to rejoin the queue.");
  }, [socket, setters]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelTimeout();
    }
  }, [handleCancelTimeout]);

  return {
    handleNext,
    handleLeave,
    handleRecheck,
    handleReport,
    handleRetryMatchmaking,
    handleCancelTimeout,
    handleKeyDown
  };
}
