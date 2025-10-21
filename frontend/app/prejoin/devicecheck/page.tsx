"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function DeviceCheckPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const username = searchParams.get("username") || "";

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);

  // Request permissions then enumerate devices
  useEffect(() => {
    async function prepareDevices() {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Now enumerate devices with labels
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log("Devices found:", devices);

        const videos = devices.filter((d) => d.kind === "videoinput");
        const audios = devices.filter((d) => d.kind === "audioinput");

        setVideoDevices(videos);
        setAudioDevices(audios);

        if (videos.length > 0) {
          setSelectedVideoDeviceId(videos[0].deviceId);
          console.log("Selected video device:", videos[0].label);
        }
        if (audios.length > 0) {
          setSelectedAudioDeviceId(audios[0].deviceId);
          console.log("Selected audio device:", audios[0].label);
        }
      } catch (err) {
        console.error("Permission denied or media device error:", err);
        setError("Please allow camera and microphone permissions to continue.");
      }
    }

    prepareDevices();
  }, []);

  // Setup video preview
  useEffect(() => {
    if (!selectedVideoDeviceId) return;

    async function setupVideo() {
      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
video: selectedVideoDeviceId ? { deviceId: selectedVideoDeviceId } : undefined,
            audio: false,
          });
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          console.log("Video stream set up with device:", selectedVideoDeviceId);
        } catch (e) {
          console.error("Error accessing video device:", e);
          setError("Could not access selected camera.");
        }
      }
    }

    setupVideo();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [selectedVideoDeviceId]);

  // Setup mic level meter
  useEffect(() => {
    if (!selectedAudioDeviceId) return;

    async function setupMicLevel() {
      try {
        // Cleanup old audio
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        if (microphoneStreamRef.current) {
          microphoneStreamRef.current.getTracks().forEach((t) => t.stop());
          microphoneStreamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
audio: selectedAudioDeviceId ? { deviceId: selectedAudioDeviceId } : undefined,

        });
        microphoneStreamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        function updateMicLevel() {
          if (!analyserRef.current || !dataArrayRef.current) return;

          let bufferToUse = new Uint8Array(dataArrayRef.current.byteLength);
          analyserRef.current.getByteFrequencyData(bufferToUse);

          let values = 0;
          for (let i = 0; i < bufferToUse.length; i++) {
            values += bufferToUse[i];
          }
          const average = values / bufferToUse.length;
          setMicLevel(average / 255);

          animationIdRef.current = requestAnimationFrame(updateMicLevel);
        }

        updateMicLevel();
        console.log("Mic level meter set up with device:", selectedAudioDeviceId);
      } catch (e) {
        console.error("Error accessing microphone device:", e);
        setError("Could not access selected microphone.");
      }
    }

    setupMicLevel();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach((t) => t.stop());
        microphoneStreamRef.current = null;
      }
    };
  }, [selectedAudioDeviceId]);

const handleJoinRoom = () => {
  if (!username) {
    setError("Missing username, please go back and enter your username.");
    return;
  }
  const query = new URLSearchParams();
  query.set("username", username);
  if (selectedVideoDeviceId) query.set("videoDeviceId", selectedVideoDeviceId);
  if (selectedAudioDeviceId) query.set("audioDeviceId", selectedAudioDeviceId);
  const roomId = "testroom"; // or generate programmatically!
  router.push(`/room/${roomId}?${query.toString()}`);
};


  return (
<div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background text-foreground">
  <div className="w-full max-w-3xl bg-card text-card-foreground rounded-2xl border border-border shadow-xl p-8">
    <h1 className="text-3xl font-semibold mb-4">Device Check</h1>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
        {/* Video Preview & Device Select */}
        <div className="flex flex-col items-center w-full md:w-1/2">
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="w-full rounded-lg border border-gray-300 bg-black aspect-video"
          />
          <label className="mt-3 mb-1 font-medium">Select Camera:</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedVideoDeviceId ?? ""}
            onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
          >
            {videoDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId}`}
              </option>
            ))}
          </select>
        </div>

        {/* Audio Check & Device Select */}
        <div className="flex flex-col items-center w-full md:w-1/2">
          <label className="mb-1 font-medium">Select Microphone:</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md mb-4"
            value={selectedAudioDeviceId ?? ""}
            onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
          >
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId}`}
              </option>
            ))}
          </select>

          <label className="mb-1 font-medium">Mic Level:</label>
          <div className="w-full h-6 bg-gray-300 rounded-md overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-100 ease-out"
              style={{ width: `${Math.min(micLevel * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleJoinRoom}
        className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
      >
        Join Room
      </button>
    </div>
    </div>
  );
}

