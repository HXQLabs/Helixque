"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { toggleCameraTrack } from "../webrtc-utils";

interface UseMediaControlsProps {
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
  micOn: boolean;
  camOn: boolean;
  screenShareOn: boolean;
  setMicOn: (value: boolean) => void;
  setCamOn: (value: boolean) => void;
  setScreenShareOn: (value: boolean) => void;
  currentVideoTrackRef: React.RefObject<MediaStreamTrack | null>;
  currentScreenShareTrackRef: React.RefObject<MediaStreamTrack | null>;
  localScreenShareStreamRef: React.RefObject<MediaStream | null>;
  videoSenderRef: React.RefObject<RTCRtpSender | null>;
  sendingPcRef: React.RefObject<RTCPeerConnection | null>;
  receivingPcRef: React.RefObject<RTCPeerConnection | null>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  localScreenShareRef: React.RefObject<HTMLVideoElement | null>;
  roomId: string | null;
  socket: any;
}

export function useMediaControls({
  localAudioTrack,
  localVideoTrack,
  micOn,
  camOn,
  screenShareOn,
  setMicOn,
  setCamOn,
  setScreenShareOn,
  currentVideoTrackRef,
  currentScreenShareTrackRef,
  localScreenShareStreamRef,
  videoSenderRef,
  sendingPcRef,
  receivingPcRef,
  localVideoRef,
  localScreenShareRef,
  roomId,
  socket
}: UseMediaControlsProps) {

  const toggleMic = useCallback(() => {
    const on = !micOn;
    setMicOn(on);
    try {
      if (localAudioTrack) localAudioTrack.enabled = on;
    } catch {}
  }, [micOn, setMicOn, localAudioTrack]);

  const toggleCam = useCallback(async () => {
    await toggleCameraTrack(
      camOn,
      setCamOn,
      currentVideoTrackRef,
      localVideoRef,
      videoSenderRef,
      sendingPcRef,
      receivingPcRef,
      roomId,
      socket,
      localVideoTrack
    );
  }, [
    camOn,
    setCamOn,
    currentVideoTrackRef,
    localVideoRef,
    videoSenderRef,
    sendingPcRef,
    receivingPcRef,
    roomId,
    socket,
    localVideoTrack
  ]);

  const toggleScreenShare = useCallback(async () => {
    const turningOn = !screenShareOn;
    console.log("🖥️ Toggle screen share - turning:", turningOn ? "ON" : "OFF");
    setScreenShareOn(turningOn);

    try {
      if (turningOn) {
        try {
          console.log("🎬 Starting screen capture...");
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
                  console.error("Error getting camera after screen share:", err);
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
          console.error("Error starting screen share:", error);
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
              console.error("Error getting camera after stopping screen share:", err);
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
      console.error("toggleScreenShare error", error);
      toast.error("Screen Share Error", {
        description: error?.message || "Failed to toggle screen sharing"
      });
      setScreenShareOn(false);
    }
  }, [
    screenShareOn,
    setScreenShareOn,
    currentScreenShareTrackRef,
    localScreenShareStreamRef,
    localScreenShareRef,
    videoSenderRef,
    micOn,
    camOn,
    socket,
    roomId,
    currentVideoTrackRef,
    localVideoRef
  ]);

  return {
    toggleMic,
    toggleCam,
    toggleScreenShare
  };
}
