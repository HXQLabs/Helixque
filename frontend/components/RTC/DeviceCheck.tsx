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
import { ThemeToggle } from "../theme-toggle";

export default function DeviceCheck() {
  const [name, setName] = useState("");
  const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [joined, setJoined] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  const getCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoOn,
        audio: audioOn,
      });
      const audioTrack = stream.getAudioTracks()[0] || null;
      const videoTrack = stream.getVideoTracks()[0] || null;
      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      if (videoRef.current) {
        videoRef.current.srcObject = videoTrack ? new MediaStream([videoTrack]) : null;
        if (videoTrack) await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      const errorMessage = e?.message || "Could not access camera/microphone";
      toast.error("Device Access Error", {
        description: errorMessage
      });
    }
  };

  useEffect(() => {
    getCam();
    // cleanup: stop tracks on unmount
    return () => {
      [localAudioTrack, localVideoTrack].forEach((t) => t?.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoOn, audioOn]);

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
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-8">
      {/* Main centered container */}
      <div className="w-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 space-y-1 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Ready to connect?</h1>
          <p className="text-muted-foreground text-sm">Check your camera and microphone before joining</p>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Left Side - Video Preview */}
          <div className="space-y-4 h-full flex flex-col">
            {/* Video preview container - rounded */}
            <div className="relative flex-1 overflow-hidden rounded-2xl border-card bg-card">
              <div className="aspect-video w-full bg-background relative">
                {videoOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-background">
                    <IconUser className="h-16 w-16 text-foreground/70" />
                  </div>
                )}
                
                {/* Status indicators */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="rounded-md name-tag px-2 py-1 text-xs shadow-sm">
                    <span>{name || "You"}</span>
                  </div>
                  {!audioOn && (
                    <span className="inline-flex items-center gap-1 rounded bg-red-600/80 px-1.5 py-0.5 text-xs text-primary-foreground">
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
                  className={`control-button cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                    audioOn ? "bg-muted hover:bg-muted/80" : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {audioOn ? <IconMicrophone className="h-5 w-5" /> : <IconMicrophoneOff className="h-5 w-5" />}
                </button>
              </Tooltip>

              <Tooltip content={videoOn ? "Turn off camera" : "Turn on camera"} position="bottom">
                <button
                  onClick={() => setVideoOn((v) => !v)}
                  className={`control-button cursor-pointer h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                    videoOn ? "bg-muted hover:bg-muted/80" : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {videoOn ? <IconVideo className="h-5 w-5" /> : <IconVideoOff className="h-5 w-5" />}
                </button>
              </Tooltip>

              <Tooltip content="Refresh devices" position="bottom">
                <button
                  onClick={getCam}
                  className="control-button cursor-pointer h-11 w-11 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <IconRefresh className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Right Side - Join Form */}
          <div className="space-y-6">
            <div className="p-8 rounded-2xl border-card bg-card/50 backdrop-blur">
              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <h2 className="text-2xl font-semibold text-card-foreground">Join the conversation</h2>
                  
                  <div className="flex flex-col gap-1">
                    <label className="block text-sm font-medium text-muted-foreground">
                      What should we call you?
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full h-12 px-4 rounded-xl input-border-match bg-background text-foreground placeholder-muted-foreground focus:outline-none transition-colors"
                    />
                    </div>
                    <button
                      onClick={() => setJoined(true)}
                      disabled={!name.trim()}
                      className="cursor-pointer w-full h-12 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                    >
                      Join Meeting
                    </button>

                  <p className="text-xs text-muted-foreground text-center">
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
