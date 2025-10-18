"use client";

import { toast } from "sonner";

// WebRTC Utility Functions
export function ensureRemoteStream(
  remoteStreamRef: React.RefObject<MediaStream | null>,
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>,
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>,
  remoteScreenShareRef: React.RefObject<HTMLVideoElement | null>,
  peerScreenShareOn: boolean
) {
  // console.log("🔄 ensureRemoteStream called");
  
  if (!remoteStreamRef.current) {
    // console.log("📺 Creating new remote MediaStream");
    remoteStreamRef.current = new MediaStream();
  }

  const v = remoteVideoRef.current;
  if (v) {
    // console.log("🎥 Remote video element found");
    if (v.srcObject !== remoteStreamRef.current) {
      // console.log("🔗 Setting remote video srcObject");
      v.srcObject = remoteStreamRef.current;
      v.playsInline = true;
      v.play().catch((err) => {
        // console.error("❌ Error playing remote video:", err);
      });
    }
  }

  const screenShareVideo = remoteScreenShareRef.current;
  if (screenShareVideo && peerScreenShareOn) {
    if (screenShareVideo.srcObject !== remoteStreamRef.current) {
      // console.log("🖥️ Setting remote screen share video srcObject");
      screenShareVideo.srcObject = remoteStreamRef.current;
      screenShareVideo.playsInline = true;
      screenShareVideo.play().catch((err) => {
        // console.error("❌ Error playing remote screen share video:", err);
      });
    }
  }

  const a = remoteAudioRef.current;
  if (a) {
    if (a.srcObject !== remoteStreamRef.current) {
      // console.log("🔊 Setting remote audio srcObject");
      a.srcObject = remoteStreamRef.current;
      a.autoplay = true;
      a.muted = false;
      a.play().catch((err) => {
        // console.error("❌ Error playing remote audio:", err);
      });
    }
  }
}

export function detachLocalPreview(localVideoRef: React.RefObject<HTMLVideoElement | null>) {
  try {
    const localStream = localVideoRef.current?.srcObject as MediaStream | null;
    if (localStream) {
      localStream.getTracks().forEach((t) => {
        try {
          // console.log(`Stopping track of kind ${t.kind}`);
          t.stop();
        } catch (err) {
          // console.error(`Error stopping ${t.kind} track:`, err);
        }
      });
    }
  } catch (err) {
    // console.error("Error in detachLocalPreview:", err);
  }
  
  if (localVideoRef.current) {
    try {
      localVideoRef.current.pause();
    } catch {}
    localVideoRef.current.srcObject = null;
  }
}

export function stopProvidedTracks(
  localVideoTrack: MediaStreamTrack | null,
  localAudioTrack: MediaStreamTrack | null,
  currentVideoTrackRef: React.RefObject<MediaStreamTrack | null>
) {
  try {
    if (localVideoTrack) {
      localVideoTrack.stop();
      // console.log("Local video track stopped");
    }
  } catch (err) {
    // console.error("Error stopping local video track:", err);
  }
  
  try {
    if (localAudioTrack) {
      localAudioTrack.stop();
    }
  } catch (err) {
    // console.error("Error stopping local audio track:", err);
  }
  
  try {
    const currentTrack = currentVideoTrackRef.current;
    if (currentTrack) {
      currentTrack.stop();
      currentVideoTrackRef.current = null;
      // console.log("Current video track stopped");
    }
  } catch (err) {
    // console.error("Error stopping current video track:", err);
  }
}

export function teardownPeers(
  reason: string,
  sendingPcRef: React.RefObject<RTCPeerConnection | null>,
  receivingPcRef: React.RefObject<RTCPeerConnection | null>,
  remoteStreamRef: React.RefObject<MediaStream | null>,
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>,
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>,
  videoSenderRef: React.RefObject<RTCRtpSender | null>,
  localScreenShareStreamRef: React.RefObject<MediaStream | null>,
  currentScreenShareTrackRef: React.RefObject<MediaStreamTrack | null>,
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
) {
  // console.log("Tearing down peers, reason:", reason);
  
  // Clean up peer connections
  try {
    if (sendingPcRef.current) {
      try {
        sendingPcRef.current.getSenders().forEach((sn) => {
          try {
            sendingPcRef.current?.removeTrack(sn);
          } catch (err) {
            // console.error("Error removing sender track:", err);
          }
        });
      } catch {}
      sendingPcRef.current.close();
    }
    if (receivingPcRef.current) {
      try {
        receivingPcRef.current.getSenders().forEach((sn) => {
          try {
            receivingPcRef.current?.removeTrack(sn);
          } catch (err) {
            // console.error("Error removing receiver track:", err);
          }
        });
      } catch {}
      receivingPcRef.current.close();
    }
  } catch (err) {
    // console.error("Error in peer connection cleanup:", err);
  }
  
  sendingPcRef.current = null;
  receivingPcRef.current = null;

  // Clean up remote stream
  if (remoteStreamRef.current) {
    try {
      const tracks = remoteStreamRef.current.getTracks();
      // console.log(`Stopping ${tracks.length} remote tracks`);
      tracks.forEach((t) => {
        try {
          t.stop();
        } catch (err) {
          // console.error(`Error stopping remote ${t.kind} track:`, err);
        }
      });
    } catch (err) {
      // console.error("Error stopping remote tracks:", err);
    }
  }
  
  remoteStreamRef.current = new MediaStream();
  
  // Clear video elements
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = null;
    try {
      remoteVideoRef.current.load();
    } catch {}
  }
  if (remoteAudioRef.current) {
    remoteAudioRef.current.srcObject = null;
    try {
      remoteAudioRef.current.load();
    } catch {}
  }

  // Reset UI states
  setters.setShowChat(false);
  setters.setPeerMicOn(true);
  setters.setPeerCamOn(true);
  setters.setScreenShareOn(false);
  setters.setPeerScreenShareOn(false);

  videoSenderRef.current = null;

  // Clean up screenshare streams
  if (localScreenShareStreamRef.current) {
    localScreenShareStreamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    localScreenShareStreamRef.current = null;
  }
  if (currentScreenShareTrackRef.current) {
    currentScreenShareTrackRef.current.stop();
    currentScreenShareTrackRef.current = null;
  }

  if (localScreenShareRef.current) localScreenShareRef.current.srcObject = null;

  setters.setLobby(true);
  if (reason === "partner-left") {
    setters.setStatus("Partner left. Finding a new match…");
  } else if (reason === "next") {
    setters.setStatus("Searching for your next match…");
  } else {
    setters.setStatus("Waiting to connect you to someone…");
  }
}

export async function toggleCameraTrack(
  camOn: boolean,
  setCamOn: (value: boolean) => void,
  currentVideoTrackRef: React.RefObject<MediaStreamTrack | null>,
  localVideoRef: React.RefObject<HTMLVideoElement | null>,
  videoSenderRef: React.RefObject<RTCRtpSender | null>,
  sendingPcRef: React.RefObject<RTCPeerConnection | null>,
  receivingPcRef: React.RefObject<RTCPeerConnection | null>,
  roomId: string | null,
  socketRef: React.RefObject<any>,
  localVideoTrack: MediaStreamTrack | null
) {
  const turningOn = !camOn;
  setCamOn(turningOn);

  try {
    const pc = sendingPcRef.current || receivingPcRef.current;

    if (turningOn) {
      let track = currentVideoTrackRef.current;
      if (!track || track.readyState === "ended") {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        track = stream.getVideoTracks()[0];
        currentVideoTrackRef.current = track;
      }

      if (localVideoRef.current) {
        const ms = (localVideoRef.current.srcObject as MediaStream) || new MediaStream();
        if (!localVideoRef.current.srcObject) localVideoRef.current.srcObject = ms;
        ms.getVideoTracks().forEach((t) => ms.removeTrack(t));
        ms.addTrack(track);
        await localVideoRef.current.play().catch(() => {});
      }

      if (videoSenderRef.current) {
        await videoSenderRef.current.replaceTrack(track);
      } else if (pc) {
        const sender = pc.addTrack(track);
        videoSenderRef.current = sender;
        // console.log("Added new video track to existing connection");
        
        if (sendingPcRef.current === pc) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("renegotiate-offer", { 
            roomId, 
            sdp: offer, 
            role: "caller" 
          });
          // console.log("📤 Sent renegotiation offer for camera turn on");
        }
      }
    } else {
      if (videoSenderRef.current) {
        await videoSenderRef.current.replaceTrack(null);
      }

      const track = currentVideoTrackRef.current;
      if (track) {
        try {
          track.stop();
          // console.log("Camera track stopped");
        } catch (err) {
          // console.error("Error stopping camera track:", err);
        }
        currentVideoTrackRef.current = null;
      }

      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const ms = localVideoRef.current.srcObject as MediaStream;
        const videoTracks = ms.getVideoTracks();
        for (const t of videoTracks) {
          try {
            t.stop();
            ms.removeTrack(t);
          } catch (err) {
            // console.error("Error stopping local preview track:", err);
          }
        }
      }
      
      if (localVideoTrack) {
        try {
          localVideoTrack.stop();
        } catch {}
      }
    }
  } catch (e: any) {
    // console.error("toggleCam error", e);
    toast.error("Camera Error", {
      description: e?.message || "Failed to toggle camera"
    });
  }
}