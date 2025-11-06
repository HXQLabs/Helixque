"use client";

import { useSearchParams } from "next/navigation";
import DeviceCheck from "@/components/RTC/DeviceCheck";

export default function MatchPage() {
  const searchParams = useSearchParams();

  const roomId = searchParams.get("roomId") || "";
  const username = searchParams.get("username") || "";
  const videoDeviceId = searchParams.get("videoDeviceId") || "";
  const audioDeviceId = searchParams.get("audioDeviceId") || "";

  return (
    <DeviceCheck
      roomId={roomId}
      username={username}
      videoDeviceId={videoDeviceId}
      audioDeviceId={audioDeviceId}
    />
  );
}
