export interface MediaState {
  micOn: boolean;
  camOn: boolean;
  screenShareOn: boolean;
}

export interface PeerMediaState {
  peerMicOn: boolean;
  peerCamOn: boolean;
  peerScreenShareOn: boolean;
}

export interface RoomState {
  roomId: string | null;
  mySocketId: string | null;
  lobby: boolean;
  status: string;
  showChat: boolean;
}

export interface MediaTracks {
  localVideoTrack: MediaStreamTrack | null;
  localAudioTrack: MediaStreamTrack | null;
  currentVideoTrack: MediaStreamTrack | null;
  currentScreenShareTrack: MediaStreamTrack | null;
}

export interface VideoRefs {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  localScreenShareRef: React.RefObject<HTMLVideoElement | null>;
  remoteScreenShareRef: React.RefObject<HTMLVideoElement | null>;
}

export interface ConnectionRefs {
  socketRef: React.RefObject<any>;
  sendingPcRef: React.RefObject<RTCPeerConnection | null>;
  receivingPcRef: React.RefObject<RTCPeerConnection | null>;
  videoSenderRef: React.RefObject<RTCRtpSender | null>;
  remoteStreamRef: React.RefObject<MediaStream | null>;
  localScreenShareStreamRef: React.RefObject<MediaStream | null>;
  joinedRef: React.RefObject<boolean>;
}

export interface RoomProps {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
}