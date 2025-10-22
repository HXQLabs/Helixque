"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RoomPage({ params }: any) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof params?.then === "function") {
      params.then((resolved: any) => setRoomId(resolved.roomId));
    } else {
      setRoomId(params?.roomId);
    }
  }, [params]);

  useEffect(() => {
    if (!roomId) return;
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("username") || "";
    const videoDeviceId = urlParams.get("videoDeviceId") || "";
    const audioDeviceId = urlParams.get("audioDeviceId") || "";

    const query = new URLSearchParams();
    query.set("roomId", roomId);
    if (username) query.set("username", username);
    if (videoDeviceId) query.set("videoDeviceId", videoDeviceId);
    if (audioDeviceId) query.set("audioDeviceId", audioDeviceId);

    router.push(`/match?${query.toString()}`);
  }, [roomId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-black text-white">
      <div className="w-full max-w-md bg-black rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-3xl font-semibold mb-6">Joining room...</h1>
        <p className="text-white/70">Redirecting to device setup...</p>
      </div>
    </div>
  );
}



