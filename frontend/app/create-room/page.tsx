"use client";

import ThemeToggle from "@/components/theme-toggle";

export default function CreateRoomPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Create Room</h1>
        <p className="text-muted-foreground">Room creation page coming soon...</p>
      </div>
    </div>
  );
}