"use client";

import { useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { ensureRemoteStream, teardownPeers } from "../webrtc-utils";

interface UseWebRTCConnectionProps {
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
  micOn: boolean;
  camOn: boolean;
  peerScreenShareOn: boolean;
  roomId: string | null;
}

export function useWebRTCConnection({
  localAudioTrack,
  localVideoTrack,
  micOn,
  camOn,
  peerScreenShareOn,
  roomId
}: UseWebRTCConnectionProps) {
  // WebRTC refs
  const sendingPcRef = useRef<RTCPeerConnection | null>(null);
  const receivingPcRef = useRef<RTCPeerConnection | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const currentVideoTrackRef = useRef<MediaStreamTrack | null>(localVideoTrack);
  const currentScreenShareTrackRef = useRef<MediaStreamTrack | null>(null);
  const localScreenShareStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  
  // ICE candidate queues
  const senderIceCandidatesQueue = useRef<RTCIceCandidate[]>([]);
  const receiverIceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  // Helper function for remote stream management
  const ensureRemoteStreamLocal = useCallback(() => {
    if (!remoteStreamRef.current) {
      remoteStreamRef.current = new MediaStream();
    }
  }, []);

  // Helper function to process queued ICE candidates
  const processQueuedIceCandidates = useCallback(async (pc: RTCPeerConnection, queue: RTCIceCandidate[]) => {
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(candidate);
          console.log("Processed queued ICE candidate");
        } catch (e) {
          console.error("Error processing queued ICE candidate:", e);
        }
      }
    }
  }, []);

  // Helper for common PC setup
  const setupPeerConnection = useCallback(async (
    pc: RTCPeerConnection, 
    isOffer: boolean, 
    rid: string, 
    socket: Socket,
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>,
    remoteAudioRef: React.RefObject<HTMLAudioElement | null>,
    remoteScreenShareRef: React.RefObject<HTMLVideoElement | null>
  ) => {
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
          console.error("Error creating video track:", err);
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
      console.log("🎯 Received track event!");
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      if (e.track.kind === 'video') {
        remoteStreamRef.current.getVideoTracks().forEach(track => 
          remoteStreamRef.current?.removeTrack(track)
        );
      }
      remoteStreamRef.current.addTrack(e.track);
      ensureRemoteStream(
        remoteStreamRef,
        remoteVideoRef,
        remoteAudioRef,
        remoteScreenShareRef,
        peerScreenShareOn
      );
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
  }, [localAudioTrack, localVideoTrack, micOn, camOn, peerScreenShareOn, ensureRemoteStreamLocal]);

  // Cleanup function
  const cleanup = useCallback((
    reason: string,
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>,
    remoteAudioRef: React.RefObject<HTMLAudioElement | null>,
    localScreenShareRef: React.RefObject<HTMLVideoElement | null>,
    setters: {
      setShowChat: (value: boolean) => void;
      setPeerMicOn: (value: boolean) => void;
      setPeerCamOn: (value: boolean) => void;
      setScreenShareOn: (value: boolean) => void;
      setPeerScreenShareOn: (value: boolean) => void;
      setLobby: (value: boolean) => void;
      setStatus: (value: string) => void;
    }
  ) => {
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
      setters
    );
  }, []);

  // Clear ICE candidate queues
  const clearIceQueues = useCallback(() => {
    senderIceCandidatesQueue.current = [];
    receiverIceCandidatesQueue.current = [];
  }, []);

  return {
    // Refs
    sendingPcRef,
    receivingPcRef,
    videoSenderRef,
    currentVideoTrackRef,
    currentScreenShareTrackRef,
    localScreenShareStreamRef,
    remoteStreamRef,
    senderIceCandidatesQueue,
    receiverIceCandidatesQueue,
    
    // Functions
    setupPeerConnection,
    processQueuedIceCandidates,
    cleanup,
    clearIceQueues,
    ensureRemoteStreamLocal
  };
}
