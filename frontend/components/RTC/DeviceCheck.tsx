"use client";
import { useEffect, useRef, useState } from "react";
import Room from "./Room";
import { toast } from "sonner";
import { 
  IconMicrophone,
  IconMicrophoneOff,
  IconVideo,
  IconVideoOff,
  IconRefresh,
  IconUser
} from "@tabler/icons-react";
import Tooltip from "../ui/tooltip";

export default function DeviceCheck() {
  const [name, setName] = useState("");
  const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [joined, setJoined] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);
const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
const getCamRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const getCam = async () => {
 try {
      localAudioTrackRef.current?.stop();
      localVideoTrackRef.current?.stop();
      let videoTrack: MediaStreamTrack | null = null;
      let audioTrack: MediaStreamTrack | null = null;
      // request camera stream only if videoOn is true
      if (videoOn) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoTrack = videoStream.getVideoTracks()[0] || null;
        } catch (err) {
          console.warn("Camera access denied or unavailable:", err);
          toast.error("Camera Error", { description: "Could not access camera" });
        }
      }
      //  Request microphone stream only if audioOn is true
      if (audioOn) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioTrack = audioStream.getAudioTracks()[0] || null;
        } catch (err) {
          console.warn("Microphone access denied or unavailable:", err);
          toast.error("Microphone Error", { description: "Could not access microphone" });
        }
      }
      //  Save tracks to refs & state
      localVideoTrackRef.current = videoTrack;
      localAudioTrackRef.current = audioTrack;
      setLocalVideoTrack(videoTrack);
      setLocalAudioTrack(audioTrack);
      //  Attach video stream if available
      if (videoRef.current) {
        videoRef.current.srcObject = videoTrack ? new MediaStream([videoTrack]) : null;
        if (videoTrack) await videoRef.current.play().catch(() => {});
      }
      // Clear stream if both are off
      if (!videoOn && !audioOn && videoRef.current) {
        videoRef.current.srcObject = null;
      }

    } catch (e: any) {
      const errorMessage = e?.message || "Could not access camera/microphone";
      toast.error("Device Access Error", {
        description: errorMessage
      });
    }
  };
 useEffect(() => {
   let permissionStatus: PermissionStatus | null = null;
   async function watchCameraPermission() {
     try {
       permissionStatus = await navigator.permissions.query({ name: "camera" as PermissionName });
      permissionStatus.onchange = () => {
       if (permissionStatus?.state === "granted") {
          getCamRef.current();
        }
      };
     } catch (e) {
       console.warn("Permissions API not supported on this browser.");
     }
   }
   watchCameraPermission();
   return () => {
     if (permissionStatus) permissionStatus.onchange = null;
     localAudioTrackRef.current?.stop();
     localVideoTrackRef.current?.stop();
   };
 }, []); 
 useEffect(() => {
   getCam();
 }, [videoOn, audioOn]);
useEffect(() => {
  getCamRef.current = getCam;
});
  if (joined) {
    const handleOnLeave = () => {
      setJoined(false);
      try {
        localAudioTrack?.stop();
      } catch {}
      try {
        localVideoTrack?.stop();
      } catch {}
      setLocalAudioTrack(null);
      setLocalVideoTrack(null);
    };

    return (
      <Room
        name={name}
        localAudioTrack={localAudioTrack}
        localVideoTrack={localVideoTrack}
        audioOn={audioOn}
        videoOn={videoOn}
        onLeave={handleOnLeave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6 py-8">
      {/* Main centered container */}
      <div className="w-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 space-y-1">
          <h1 className="text-4xl font-bold text-white">Ready to connect?</h1>
          <p className="text-neutral-400 text-sm">Check your camera and microphone before joining</p>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Left Side - Video Preview */}
          <div className="space-y-4 h-full flex flex-col">
            {/* Video preview container - rounded */}
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <div className="aspect-video w-full bg-black relative">
                {videoOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <IconUser className="h-16 w-16 text-white/70" />
                  </div>
                )}
                
                {/* Status indicators */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                    <span>{name || "You"}</span>
                  </div>
                  {!audioOn && (
                    <span className="inline-flex items-center gap-1 rounded bg-red-600/80 px-1.5 py-0.5 text-xs text-white">
                      <IconMicrophoneOff className="h-3 w-3" />
                      <span>muted</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Control buttons below video */}
            <div className="flex items-center justify-center gap-2">
              <Tooltip content={audioOn ? "Turn off microphone" : "Turn on microphone"} position="bottom">
                <button
                  onClick={() => setAudioOn((a) => !a)}
                  className={`cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition ${
                    audioOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {audioOn ? <IconMicrophone className="h-5 w-5 text-white" /> : <IconMicrophoneOff className="h-5 w-5 text-white" />}
                </button>
              </Tooltip>

              <Tooltip content={videoOn ? "Turn off camera" : "Turn on camera"} position="bottom">
                <button
                  onClick={() => setVideoOn((v) => !v)}
                  className={`cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition ${
                    videoOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {videoOn ? <IconVideo className="h-5 w-5 text-white" /> : <IconVideoOff className="h-5 w-5 text-white" />}
                </button>
              </Tooltip>

              <Tooltip content="Refresh devices" position="bottom">
                <button
                  onClick={getCam}
                  className="cursor-pointer h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                >
                  <IconRefresh className="h-5 w-5 text-white" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Right Side - Join Form */}
          <div className="space-y-6">
            <div className="p-8 rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <h2 className="text-2xl font-semibold text-white">Join the conversation</h2>
                  
                  <div className="flex flex-col gap-1">
                    <label className="block text-sm font-medium text-gray-300">
                      What should we call you?
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full h-12 px-4 rounded-xl border border-white/10 bg-neutral-800/50 text-white placeholder-neutral-500 focus:border-white/30 focus:outline-none transition-colors backdrop-blur"
                    />
                    </div>
                    <button
                      onClick={() => setJoined(true)}
                      disabled={!name.trim()}
                      className="cursor-pointer w-full h-12 bg-white text-black rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 disabled:hover:bg-white"
                    >
                      Join Meeting
                    </button>

                  <p className="text-xs text-neutral-500 text-center">
                    By joining, you agree to our terms of service and privacy policy
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
