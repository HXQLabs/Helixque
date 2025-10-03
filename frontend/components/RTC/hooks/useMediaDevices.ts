import { useRef, useCallback } from "react";
import { toast } from "sonner";

export function useMediaDevices() {
  const currentVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const currentScreenShareTrackRef = useRef<MediaStreamTrack | null>(null);
  const localScreenShareStreamRef = useRef<MediaStream | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);

  const stopProvidedTracks = useCallback((localVideoTrack: MediaStreamTrack | null, localAudioTrack: MediaStreamTrack | null) => {
    try {
      // Immediately stop video track to turn off camera LED
      if (localVideoTrack) {
        localVideoTrack.stop();
        console.log("Local video track stopped");
      }
    } catch (err) {
      console.error("Error stopping local video track:", err);
    }
    
    try {
      if (localAudioTrack) {
        localAudioTrack.stop();
      }
    } catch (err) {
      console.error("Error stopping local audio track:", err);
    }
    
    // Also stop any track in currentVideoTrackRef
    try {
      const currentTrack = currentVideoTrackRef.current;
      if (currentTrack) {
        currentTrack.stop();
        currentVideoTrackRef.current = null;
        console.log("Current video track stopped");
      }
    } catch (err) {
      console.error("Error stopping current video track:", err);
    }
  }, []);

  const toggleCamera = useCallback(async (
    camOn: boolean,
    localVideoRef: React.RefObject<HTMLVideoElement | null>,
    roomId: string | null,
    sendingPcRef: React.RefObject<RTCPeerConnection | null>,
    receivingPcRef: React.RefObject<RTCPeerConnection | null>,
    socketRef: React.RefObject<any>
  ) => {
    const turningOn = !camOn;

    try {
      const pc = sendingPcRef.current || receivingPcRef.current;

      if (turningOn) {
        // (Re)acquire a real camera track
        let track = currentVideoTrackRef.current;
        if (!track || track.readyState === "ended") {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          track = stream.getVideoTracks()[0];
          currentVideoTrackRef.current = track;
        }

        // Update local PiP stream
        if (localVideoRef.current) {
          const ms =
            (localVideoRef.current.srcObject as MediaStream) || new MediaStream();
          if (!localVideoRef.current.srcObject) localVideoRef.current.srcObject = ms;
          ms.getVideoTracks().forEach((t) => ms.removeTrack(t));
          ms.addTrack(track);
          await localVideoRef.current.play().catch(() => {});
        }

        // Resume sending to peer
        if (videoSenderRef.current) {
          await videoSenderRef.current.replaceTrack(track);
        } else if (pc) {
          // No video sender exists, add the track and create sender
          const sender = pc.addTrack(track);
          videoSenderRef.current = sender;
          console.log("Added new video track to existing connection");
          
          // If we're adding a track to an existing connection, we might need to renegotiate
          if (sendingPcRef.current === pc) {
            // We're the caller, create new offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current?.emit("renegotiate-offer", { 
              roomId, 
              sdp: offer, 
              role: "caller" 
            });
            console.log("📤 Sent renegotiation offer for camera turn on");
          }
        }
      } else {
        // Turn OFF: stop sending and immediately stop the camera
        if (videoSenderRef.current) {
          await videoSenderRef.current.replaceTrack(null);
        }

        // Immediately stop all video tracks to turn off camera LED
        const track = currentVideoTrackRef.current;
        if (track) {
          try {
            // Ensure we stop the track immediately to turn off the camera LED
            track.stop();
            console.log("Camera track stopped");
          } catch (err) {
            console.error("Error stopping camera track:", err);
          }
          currentVideoTrackRef.current = null;
        }

        // Also stop any video tracks in the local preview
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          const ms = localVideoRef.current.srcObject as MediaStream;
          const videoTracks = ms.getVideoTracks();
          for (const t of videoTracks) {
            try {
              t.stop(); // Make sure we stop each track
              ms.removeTrack(t);
            } catch (err) {
              console.error("Error stopping local preview track:", err);
            }
          }
          // leave audio track (if any) untouched
        }
      }
    } catch (e: any) {
      console.error("toggleCam error", e);
      toast.error("Camera Error", {
        description: e?.message || "Failed to toggle camera"
      });
    }
  }, []);

  const toggleScreenShare = useCallback(async (
    screenShareOn: boolean,
    micOn: boolean,
    camOn: boolean,
    roomId: string | null,
    localScreenShareRef: React.RefObject<HTMLVideoElement | null>,
    localVideoRef: React.RefObject<HTMLVideoElement | null>,
    sendingPcRef: React.RefObject<RTCPeerConnection | null>,
    receivingPcRef: React.RefObject<RTCPeerConnection | null>,
    socketRef: React.RefObject<any>
  ) => {
    const turningOn = !screenShareOn;
    console.log("🖥️ Toggle screen share - turning:", turningOn ? "ON" : "OFF");

    try {
      const socket = socketRef.current;

      if (turningOn) {
        // Start screen sharing - use getDisplayMedia
        console.log("🎬 Starting screen capture...");
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true // Include system audio if available
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        console.log("📺 Screen track obtained");
        
        currentScreenShareTrackRef.current = screenTrack;
        localScreenShareStreamRef.current = screenStream;

        // Set up local screenshare preview
        if (localScreenShareRef.current) {
          localScreenShareRef.current.srcObject = screenStream;
          await localScreenShareRef.current.play().catch(() => {});
          console.log("🔍 Local screen share preview set up");
        }

        // Replace the existing video track with screen share track
        if (videoSenderRef.current) {
          console.log("📡 Video sender found, replacing track");
          
          await videoSenderRef.current.replaceTrack(screenTrack);
          console.log("✅ Successfully replaced video track with screen share track");
          
          toast.success("Screen Share Started", {
            description: "You are now sharing your screen"
          });
        } else {
          console.warn("❌ No video sender found, trying to create one");
          const pc = sendingPcRef.current || receivingPcRef.current;
          if (pc) {
            console.log("🔗 Adding screen track to peer connection");
            const sender = pc.addTrack(screenTrack, screenStream);
            videoSenderRef.current = sender;
            console.log("✅ Created new video sender for screen share");
          }
        }

        // Notify peer that screenshare started
        if (socket && roomId) {
          const mediaState = {
            isScreenSharing: true,
            micOn,
            camOn: false // Camera is replaced by screen share
          };
          console.log("📡 Emitting media-state-change:", mediaState);
          socket.emit("media-state-change", mediaState);
        }

        // Handle screen share ending
        screenTrack.onended = async () => {
          // This will be handled by the calling component
          console.log("📺 Screen share ended by user");
        };

      } else {
        // Stop screen sharing
        if (currentScreenShareTrackRef.current) {
          currentScreenShareTrackRef.current.stop();
          currentScreenShareTrackRef.current = null;
        }
        
        if (localScreenShareStreamRef.current) {
          localScreenShareStreamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          localScreenShareStreamRef.current = null;
        }

        // Clear local screenshare preview
        if (localScreenShareRef.current) {
          localScreenShareRef.current.srcObject = null;
        }

        // Restore camera if it should be on
        if (camOn) {
          // Get a new camera track if needed
          try {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            currentVideoTrackRef.current = cameraTrack;
            
            // Update local preview
            if (localVideoRef.current) {
              const localStream = localVideoRef.current.srcObject as MediaStream || new MediaStream();
              localStream.getVideoTracks().forEach(t => localStream.removeTrack(t));
              localStream.addTrack(cameraTrack);
              if (!localVideoRef.current.srcObject) localVideoRef.current.srcObject = localStream;
            }

            // Replace track in peer connection
            if (videoSenderRef.current) {
              await videoSenderRef.current.replaceTrack(cameraTrack);
            }
          } catch (err: any) {
            console.error("Error restoring camera after screen share:", err);
            toast.error("Camera Error", {
              description: "Failed to restore camera after screen sharing"
            });
          }
        } else {
          // Just replace with null if camera should be off
          if (videoSenderRef.current) {
            await videoSenderRef.current.replaceTrack(null);
          }
        }

        // Notify peer that screenshare stopped
        if (socket && roomId) {
          const mediaState = {
            isScreenSharing: false,
            micOn,
            camOn
          };
          socket.emit("media-state-change", mediaState);
        }

        toast.success("Screen Share Stopped");
      }
    } catch (e: any) {
      console.error("toggleScreenShare error", e);
      toast.error("Screen Share Error", {
        description: e?.message || "Failed to toggle screen sharing"
      });
    }
  }, []);

  return {
    currentVideoTrackRef,
    currentScreenShareTrackRef,
    localScreenShareStreamRef,
    videoSenderRef,
    stopProvidedTracks,
    toggleCamera,
    toggleScreenShare,
  };
}