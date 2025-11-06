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

  useEffect(() => {
    async function prepareDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();

        const videos = devices.filter((d) => d.kind === "videoinput");
        const audios = devices.filter((d) => d.kind === "audioinput");

        setVideoDevices(videos);
        setAudioDevices(audios);

        if (videos.length > 0) setSelectedVideoDeviceId(videos[0].deviceId);
        if (audios.length > 0) setSelectedAudioDeviceId(audios[0].deviceId);
      } catch (err) {
        setError("Please allow camera and microphone permissions to continue.");
      }
    }
    prepareDevices();
  }, []);

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
        } catch {
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

  useEffect(() => {
    if (!selectedAudioDeviceId) return;

    async function setupMicLevel() {
      try {
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
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

          analyserRef.current.getByteFrequencyData(dataArray);

          let values = 0;
          for (let i = 0; i < dataArray.length; i++) {
            values += dataArray[i];
          }
          const average = values / dataArray.length;
          setMicLevel(average / 255);

          animationIdRef.current = requestAnimationFrame(updateMicLevel);
        }

        updateMicLevel();
      } catch {
        setError("Could not access selected microphone.");
      }
    }
    setupMicLevel();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
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
    const roomId = "testroom";
    router.push(`/room/${roomId}?${query.toString()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-black text-white">
      <div className="w-full max-w-3xl bg-black rounded-2xl border border-white/20 shadow-xl p-8">
        <h1 className="text-3xl font-semibold mb-6 text-center">Device Check</h1>

        {error && <p className="mb-4 text-red-500">{error}</p>}

        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
          {/* Video Preview & Device Select */}
          <div className="flex flex-col items-center w-full md:w-1/2">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="w-full rounded-lg border-2 border-white/30 bg-black aspect-video"
            />
            <label className="mt-3 mb-1 font-medium">Select Camera:</label>
            <select
              className="w-full p-3 border-2 border-white/30 bg-black text-white rounded-md focus:outline-none focus:border-white focus:ring-2 focus:ring-white/80 transition"
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
              className="w-full p-3 border-2 border-white/30 bg-black text-white rounded-md focus:outline-none focus:border-white focus:ring-2 focus:ring-white/80 transition mb-4"
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
            <div className="w-full h-6 bg-white/20 rounded-md overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-100 ease-out"
                style={{ width: `${Math.min(micLevel * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleJoinRoom}
          className="mt-8 w-full py-3 font-semibold border-2 border-white transition-colors hover:bg-white hover:text-black hover:border-white cursor-pointer rounded-md disabled:opacity-50"
          disabled={!selectedVideoDeviceId || !selectedAudioDeviceId}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}

