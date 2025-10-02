"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconVideo, IconMessage2, IconArrowRight } from "@tabler/icons-react";

export default function Home() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'video' | 'chat' | null>(null);

  const handleModeSelect = (mode: 'video' | 'chat') => {
    if (mode === 'video') {
      router.push('/match');
    } else {
      router.push('/professional-chat');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Ready to connect?</h1>
          <p className="text-neutral-400 text-lg">
            Choose your preferred way to connect with professionals worldwide
          </p>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          
          {/* Video Chat Mode */}
          <div className="space-y-6">
            <div 
              className="p-8 rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-200 hover:border-white/20 group"
              onClick={() => handleModeSelect('video')}
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-full bg-white/10">
                    <IconVideo className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Video Chat</h2>
                </div>
                
                <p className="text-neutral-400 text-lg leading-relaxed">
                  Connect face-to-face with professionals through high-quality video calls. 
                  Check your camera and microphone, then join meetings for meaningful conversations.
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">
                    Camera & microphone required
                  </span>
                  <div className="flex items-center text-white group-hover:text-blue-400 transition-colors">
                    <span className="font-medium">Start Video</span>
                    <IconArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Chat Mode */}
          <div className="space-y-6">
            <div 
              className="p-8 rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-200 hover:border-white/20 group"
              onClick={() => handleModeSelect('chat')}
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-full bg-white/10">
                    <IconMessage2 className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Professional Chat</h2>
                </div>
                
                <p className="text-neutral-400 text-lg leading-relaxed">
                  Connect through text-based conversations with professionals worldwide.
                  Perfect for networking in quiet environments or when video isn't available.
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">
                    Text-only, no camera needed
                  </span>
                  <div className="flex items-center text-white group-hover:text-green-400 transition-colors">
                    <span className="font-medium">Start Chat</span>
                    <IconArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
