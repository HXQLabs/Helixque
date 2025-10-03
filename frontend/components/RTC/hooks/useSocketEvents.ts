"use client";

import { useCallback } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";

interface UseSocketEventsProps {
  socket: Socket | null;
  roomId: string | null;
  name: string;
  mySocketId: string | null;
  peerIdRef: React.RefObject<string | null>;
  sendingPcRef: React.RefObject<RTCPeerConnection | null>;
  receivingPcRef: React.RefObject<RTCPeerConnection | null>;
  senderIceCandidatesQueue: React.RefObject<RTCIceCandidate[]>;
  receiverIceCandidatesQueue: React.RefObject<RTCIceCandidate[]>;
  setupPeerConnection: (
    pc: RTCPeerConnection,
    isOffer: boolean,
    rid: string,
    socket: Socket,
    remoteVideoRef: React.RefObject<HTMLVideoElement>,
    remoteAudioRef: React.RefObject<HTMLAudioElement>,
    remoteScreenShareRef: React.RefObject<HTMLVideoElement>
  ) => Promise<void>;
  processQueuedIceCandidates: (pc: RTCPeerConnection, queue: RTCIceCandidate[]) => Promise<void>;
  onRoomConnected: (roomId: string) => void;
  onPartnerLeft: () => void;
  onPeerMediaStateChange: (state: { micOn?: boolean; camOn?: boolean }) => void;
  onPeerMediaStateChangeExtended: (data: { 
    isScreenSharing?: boolean; 
    micOn?: boolean; 
    camOn?: boolean; 
    from?: string; 
    userId?: string; 
  }) => void;
}

export function useSocketEvents({
  socket,
  roomId,
  name,
  mySocketId,
  peerIdRef,
  sendingPcRef,
  receivingPcRef,
  senderIceCandidatesQueue,
  receiverIceCandidatesQueue,
  setupPeerConnection,
  processQueuedIceCandidates,
  onRoomConnected,
  onPartnerLeft,
  onPeerMediaStateChange,
  onPeerMediaStateChangeExtended
}: UseSocketEventsProps) {
  
  const handleSendOffer = useCallback(async ({ roomId: rid }: { roomId: string }) => {
    onRoomConnected(rid);
    
    const pc = new RTCPeerConnection();
    sendingPcRef.current = pc;
    peerIdRef.current = rid;
    
    // Note: setupPeerConnection will be called with proper refs from the component
    // This is a simplified version for the event handler
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);
    socket?.emit("offer", { sdp: offer, roomId: rid });
  }, [socket, sendingPcRef, peerIdRef, onRoomConnected]);

  const handleOffer = useCallback(async ({ roomId: rid, sdp: remoteSdp }: { roomId: string; sdp: RTCSessionDescriptionInit }) => {
    onRoomConnected(rid);
    
    const pc = new RTCPeerConnection();
    receivingPcRef.current = pc;
    peerIdRef.current = rid;
    
    await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
    await processQueuedIceCandidates(pc, receiverIceCandidatesQueue.current);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket?.emit("answer", { roomId: rid, sdp: answer });
  }, [socket, receivingPcRef, peerIdRef, processQueuedIceCandidates, receiverIceCandidatesQueue, onRoomConnected]);

  const handleAnswer = useCallback(async ({ sdp: remoteSdp }: { sdp: RTCSessionDescriptionInit }) => {
    const pc = sendingPcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
    
    // Process any queued ICE candidates now that remote description is set
    await processQueuedIceCandidates(pc, senderIceCandidatesQueue.current);
  }, [sendingPcRef, processQueuedIceCandidates, senderIceCandidatesQueue]);

  const handleIceCandidate = useCallback(async ({ candidate, type }: { candidate: RTCIceCandidateInit; type: string }) => {
    try {
      const ice = new RTCIceCandidate(candidate);
      
      if (type === "sender") {
        const pc = receivingPcRef.current;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(ice);
        } else {
          // Queue the candidate until remote description is set
          receiverIceCandidatesQueue.current.push(ice);
          console.log("Queued ICE candidate for receiver (no remote description yet)");
        }
      } else {
        const pc = sendingPcRef.current;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(ice);
        } else {
          // Queue the candidate until remote description is set
          senderIceCandidatesQueue.current.push(ice);
          console.log("Queued ICE candidate for sender (no remote description yet)");
        }
      }
    } catch (e) {
      console.error("addIceCandidate error", e);
    }
  }, [sendingPcRef, receivingPcRef, senderIceCandidatesQueue, receiverIceCandidatesQueue]);

  const handleRenegotiateOffer = useCallback(async ({ sdp, role }: { sdp: RTCSessionDescriptionInit; role: string }) => {
    console.log("Received renegotiation offer from", role);
    const pc = receivingPcRef.current;
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit("renegotiate-answer", { roomId, sdp: answer, role: "answerer" });
    }
  }, [socket, roomId, receivingPcRef]);

  const handleRenegotiateAnswer = useCallback(async ({ sdp, role }: { sdp: RTCSessionDescriptionInit; role: string }) => {
    console.log("Received renegotiation answer from", role);
    const pc = sendingPcRef.current;
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }, [sendingPcRef]);

  const handlePartnerLeft = useCallback(() => {
    console.log("👋 PARTNER LEFT");
    toast.warning("Partner Left", {
      description: "Your partner has left the call"
    });
    onPartnerLeft();
  }, [onPartnerLeft]);

  const handlePeerMediaState = useCallback(({ state }: { state: { micOn?: boolean; camOn?: boolean } }) => {
    onPeerMediaStateChange(state);
  }, [onPeerMediaStateChange]);

  const handlePeerMediaStateChange = useCallback(({ 
    isScreenSharing, 
    micOn: peerMic, 
    camOn: peerCam, 
    from, 
    userId 
  }: { 
    isScreenSharing?: boolean; 
    micOn?: boolean; 
    camOn?: boolean; 
    from?: string; 
    userId?: string; 
  }) => {
    console.log("🔄 Peer media state changed:", { isScreenSharing, peerMic, peerCam, from, userId });
    onPeerMediaStateChangeExtended({ isScreenSharing, micOn: peerMic, camOn: peerCam, from, userId });
  }, [onPeerMediaStateChangeExtended]);

  const setupSocketEventListeners = useCallback(() => {
    if (!socket) return;

    // WebRTC events
    socket.on("send-offer", handleSendOffer);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("add-ice-candidate", handleIceCandidate);
    socket.on("renegotiate-offer", handleRenegotiateOffer);
    socket.on("renegotiate-answer", handleRenegotiateAnswer);
    
    // Room events
    socket.on("partner:left", handlePartnerLeft);
    socket.on("peer:media-state", handlePeerMediaState);
    socket.on("peer-media-state-change", handlePeerMediaStateChange);

    return () => {
      socket.off("send-offer", handleSendOffer);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("add-ice-candidate", handleIceCandidate);
      socket.off("renegotiate-offer", handleRenegotiateOffer);
      socket.off("renegotiate-answer", handleRenegotiateAnswer);
      socket.off("partner:left", handlePartnerLeft);
      socket.off("peer:media-state", handlePeerMediaState);
      socket.off("peer-media-state-change", handlePeerMediaStateChange);
    };
  }, [
    socket,
    handleSendOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handleRenegotiateOffer,
    handleRenegotiateAnswer,
    handlePartnerLeft,
    handlePeerMediaState,
    handlePeerMediaStateChange
  ]);

  return {
    setupSocketEventListeners
  };
}
