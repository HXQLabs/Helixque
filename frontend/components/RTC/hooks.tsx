"use client";

import { useState } from "react";


// ===== CUSTOM HOOKS =====
export function useMediaState(audioOn?: boolean, videoOn?: boolean) {
  const [micOn, setMicOn] = useState<boolean>(typeof audioOn === "boolean" ? audioOn : true);
  const [camOn, setCamOn] = useState<boolean>(typeof videoOn === "boolean" ? videoOn : true);
  const [screenShareOn, setScreenShareOn] = useState(false);

  return {
    micOn, setMicOn,
    camOn, setCamOn,
    screenShareOn, setScreenShareOn
  };
}

export function usePeerState() {
  const [peerMicOn, setPeerMicOn] = useState(true);
  const [peerCamOn, setPeerCamOn] = useState(true);
  const [peerScreenShareOn, setPeerScreenShareOn] = useState(false);

  return {
    peerMicOn, setPeerMicOn,
    peerCamOn, setPeerCamOn,
    peerScreenShareOn, setPeerScreenShareOn
  };
}

export { useReloadConfirmation } from "./hooks/useReloadConfirmation";

export function useRoomState() {
  const [showChat, setShowChat] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [lobby, setLobby] = useState(true);
  const [status, setStatus] = useState<string>("Waiting to connect you to someone…");
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState("");

  return {
    showChat, setShowChat,
    roomId, setRoomId,
    mySocketId, setMySocketId,
    lobby, setLobby,
    status, setStatus,
    showTimeoutAlert, setShowTimeoutAlert,
    timeoutMessage, setTimeoutMessage
  };
}