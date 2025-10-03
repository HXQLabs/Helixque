import { useRef, useCallback } from "react";

export function useWebRTC() {
  const sendingPcRef = useRef<RTCPeerConnection | null>(null);
  const receivingPcRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const joinedRef = useRef(false);

  const ensureRemoteStream = useCallback((
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>,
    remoteAudioRef: React.RefObject<HTMLAudioElement | null>,
    remoteScreenShareRef: React.RefObject<HTMLVideoElement | null>,
    peerScreenShareOn: boolean
  ) => {
    console.log("🔄 ensureRemoteStream called");
    // Always ensure we have a valid MediaStream
    if (!remoteStreamRef.current) {
      console.log("📺 Creating new remote MediaStream");
      remoteStreamRef.current = new MediaStream();
    }

    const v = remoteVideoRef.current;
    if (v) {
      console.log("🎥 Remote video element found");
      if (v.srcObject !== remoteStreamRef.current) {
        console.log("🔗 Setting remote video srcObject");
        console.log("📊 Remote stream tracks:", remoteStreamRef.current.getTracks().length);
        remoteStreamRef.current.getTracks().forEach((track, index) => {
          console.log(`📹 Track ${index}:`, {
            id: track.id,
            kind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState,
            settings: track.getSettings()
          });
        });
        
        v.srcObject = remoteStreamRef.current;
        v.playsInline = true;
        v.play().catch((err) => {
          console.error("❌ Error playing remote video:", err);
        });
        
        // Add event listeners to track video state changes
        v.onloadedmetadata = () => {
          console.log("📺 Remote video metadata loaded:", {
            videoWidth: v.videoWidth,
            videoHeight: v.videoHeight,
            duration: v.duration
          });
        };
        
        v.onplay = () => {
          console.log("▶️ Remote video started playing");
        };
        
        v.onpause = () => {
          console.log("⏸️ Remote video paused");
        };
        
        v.onerror = (e) => {
          console.error("💥 Remote video error:", e);
        };
      } else {
        console.log("🔄 Remote video srcObject already set, checking state");
        console.log("📊 Video element state:", {
          paused: v.paused,
          currentTime: v.currentTime,
          videoWidth: v.videoWidth,
          videoHeight: v.videoHeight,
          readyState: v.readyState
        });
      }
    } else {
      console.warn("❌ Remote video element not found");
    }

    // Also update the remote screen share video if it exists
    const screenShareVideo = remoteScreenShareRef.current;
    if (screenShareVideo && peerScreenShareOn) {
      if (screenShareVideo.srcObject !== remoteStreamRef.current) {
        console.log("🖥️ Setting remote screen share video srcObject");
        screenShareVideo.srcObject = remoteStreamRef.current;
        screenShareVideo.playsInline = true;
        screenShareVideo.play().catch((err) => {
          console.error("❌ Error playing remote screen share video:", err);
        });
      }
    }

    const a = remoteAudioRef.current;
    if (a) {
      if (a.srcObject !== remoteStreamRef.current) {
        console.log("🔊 Setting remote audio srcObject");
        a.srcObject = remoteStreamRef.current;
        a.autoplay = true;
        a.muted = false;
        a.play().catch((err) => {
          console.error("❌ Error playing remote audio:", err);
        });
      }
    } else {
      console.warn("❌ Remote audio element not found");
    }
  }, []);

  const teardownPeers = useCallback((reason = "teardown") => {
    console.log("Tearing down peers, reason:", reason);
    
    // Clean up all senders in both peer connections
    try {
      if (sendingPcRef.current) {
        try {
          sendingPcRef.current.getSenders().forEach((sn) => {
            try {
              sendingPcRef.current?.removeTrack(sn);
            } catch (err) {
              console.error("Error removing sender track:", err);
            }
          });
        } catch {}
        sendingPcRef.current.close();
      }
      if (receivingPcRef.current) {
        try {
          receivingPcRef.current.getSenders().forEach((sn) => {
            try {
              receivingPcRef.current?.removeTrack(sn)
            } catch (err) {
              console.error("Error removing receiver track:", err);
            }
          });
        } catch {}
        receivingPcRef.current.close();
      }
    } catch (err) {
      console.error("Error in peer connection cleanup:", err);
    }
    
    // Clear peer connection refs
    sendingPcRef.current = null;
    receivingPcRef.current = null;

    // Clean up remote stream
    if (remoteStreamRef.current) {
      try {
        const tracks = remoteStreamRef.current.getTracks();
        console.log(`Stopping ${tracks.length} remote tracks`);
        tracks.forEach((t) => {
          try {
            t.stop();
          } catch (err) {
            console.error(`Error stopping remote ${t.kind} track:`, err);
          }
        });
      } catch (err) {
        console.error("Error stopping remote tracks:", err);
      }
    }
    
    // Reset remote stream
    remoteStreamRef.current = new MediaStream();
    
    joinedRef.current = false;
  }, []);

  const detachLocalPreview = useCallback((localVideoRef: React.RefObject<HTMLVideoElement | null>) => {
    try {
      const localStream = localVideoRef.current?.srcObject as MediaStream | null;
      if (localStream) {
        localStream.getTracks().forEach((t) => {
          try {
            console.log(`Stopping track of kind ${t.kind}`);
            t.stop();
          } catch (err) {
            console.error(`Error stopping ${t.kind} track:`, err);
          }
        });
      }
    } catch (err) {
      console.error("Error in detachLocalPreview:", err);
    }
    
    if (localVideoRef.current) {
      try {
        localVideoRef.current.pause();
      } catch {}
      localVideoRef.current.srcObject = null;
    }
  }, []);

  return {
    sendingPcRef,
    receivingPcRef,
    remoteStreamRef,
    joinedRef,
    ensureRemoteStream,
    teardownPeers,
    detachLocalPreview,
  };
}