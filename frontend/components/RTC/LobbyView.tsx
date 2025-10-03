import React from "react";
import { IconLoader2, IconRefresh } from "@tabler/icons-react";

interface LobbyViewProps {
  status: string;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  camOn: boolean;
  onRefresh?: () => void;
}

export default function LobbyView({ 
  status, 
  localVideoRef, 
  camOn, 
  onRefresh 
}: LobbyViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Preview Video */}
        <div className="relative w-64 h-48 mx-auto rounded-xl overflow-hidden border border-white/20 bg-gray-800">
          {camOn ? (
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              playsInline
              autoPlay
              muted
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">👤</span>
                </div>
                <p className="text-sm text-gray-400">Camera is off</p>
              </div>
            </div>
          )}
        </div>

        {/* Status and Loading */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <IconLoader2 className="h-6 w-6 animate-spin text-blue-400" />
            <h1 className="text-xl font-semibold">{status}</h1>
          </div>
          
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        {/* Tips or Instructions */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-medium mb-2 text-blue-400">While you wait:</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Check your camera and microphone</li>
            <li>• Ensure good lighting</li>
            <li>• Test your internet connection</li>
          </ul>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <IconRefresh className="h-4 w-4" />
            <span className="text-sm">Refresh Connection</span>
          </button>
        )}
      </div>
    </div>
  );
}